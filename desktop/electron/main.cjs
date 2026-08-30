const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const HID = require('node-hid');

// NFC-X hardware layer copied from the known-working v1.1 checkpoint.
// Keep the proven HID transaction and persistent listener behavior intact.

const TARGET_VENDOR_ID = 0x0483;
const TARGET_PRODUCT_ID = 0x4343;
const TARGET_INTERFACE = 1;
const HID_REPORT_SIZE = 64;

const PREPARE_READER_REPORT = Buffer.from([
  0x55, 0x00, 0x51, 0x00, 0x01, 0x01, 0xfe, 0x01,
  ...Array(56).fill(0x00),
]);

const READ_CARD_REPORT = Buffer.from([
  0x55, 0x00, 0x83, 0x00, 0x12, 0x04, 0x01,
  0xff, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0xff,
  0x78, 0x56, 0x34, 0x12,
  0xf2, 0x0d,
  ...Array(39).fill(0x00),
]);

const STOP_READER_REPORT = Buffer.from([
  0x55, 0x00, 0x51, 0x00, 0x01, 0x00, 0xff, 0x00,
  ...Array(56).fill(0x00),
]);

const CAPTURED_UID_OFFSET = 47;
const CAPTURED_UID_LENGTH = 7;

let mainWindow = null;
let device = null;
let currentInfo = null;
let readInProgress = false;
let inputQueue = [];
let waiters = [];
let lastHidError = null;

// Continuous scanning state. v0.7's working HID protocol path is kept intact;
// continuous mode simply repeats the proven one-shot transaction.
let continuousScanning = false;
let continuousLoopPromise = null;
let continuousScanCount = 0;
let lastContinuousUid = null;

function hex4(value) {
  return `0x${Number(value).toString(16).toUpperCase().padStart(4, '0')}`;
}

function toHex(buffer) {
  return Buffer.from(buffer || [])
    .toString('hex')
    .toUpperCase()
    .match(/.{1,2}/g)
    ?.join(' ') || '';
}

function normalizeInputReport(data) {
  const input = Buffer.from(data || []);
  if (input.length === HID_REPORT_SIZE + 1 && input[0] === 0x00) {
    return input.subarray(1);
  }
  return input;
}

function isCommandResponse(report, commandByte) {
  return report.length >= 3 &&
    report[0] === 0x55 &&
    report[1] === 0x00 &&
    report[2] === commandByte;
}

function sanitizeDeviceInfo(info) {
  if (!info) return null;
  return {
    vendorId: info.vendorId,
    productId: info.productId,
    path: info.path || '',
    serialNumber: info.serialNumber || '',
    manufacturer: info.manufacturer || '',
    product: info.product || '',
    release: info.release ?? null,
    interface: info.interface ?? null,
    usagePage: info.usagePage ?? null,
    usage: info.usage ?? null,
  };
}

function status(payload) {
  return {
    vendorId: TARGET_VENDOR_ID,
    productId: TARGET_PRODUCT_ID,
    vendorHex: hex4(TARGET_VENDOR_ID),
    productHex: hex4(TARGET_PRODUCT_ID),
    timestamp: new Date().toISOString(),
    ...payload,
  };
}

function emitStatus(payload) {
  const result = status(payload);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('nfc:status', result);
  }
  return result;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearInputState(error) {
  inputQueue = [];
  const pending = waiters;
  waiters = [];
  for (const waiter of pending) {
    clearTimeout(waiter.timer);
    waiter.reject(error || new Error('HID input queue was reset.'));
  }
}

function dispatchInput(report) {
  // Satisfy the earliest waiter whose predicate matches this report.
  const index = waiters.findIndex(w => {
    try { return w.predicate(report); } catch (_) { return false; }
  });

  if (index >= 0) {
    const [waiter] = waiters.splice(index, 1);
    clearTimeout(waiter.timer);
    waiter.resolve(report);
    return;
  }

  // Keep a small diagnostic backlog in case the response arrived before the
  // protocol code installed its waiter.
  inputQueue.push(report);
  if (inputQueue.length > 20) inputQueue.shift();
}

function waitForReport(predicate, timeoutMs, label) {
  // First consume any already-arrived matching report.
  const queuedIndex = inputQueue.findIndex(r => {
    try { return predicate(r); } catch (_) { return false; }
  });
  if (queuedIndex >= 0) {
    const [report] = inputQueue.splice(queuedIndex, 1);
    return Promise.resolve(report);
  }

  return new Promise((resolve, reject) => {
    const waiter = {
      predicate,
      resolve,
      reject,
      timer: null,
    };

    waiter.timer = setTimeout(() => {
      const idx = waiters.indexOf(waiter);
      if (idx >= 0) waiters.splice(idx, 1);
      reject(new Error(`${label} timed out after ${timeoutMs} ms.`));
    }, timeoutMs);

    waiters.push(waiter);
  });
}

async function closeDevice() {
  const oldDevice = device;
  device = null;
  currentInfo = null;
  clearInputState(new Error('Reader handle closed.'));

  if (!oldDevice) return;
  try {
    await oldDevice.close();
  } catch (_) {}
}

async function findReader() {
  const candidates = await HID.devicesAsync(TARGET_VENDOR_ID, TARGET_PRODUCT_ID);
  return candidates.find(
    d => d.path && (d.interface === TARGET_INTERFACE || /mi_01/i.test(d.path))
  ) || null;
}

async function connectReader() {
  const started = Date.now();

  if (continuousScanning) {
    await stopContinuousScanning();
  }

  await closeDevice();
  lastHidError = null;

  const enumStarted = Date.now();
  let info;
  try {
    info = await findReader();
  } catch (error) {
    return emitStatus({
      state: 'error',
      message: 'USB/HID enumeration failed.',
      detail: error?.message || String(error),
      device: null,
    });
  }
  const enumMs = Date.now() - enumStarted;

  if (!info) {
    return emitStatus({
      state: 'not-found',
      message: 'NFC-X reader not found.',
      detail: `Targeted HID scan finished in ${enumMs} ms. Expected MI_01 / interface 1.`,
      device: null,
    });
  }

  const openStarted = Date.now();
  try {
    const opened = await HID.HIDAsync.open(info.path);
    const openMs = Date.now() - openStarted;

    device = opened;
    currentInfo = info;
    inputQueue = [];
    waiters = [];

    // IMPORTANT: one permanent input listener for the life of the HID handle.
    // Do not repeatedly add/remove data listeners for individual commands.
    opened.on('data', data => {
      if (device !== opened) return;
      dispatchInput(normalizeInputReport(data));
    });

    // During diagnostics, keep the exact HID error instead of immediately
    // declaring a physical disconnect and destroying our state.
    opened.on('error', error => {
      if (device !== opened) return;
      lastHidError = {
        timestamp: new Date().toISOString(),
        message: error?.message || String(error),
      };
      console.error('[NFC-X HID error]', lastHidError.message);
    });

    return emitStatus({
      state: 'connected',
      message: 'NFC-X reader connected.',
      detail: `Enumeration ${enumMs} ms • Open ${openMs} ms • Total ${Date.now() - started} ms`,
      device: sanitizeDeviceInfo(info),
    });
  } catch (error) {
    return emitStatus({
      state: 'busy',
      message: 'NFC-X reader was found, but could not be opened.',
      detail: `Enumeration ${enumMs} ms. Open failed: ${error?.message || String(error)}`,
      device: sanitizeDeviceInfo(info),
    });
  }
}

function connectedStatus() {
  return status({
    state: 'connected',
    message: 'NFC-X reader connected.',
    detail: 'Permanent HID input listener is active.',
    device: sanitizeDeviceInfo(currentInfo),
  });
}

async function sendReport(report, phase, trace, startedAt) {
  if (!device) throw new Error(`${phase}: reader is not connected.`);
  try {
    const written = await device.write([0x00, ...report]);
    trace.push({
      phase: `${phase} WRITE OK`,
      ms: Date.now() - startedAt,
      hex: `node-hid reported ${written} bytes written`,
    });
    return written;
  } catch (error) {
    trace.push({
      phase: `${phase} WRITE ERROR`,
      ms: Date.now() - startedAt,
      hex: error?.message || String(error),
    });
    throw new Error(`${phase} write failed: ${error?.message || String(error)}`);
  }
}

function recordIncoming(trace, startedAt, phase, report) {
  trace.push({
    phase,
    ms: Date.now() - startedAt,
    hex: toHex(report),
  });
}

function extractCapturedUid(report) {
  if (!isCommandResponse(report, 0x83)) return null;
  if (report.length < CAPTURED_UID_OFFSET + CAPTURED_UID_LENGTH) return null;

  const uidBytes = report.subarray(
    CAPTURED_UID_OFFSET,
    CAPTURED_UID_OFFSET + CAPTURED_UID_LENGTH
  );

  if (uidBytes.every(b => b === 0x00) || uidBytes.every(b => b === 0xff)) {
    return null;
  }

  return uidBytes.toString('hex').toUpperCase();
}

function traceText(trace) {
  return trace.map(x => `+${x.ms} ms  ${x.phase}\n${x.hex}`).join('\n\n');
}

function emitContinuousState(payload) {
  const result = {
    active: continuousScanning,
    scanCount: continuousScanCount,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('nfc:continuous-state', result);
  }

  return result;
}

function emitScanResult(result) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('nfc:scan-result', result);
  }
}

function isNoCardTimeout(result) {
  return result?.state === 'error' &&
    /0x83 card response timed out/i.test(result?.detail || '');
}

async function continuousScanLoop() {
  while (continuousScanning) {
    // Reuse v0.7's known-good one-shot transaction exactly as-is.
    const result = await readOneCard();

    if (!continuousScanning) break;

    if (result?.state === 'success' && result.uid) {
      // Suppress duplicate UI entries while the same card remains on the reader.
      // A no-card cycle clears lastContinuousUid, allowing the same physical card
      // to be scanned again after it has been removed and presented later.
      const duplicateHeldCard = result.uid === lastContinuousUid;

      if (!duplicateHeldCard) {
        continuousScanCount += 1;
        lastContinuousUid = result.uid;

        emitScanResult({
          ...result,
          mode: 'continuous',
          scanNumber: continuousScanCount,
        });

        emitContinuousState({
          message: 'Card read. Ready for the next card.',
          lastUid: result.uid,
        });
      }

      // Give the user time to lift the card before the next transaction.
      await delay(450);
      continue;
    }

    if (result?.state === 'no-uid' || isNoCardTimeout(result)) {
      // No card was observed during this cycle, so a previously held card has
      // effectively been removed. The same UID can now be accepted again.
      lastContinuousUid = null;
      await delay(80);
      continue;
    }

    // Unexpected HID/protocol failure: report it, but do not destroy the reader
    // handle. Keep retrying unless the user presses Stop.
    emitContinuousState({
      message: 'Scan cycle failed; retrying.',
      error: result?.detail || result?.message || 'Unknown scan error.',
    });

    await delay(300);
  }
}

async function startContinuousScanning() {
  if (continuousScanning) {
    return emitContinuousState({
      message: 'Continuous scanning is already active.',
    });
  }

  if (!device || !currentInfo) {
    return emitContinuousState({
      active: false,
      state: 'not-connected',
      message: 'Connect the NFC-X reader first.',
    });
  }

  if (readInProgress) {
    return emitContinuousState({
      active: false,
      state: 'busy',
      message: 'Wait for the current one-shot read to finish.',
    });
  }

  continuousScanning = true;
  continuousScanCount = 0;
  lastContinuousUid = null;

  emitContinuousState({
    active: true,
    state: 'scanning',
    message: 'Continuous scanning active. Tap an NFC card.',
  });

  continuousLoopPromise = continuousScanLoop()
    .catch(error => {
      if (continuousScanning) {
        emitContinuousState({
          active: true,
          state: 'error',
          message: 'Continuous scan loop encountered an error.',
          error: error?.message || String(error),
        });
      }
    })
    .finally(() => {
      continuousLoopPromise = null;
    });

  return {
    active: true,
    state: 'scanning',
    message: 'Continuous scanning active. Tap an NFC card.',
    scanCount: continuousScanCount,
    timestamp: new Date().toISOString(),
  };
}

async function stopContinuousScanning() {
  if (!continuousScanning) {
    return emitContinuousState({
      active: false,
      state: 'stopped',
      message: 'Continuous scanning is already stopped.',
    });
  }

  continuousScanning = false;
  lastContinuousUid = null;

  // Cancel any pending report waiter so Stop reacts immediately instead of
  // waiting for the current 0x83 timeout.
  clearInputState(new Error('Continuous scanning stopped by user.'));

  // Best-effort reader cleanup. This is the same OFF report used by v0.7.
  try {
    if (device) {
      await device.write([0x00, ...STOP_READER_REPORT]);
    }
  } catch (_) {}

  return emitContinuousState({
    active: false,
    state: 'stopped',
    message: 'Continuous scanning stopped.',
  });
}

async function readOneCard() {
  if (readInProgress) {
    return status({ state: 'busy', message: 'A card read is already in progress.' });
  }
  if (!device || !currentInfo) {
    return status({ state: 'not-connected', message: 'Connect the NFC-X reader first.' });
  }

  readInProgress = true;
  inputQueue = [];
  lastHidError = null;
  const startedAt = Date.now();
  const trace = [];

  try {
    // 1) Prepare / reader ON.
    const prepareWait = waitForReport(
      r => isCommandResponse(r, 0x51),
      1500,
      '0x51 prepare acknowledgement'
    );

    await sendReport(PREPARE_READER_REPORT, '0x51 ON', trace, startedAt);
    const prepareResponse = await prepareWait;
    recordIncoming(trace, startedAt, '0x51 ON REPLY', prepareResponse);

    await delay(6);

    // 2) Card read.
    const readWait = waitForReport(
      r => isCommandResponse(r, 0x83),
      5000,
      '0x83 card response'
    );

    await sendReport(READ_CARD_REPORT, '0x83 READ', trace, startedAt);
    const readResponse = await readWait;
    recordIncoming(trace, startedAt, '0x83 UID REPLY', readResponse);

    // 3) Drain one trailing packet if the reader sends it.
    try {
      const trailing = await waitForReport(() => true, 100, 'trailing IN report');
      recordIncoming(trace, startedAt, 'TRAILING IN', trailing);
    } catch (_) {
      trace.push({
        phase: 'TRAILING IN',
        ms: Date.now() - startedAt,
        hex: '(none within 100 ms)',
      });
    }

    await delay(12);

    // 4) Reader OFF / cleanup.
    const stopWait = waitForReport(
      r => isCommandResponse(r, 0x51),
      800,
      '0x51 stop acknowledgement'
    );
    await sendReport(STOP_READER_REPORT, '0x51 OFF', trace, startedAt);

    try {
      const stopResponse = await stopWait;
      recordIncoming(trace, startedAt, '0x51 OFF REPLY', stopResponse);
    } catch (error) {
      trace.push({
        phase: '0x51 OFF REPLY',
        ms: Date.now() - startedAt,
        hex: error?.message || String(error),
      });
    }

    if (lastHidError) {
      trace.push({
        phase: 'NODE-HID ERROR EVENT',
        ms: Date.now() - startedAt,
        hex: lastHidError.message,
      });
    }

    const uid = extractCapturedUid(readResponse);
    return status({
      state: uid ? 'success' : 'no-uid',
      message: uid
        ? 'Card UID read successfully.'
        : '0x83 reply received, but no UID was found at the captured position.',
      uid,
      rawReport: traceText(trace),
      trace,
      hidError: lastHidError,
    });
  } catch (error) {
    if (lastHidError) {
      trace.push({
        phase: 'NODE-HID ERROR EVENT',
        ms: Date.now() - startedAt,
        hex: lastHidError.message,
      });
    }

    // Best-effort cleanup, but do not hide the original failure.
    try {
      await delay(20);
      await device?.write([0x00, ...STOP_READER_REPORT]);
      trace.push({
        phase: 'BEST-EFFORT 0x51 OFF',
        ms: Date.now() - startedAt,
        hex: 'write completed',
      });
    } catch (cleanupError) {
      trace.push({
        phase: 'BEST-EFFORT 0x51 OFF ERROR',
        ms: Date.now() - startedAt,
        hex: cleanupError?.message || String(cleanupError),
      });
    }

    return status({
      state: 'error',
      message: 'One-shot NFC read failed.',
      detail: error?.message || String(error),
      rawReport: traceText(trace) || 'No transaction activity captured.',
      trace,
      hidError: lastHidError,
    });
  } finally {
    readInProgress = false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#F5F7FB',
    autoHideMenuBar: true,
    show: false,
    title: 'Attendly Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  if (process.argv.includes('--dist')) {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://127.0.0.1:5174');
  }
}

app.whenReady().then(() => {
  ipcMain.handle('nfc:get-status', async () => {
    if (device && currentInfo) return connectedStatus();
    return connectReader();
  });

  ipcMain.handle('nfc:reconnect', async () => connectReader());
  ipcMain.handle('nfc:read-one', async () => {
    if (continuousScanning) {
      return status({
        state: 'busy',
        message: 'Stop continuous scanning before using one-shot read.',
      });
    }
    return readOneCard();
  });
  ipcMain.handle('nfc:start-continuous', async () => startContinuousScanning());
  ipcMain.handle('nfc:stop-continuous', async () => stopContinuousScanning());

  createWindow();
});

app.on('before-quit', () => {
  continuousScanning = false;
  clearInputState(new Error('Application is closing.'));

  if (device) {
    try { device.close(); } catch (_) {}
  }
  device = null;
  currentInfo = null;
});

app.on('window-all-closed', () => app.quit());

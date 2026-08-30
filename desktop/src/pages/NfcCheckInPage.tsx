import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar from '../components/TopBar';
import { attendanceApi, todayString } from '../services/api';
import { nfcHardware } from '../services/nfc';
import type {
  ContinuousState,
  ReaderStatus,
  ScanResult,
  User,
} from '../types';

type TerminalState =
  | 'idle'
  | 'waiting'
  | 'processing'
  | 'success'
  | 'duplicate'
  | 'unknown'
  | 'error';

const copyByState: Record<
  TerminalState,
  { label: string; headline: string; detail: string }
> = {
  idle: {
    label: 'Ready',
    headline: 'Ready to begin',
    detail: 'Scanning only starts after you click Start Taking Attendance.',
  },
  waiting: {
    label: 'Live',
    headline: 'Taking attendance',
    detail: 'Waiting for an NFC card…',
  },
  processing: {
    label: 'Reading',
    headline: 'Checking student',
    detail: 'Matching the scanned UID against the school database.',
  },
  success: {
    label: 'Recorded',
    headline: 'Check-in recorded',
    detail: 'The student has been recorded as arrived.',
  },
  duplicate: {
    label: 'Already in',
    headline: 'Already checked in',
    detail: 'No duplicate check-in record was created.',
  },
  unknown: {
    label: 'Unknown',
    headline: 'Card not recognised',
    detail: 'This UID is not currently assigned to an active student.',
  },
  error: {
    label: 'Error',
    headline: 'Check-in failed',
    detail: 'The reader or attendance server could not finish this scan.',
  },
};

export default function NfcCheckInPage({
  user,
  onLogout,
  adminEmbedded = false,
}: {
  user: User;
  onLogout: () => void;
  adminEmbedded?: boolean;
}) {
  const [reader, setReader] = useState<ReaderStatus>({
    state: 'not-connected',
    message: 'Checking NFC-X reader…',
  });
  const [running, setRunning] = useState(false);
  const [terminalState, setTerminalState] =
    useState<TerminalState>('idle');
  const [latest, setLatest] = useState<ScanResult | null>(null);
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [continuousState, setContinuousState] =
    useState<ContinuousState>({ active: false });
  const [busy, setBusy] = useState(false);
  const pendingUids = useRef(new Set<string>());
  const mounted = useRef(true);
  const runningRef = useRef(false);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  const processUid = useCallback(async (uid: string) => {
    const normalized = uid.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (!normalized || pendingUids.current.has(normalized)) return;

    pendingUids.current.add(normalized);
    if (mounted.current) setTerminalState('processing');

    try {
      const result = await attendanceApi.nfcCheckIn(
        normalized,
        todayString(),
      );

      if (!mounted.current) return;

      const scan: ScanResult = {
        ...result,
        uid: normalized,
      };

      setLatest(scan);
      setScans((current) => [scan, ...current].slice(0, 30));
      setTerminalState(
        result.status === 'success'
          ? 'success'
          : result.status === 'duplicate'
            ? 'duplicate'
            : result.status === 'unknown'
              ? 'unknown'
              : 'error',
      );

      window.setTimeout(() => {
        if (mounted.current && runningRef.current) setTerminalState('waiting');
      }, 1400);
    } catch (error) {
      if (!mounted.current) return;
      const message =
        error instanceof Error ? error.message : 'Unknown server error';
      const scan: ScanResult = {
        uid: normalized,
        status: 'error',
        message,
        checkedInAt: new Date().toISOString(),
      };
      setLatest(scan);
      setScans((current) => [scan, ...current].slice(0, 30));
      setTerminalState('error');

      window.setTimeout(() => {
        if (mounted.current && runningRef.current) setTerminalState('waiting');
      }, 1800);
    } finally {
      pendingUids.current.delete(normalized);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    const offStatus = nfcHardware.onStatus(setReader);
    const offContinuous = nfcHardware.onContinuousState((state) => {
      setContinuousState(state);
      if (!state.active && runningRef.current) {
        setRunning(false);
        setTerminalState('idle');
      }
    });
    const offScan = nfcHardware.onScan((result) => {
      if (result.state === 'success' && result.uid) {
        void processUid(result.uid);
      }
    });

    nfcHardware
      .status()
      .then(setReader)
      .catch((error) =>
        setReader({
          state: 'error',
          message: 'Unable to access NFC reader.',
          detail: error instanceof Error ? error.message : String(error),
        }),
      );

    return () => {
      mounted.current = false;
      offStatus();
      offContinuous();
      offScan();
      void nfcHardware.stopContinuous().catch(() => undefined);
    };
  }, [processUid]);

  async function reconnect() {
    setBusy(true);
    try {
      setReader(await nfcHardware.reconnect());
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (running || busy) return;
    setBusy(true);

    try {
      let current = reader;
      if (current.state !== 'connected') {
        current = await nfcHardware.reconnect();
        setReader(current);
      }

      if (current.state !== 'connected') {
        setTerminalState('error');
        return;
      }

      const state = await nfcHardware.startContinuous();
      setContinuousState(state);

      if (state.active) {
        setRunning(true);
        setTerminalState('waiting');
      } else {
        setTerminalState('error');
      }
    } catch {
      setTerminalState('error');
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await nfcHardware.stopContinuous();
      setRunning(false);
      setTerminalState('idle');
    } finally {
      setBusy(false);
    }
  }

  const readerConnected = reader.state === 'connected';
  const copy = copyByState[terminalState];

  return (
    <div className={adminEmbedded ? 'embedded-page' : 'app-page'}>
      {!adminEmbedded && <TopBar user={user} onLogout={onLogout} />}

      <main
        className={
          adminEmbedded
            ? 'terminal-content embedded-terminal'
            : 'terminal-content'
        }
      >
        <div className="terminal-heading-row">
          <div>
            <div className="eyebrow">Gate attendance</div>
            <h1>NFC Check-In</h1>
            <p>{today}</p>
          </div>

          <div className="reader-actions">
            <div
              className={`reader-card ${
                readerConnected ? 'connected' : 'disconnected'
              }`}
            >
              <span className="reader-dot" />
              <div>
                <strong>
                  {readerConnected ? 'NFC-X connected' : 'Reader unavailable'}
                </strong>
                <small>
                  {reader.device?.product ||
                    reader.detail ||
                    'VID 0483 · PID 4343 · MI_01'}
                </small>
              </div>
            </div>

            {!running && (
              <button
                className="ghost-button"
                onClick={() => void reconnect()}
                disabled={busy}
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        <section className={`scan-stage state-${terminalState}`}>
          <div className="scan-orbit">
            <div className="scan-core" aria-hidden="true">
              {terminalState === 'success'
                ? '✓'
                : terminalState === 'duplicate'
                  ? '↺'
                  : terminalState === 'unknown' ||
                      terminalState === 'error'
                    ? '!'
                    : '⌁'}
            </div>
          </div>

          <span className={`status-chip ${terminalState}`}>{copy.label}</span>

          {latest &&
          ['success', 'duplicate', 'unknown', 'error'].includes(
            terminalState,
          ) ? (
            <>
              <h2>
                {latest.studentName || copy.headline}
              </h2>
              <p>
                {latest.studentId
                  ? `${latest.studentId}${
                      latest.className ? ` · ${latest.className}` : ''
                    }`
                  : latest.message}
              </p>
              {latest.uid && <code className="hero-uid">{latest.uid}</code>}
            </>
          ) : (
            <>
              <h2>{copy.headline}</h2>
              <p>
                {continuousState.error && running
                  ? continuousState.error
                  : copy.detail}
              </p>
            </>
          )}

          {!running ? (
            <button
              className="primary-button hero-button"
              onClick={() => void start()}
              disabled={busy}
            >
              {busy ? 'Starting reader…' : 'Start Taking Attendance'}
            </button>
          ) : (
            <button
              className="danger-outline-button hero-button"
              onClick={() => void stop()}
              disabled={busy}
            >
              Stop Taking Attendance
            </button>
          )}

          {!readerConnected && !running && (
            <small className="stage-helper">
              The scanner will not start until the NFC-X reader is connected.
            </small>
          )}
        </section>

        <section className="lower-grid terminal-lower-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h3>Current session</h3>
                <p>Recent scans from this terminal.</p>
              </div>
              <span className="count-badge">{scans.length}</span>
            </div>

            <div className="scan-list">
              {scans.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">⌁</div>
                  <strong>No scans yet</strong>
                  <span>
                    Start attendance, then tap a student card.
                  </span>
                </div>
              ) : (
                scans.map((scan, index) => (
                  <div
                    className="scan-row"
                    key={`${scan.uid}-${scan.checkedInAt}-${index}`}
                  >
                    <span
                      className={`scan-result-icon ${scan.status}`}
                      aria-hidden="true"
                    >
                      {scan.status === 'success'
                        ? '✓'
                        : scan.status === 'duplicate'
                          ? '↺'
                          : '!'}
                    </span>
                    <div className="scan-main">
                      <strong>
                        {scan.studentName || 'Unassigned card'}
                      </strong>
                      <span>
                        {scan.studentId
                          ? `${scan.studentId}${
                              scan.className
                                ? ` · ${scan.className}`
                                : ''
                            }`
                          : scan.uid}
                      </span>
                    </div>
                    <span className={`scan-tag ${scan.status}`}>
                      {scan.status === 'success'
                        ? 'Recorded'
                        : scan.status === 'duplicate'
                          ? 'Duplicate'
                          : scan.status === 'unknown'
                            ? 'Unknown'
                            : 'Error'}
                    </span>
                    <time>
                      {new Intl.DateTimeFormat('en-MY', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(scan.checkedInAt))}
                    </time>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="panel session-info-panel">
            <div className="panel-heading">
              <div>
                <h3>Terminal status</h3>
                <p>Live system information.</p>
              </div>
            </div>
            <div className="terminal-facts">
              <Fact
                label="Reader"
                value={readerConnected ? 'Connected' : 'Disconnected'}
                good={readerConnected}
              />
              <Fact
                label="Scanning"
                value={running ? 'Active' : 'Stopped'}
                good={running}
              />
              <Fact label="Database" value="Shared API" good />
              <Fact label="Operator" value={user.name} />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Fact({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="terminal-fact">
      <span>{label}</span>
      <strong className={good ? 'good' : ''}>{value}</strong>
    </div>
  );
}

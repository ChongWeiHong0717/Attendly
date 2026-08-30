const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('attendanceDesktop', {
  platform: process.platform,

  getReaderStatus: () => ipcRenderer.invoke('nfc:get-status'),
  reconnectReader: () => ipcRenderer.invoke('nfc:reconnect'),
  readOneCard: () => ipcRenderer.invoke('nfc:read-one'),
  startContinuousScan: () => ipcRenderer.invoke('nfc:start-continuous'),
  stopContinuousScan: () => ipcRenderer.invoke('nfc:stop-continuous'),

  onReaderStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('nfc:status', listener);
    return () => ipcRenderer.removeListener('nfc:status', listener);
  },

  onScanResult: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('nfc:scan-result', listener);
    return () => ipcRenderer.removeListener('nfc:scan-result', listener);
  },

  onContinuousState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('nfc:continuous-state', listener);
    return () =>
      ipcRenderer.removeListener('nfc:continuous-state', listener);
  },
});

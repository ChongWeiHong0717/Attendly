import type {
  ContinuousState,
  HardwareReadResult,
  ReaderStatus,
} from '../types';

function desktop() {
  if (!window.attendanceDesktop) {
    throw new Error(
      'NFC hardware access is only available inside the Electron desktop app.',
    );
  }
  return window.attendanceDesktop;
}

export const nfcHardware = {
  status: (): Promise<ReaderStatus> => desktop().getReaderStatus(),
  reconnect: (): Promise<ReaderStatus> => desktop().reconnectReader(),
  readOne: (): Promise<HardwareReadResult> => desktop().readOneCard(),
  startContinuous: (): Promise<ContinuousState> =>
    desktop().startContinuousScan(),
  stopContinuous: (): Promise<ContinuousState> =>
    desktop().stopContinuousScan(),
  onStatus: (callback: (status: ReaderStatus) => void) =>
    desktop().onReaderStatus(callback),
  onScan: (
    callback: (
      result: HardwareReadResult & { mode?: string; scanNumber?: number },
    ) => void,
  ) => desktop().onScanResult(callback),
  onContinuousState: (callback: (state: ContinuousState) => void) =>
    desktop().onContinuousState(callback),
};

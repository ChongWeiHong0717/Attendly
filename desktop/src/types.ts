export type UserRole = 'ADMIN' | 'TEACHER';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
};

export type AcademicYear = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
};

export type ClassRoom = {
  id: string;
  name: string;
  formLevel: number;
  isActive: boolean;
};

export type Student = {
  id: string;
  studentCode: string;
  fullName: string;
  icMasked: string | null;
  status: string;
  classRoom: ClassRoom | null;
  nfcUid: string | null;
};

export type AdminUser = User & {
  isActive: boolean;
  createdAt?: string;
};

export type ReaderDevice = {
  vendorId?: number;
  productId?: number;
  path?: string;
  serialNumber?: string;
  manufacturer?: string;
  product?: string;
  interface?: number | null;
  usagePage?: number | null;
};

export type ReaderStatus = {
  state: 'connected' | 'not-found' | 'busy' | 'error' | 'not-connected';
  message: string;
  detail?: string;
  timestamp?: string;
  vendorHex?: string;
  productHex?: string;
  device?: ReaderDevice | null;
};

export type HardwareReadResult = {
  state: 'success' | 'no-uid' | 'error' | 'busy' | 'not-connected';
  uid?: string;
  message: string;
  detail?: string;
  rawReport?: string;
  timestamp?: string;
};

export type ContinuousState = {
  active: boolean;
  state?: string;
  message?: string;
  error?: string;
  timestamp?: string;
  scanCount?: number;
  lastUid?: string;
};

export type ScanResult = {
  id?: string;
  uid: string;
  studentName?: string;
  studentId?: string;
  className?: string;
  status: 'success' | 'duplicate' | 'unknown' | 'error';
  message: string;
  checkedInAt: string;
};

export type NfcAssignmentResponse = {
  status: 'assigned' | 'already-assigned' | 'transferred';
  uid: string;
  student: {
    id: string;
    studentCode: string;
    fullName: string;
  };
  transferredFrom: {
    id: string;
    studentCode: string;
    fullName: string;
  } | null;
  replacedUid: string | null;
};

export type NfcTransferRequired = {
  code: 'NFC_TRANSFER_REQUIRED';
  message: string;
  uid: string;
  currentOwner: {
    id: string;
    studentCode: string;
    fullName: string;
  };
  target: {
    id: string;
    studentCode: string;
    fullName: string;
  };
  targetCurrentUid: string | null;
};

export type NfcCheckInSummary = {
  date: string;
  totalActiveStudents: number;
  assignedCardCount: number;
  checkedInCount: number;
  notCheckedInCount: number;
  records: Array<{
    id: string;
    uid: string;
    checkedInAt: string;
    academicYear: AcademicYear;
    student: {
      id: string;
      studentCode: string;
      fullName: string;
    };
    classRoom: ClassRoom | null;
    scannedBy: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

export type TeacherAssignments = {
  academicYear: AcademicYear;
  classes: ClassRoom[];
};

declare global {
  interface Window {
    attendanceDesktop: {
      getReaderStatus: () => Promise<ReaderStatus>;
      reconnectReader: () => Promise<ReaderStatus>;
      readOneCard: () => Promise<HardwareReadResult>;
      startContinuousScan: () => Promise<ContinuousState>;
      stopContinuousScan: () => Promise<ContinuousState>;
      onReaderStatus: (callback: (status: ReaderStatus) => void) => () => void;
      onScanResult: (callback: (result: HardwareReadResult & { mode?: string; scanNumber?: number }) => void) => () => void;
      onContinuousState: (callback: (state: ContinuousState) => void) => () => void;
      platform: string;
    };
  }
}

export {};

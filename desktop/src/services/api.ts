import type {
  AcademicYear,
  AdminUser,
  ClassRoom,
  NfcAssignmentResponse,
  NfcCheckInSummary,
  NfcTransferRequired,
  Student,
  TeacherAssignments,
  User,
} from '../types';

export const DEFAULT_API_URL =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');

const TOKEN_KEY = 'attendance_desktop_token';
const API_URL_KEY = 'attendance_desktop_api_url';

export function getApiUrl() {
  return (localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL).replace(/\/$/, '');
}

export function setApiUrl(value: string) {
  const normalized = value.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('API URL must begin with http:// or https://');
  }
  localStorage.setItem(API_URL_KEY, normalized);
}

export function resetApiUrl() {
  localStorage.removeItem(API_URL_KEY);
}

export const API_URL = DEFAULT_API_URL;

export class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, message: string, body: any = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('attendance:unauthorized'));
    }

    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || 'The server rejected this request.';
    throw new ApiError(response.status, message, body);
  }

  return body as T;
}

export function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const attendanceApi = {
  login: async (email: string, password: string) => {
    const result = await api<{ accessToken: string; user: User }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    setToken(result.accessToken);
    return result.user;
  },

  me: () => api<User>('/auth/me'),

  currentYear: () => api<AcademicYear>('/academic-years/current'),
  years: () => api<AcademicYear[]>('/academic-years'),
  rolloverYear: (name: string) =>
    api<AcademicYear>('/academic-years/rollover', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  classes: () => api<ClassRoom[]>('/classes'),
  myClasses: () =>
    api<{ academicYear: AcademicYear; classes: ClassRoom[] }>('/classes/mine'),
  createClass: (formLevel: number, name: string) =>
    api<ClassRoom>('/classes', {
      method: 'POST',
      body: JSON.stringify({ formLevel, name }),
    }),
  archiveClass: (id: string) =>
    api<ClassRoom>(`/classes/${id}`, { method: 'DELETE' }),

  students: (params?: { search?: string; classRoomId?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.classRoomId) query.set('classRoomId', params.classRoomId);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return api<Student[]>(`/students${suffix}`);
  },
  createStudent: (
    classRoomId: string,
    payload: { fullName: string; studentCode?: string; icNumber?: string },
  ) =>
    api<Student>(`/students/class/${classRoomId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  enrollStudent: (studentId: string, classRoomId: string) =>
    api(`/students/${studentId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ classRoomId }),
    }),
  archiveStudent: (studentId: string) =>
    api(`/students/${studentId}`, { method: 'DELETE' }),
  restoreStudent: (studentId: string) =>
    api(`/students/${studentId}/restore`, { method: 'PATCH' }),

  users: () => api<AdminUser[]>('/users'),
  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'TEACHER';
  }) =>
    api<AdminUser>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  toggleUser: (userId: string) =>
    api<AdminUser>(`/users/${userId}/toggle-active`, { method: 'PATCH' }),
  userAssignments: (userId: string) =>
    api<TeacherAssignments>(`/users/${userId}/assignments`),
  setUserAssignments: (userId: string, classRoomIds: string[]) =>
    api<TeacherAssignments>(`/users/${userId}/assignments`, {
      method: 'PUT',
      body: JSON.stringify({ classRoomIds }),
    }),

  assignNfc: (
    studentId: string,
    uid: string,
    allowTransfer = false,
  ) =>
    api<NfcAssignmentResponse>('/nfc/cards/assign', {
      method: 'POST',
      body: JSON.stringify({ studentId, uid, allowTransfer }),
    }),
  unassignNfc: (studentId: string) =>
    api<{ status: string; studentId: string; uid: string | null }>(
      `/nfc/cards/student/${studentId}`,
      { method: 'DELETE' },
    ),

  nfcCheckIn: (uid: string, date = todayString()) =>
    api<{
      status: 'success' | 'duplicate' | 'unknown' | 'error';
      uid: string;
      studentName?: string;
      studentId?: string;
      className?: string;
      message: string;
      checkedInAt: string;
    }>('/nfc/check-in', {
      method: 'POST',
      body: JSON.stringify({ uid, date }),
    }),

  nfcSummary: (date = todayString()) =>
    api<NfcCheckInSummary>(`/nfc/check-ins?date=${encodeURIComponent(date)}`),
};

export function isNfcTransferRequired(error: unknown): error is ApiError & {
  body: NfcTransferRequired;
} {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.body?.code === 'NFC_TRANSFER_REQUIRED'
  );
}

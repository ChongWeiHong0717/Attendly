import type { User } from '../types';
import { attendanceApi, clearToken, getToken } from './api';

export async function signIn(
  email: string,
  password: string,
): Promise<User> {
  if (!email.trim() || !password.trim()) {
    throw new Error('Enter your email and password.');
  }
  return attendanceApi.login(email.trim(), password);
}

export async function restoreSession(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    return await attendanceApi.me();
  } catch {
    clearToken();
    return null;
  }
}

export function signOut() {
  clearToken();
}

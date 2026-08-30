import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('attendance:unauthorized', handleUnauthorized);

    if (!localStorage.getItem('attendance_token')) {
      setLoading(false);
      return () => window.removeEventListener('attendance:unauthorized', handleUnauthorized);
    }

    api<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('attendance_token');
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('attendance:unauthorized', handleUnauthorized);
  }, []);

  async function login(email: string, password: string) {
    const result = await api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('attendance_token', result.accessToken);
    setUser(result.user);
    return result.user;
  }
  function logout() { localStorage.removeItem('attendance_token'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

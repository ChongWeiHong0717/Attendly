import { useEffect, useState } from 'react';
import Logo from './components/Logo';
import LoginPage from './pages/LoginPage';
import NfcCheckInPage from './pages/NfcCheckInPage';
import AdminPage from './pages/AdminPage';
import { restoreSession, signOut } from './services/auth';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('attendance:unauthorized', handleUnauthorized);

    restoreSession()
      .then(setUser)
      .finally(() => setLoading(false));

    return () =>
      window.removeEventListener('attendance:unauthorized', handleUnauthorized);
  }, []);

  function logout() {
    signOut();
    setUser(null);
  }

  if (loading) {
    return (
      <main className="boot-shell">
        <Logo />
        <div className="boot-spinner" />
        <p>Connecting to Attendly…</p>
      </main>
    );
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  if (user.role === 'TEACHER') {
    return <NfcCheckInPage user={user} onLogout={logout} />;
  }

  return <AdminPage user={user} onLogout={logout} />;
}

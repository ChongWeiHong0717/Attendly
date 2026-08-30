import { FormEvent, useState } from 'react';
import Logo from '../components/Logo';
import { signIn } from '../services/auth';
import { getApiUrl, setApiUrl } from '../services/api';
import type { User } from '../types';

export default function LoginPage({
  onLogin,
}: {
  onLogin: (user: User) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrlValue] = useState(() => getApiUrl());
  const [showServer, setShowServer] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      setApiUrl(apiUrl);
      onLogin(await signIn(email, password));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in to the attendance server.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand-inner">
          <Logo />
          <div className="eyebrow">Desktop attendance client</div>
          <h1>
            Fast NFC attendance.
            <br />
            One shared school database.
          </h1>
          <p>
            Teachers get a focused NFC check-in terminal. Administrators get
            the larger management workspace for students, classes, accounts,
            cards and attendance.
          </p>

          <div className="feature-stack">
            <div className="feature-line">
              <span>01</span>
              <div>
                <strong>Real accounts</strong>
                <small>Uses the same JWT login as the website.</small>
              </div>
            </div>
            <div className="feature-line">
              <span>02</span>
              <div>
                <strong>Direct NFC-X</strong>
                <small>Uses the proven HID protocol from the v1.1 checkpoint.</small>
              </div>
            </div>
            <div className="feature-line">
              <span>03</span>
              <div>
                <strong>Shared records</strong>
                <small>Website and desktop use the same NestJS + MySQL API.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-heading">
            <span className="status-chip neutral">School account</span>
            <h2>Welcome back</h2>
            <p>Sign in to your Attendly school server.</p>
          </div>

          <label>
            Email address
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="inline-alert error">{error}</div>}

          <button
            className="primary-button large"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>



          <div className="login-server-note">
            <button type="button" className="text-button" onClick={() => setShowServer((value) => !value)}>
              {showServer ? 'Hide server settings' : 'Server settings'}
            </button>
            {showServer && (
              <label className="server-url-field">
                API URL
                <input
                  value={apiUrl}
                  onChange={(event) => setApiUrlValue(event.target.value)}
                  placeholder="https://your-backend.example.com/api"
                  spellCheck={false}
                />
              </label>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

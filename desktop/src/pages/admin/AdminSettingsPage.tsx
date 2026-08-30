import { FormEvent, useEffect, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { attendanceApi, getApiUrl, setApiUrl } from '../../services/api';
import type { AcademicYear } from '../../types';

export default function AdminSettingsPage() {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [nextYear, setNextYear] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [apiUrl, setApiUrlValue] = useState(() => getApiUrl());

  async function load() {
    try {
      const year = await attendanceApi.currentYear();
      setCurrentYear(year);
      setNextYear(String(Number(year.name) + 1));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load academic year.',
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function requestRollover(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!nextYear.trim()) return;
    setConfirming(true);
  }

  async function rollover() {
    setConfirming(false);
    try {
      const year = await attendanceApi.rolloverYear(nextYear.trim());
      setCurrentYear(year);
      setNextYear(String(Number(year.name) + 1));
      setMessage(
        `Academic year ${year.name} is now active. Student identities remain preserved; current-year enrollments and teacher assignments can now be set for the new year.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to roll over academic year.',
      );
    }
  }

  return (
    <div className="admin-content">
      <div className="content-toolbar">
        <div>
          <h2>System settings</h2>
          <p>Shared backend and academic-year administration.</p>
        </div>
      </div>

      {error && <div className="inline-alert error page-alert">{error}</div>}
      {message && (
        <div className="inline-alert success-alert page-alert">{message}</div>
      )}

      <div className="settings-grid">
        <section className="panel settings-card">
          <div>
            <span className="settings-kicker">Academic year</span>
            <h3>Year rollover</h3>
            <p>
              Current active year:{' '}
              <strong>{currentYear?.name || 'Loading…'}</strong>
            </p>
          </div>

          <form className="form-stack" onSubmit={requestRollover}>
            <label>
              New academic year
              <input
                value={nextYear}
                onChange={(event) => setNextYear(event.target.value)}
                inputMode="numeric"
                placeholder="2027"
              />
            </label>

            <div className="settings-warning">
              Rollover closes the current year. It does not delete students or
              historical attendance. New current-year student enrollments and
              teacher assignments must then be created.
            </div>

            <button className="primary-button">Start new academic year</button>
          </form>
        </section>

        <section className="panel settings-card">
          <div>
            <span className="settings-kicker">Connection</span>
            <h3>Shared Attendly API</h3>
            <p>
              Both the website and the PC app are configured to use the same
              NestJS backend.
            </p>
          </div>

          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              try {
                setApiUrl(apiUrl);
                setMessage(`Desktop API updated to ${getApiUrl()}. Sign out and back in if your current session belongs to a different server.`);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Invalid API URL.');
              }
            }}
          >
            <label>
              Desktop API URL
              <input
                value={apiUrl}
                onChange={(event) => setApiUrlValue(event.target.value)}
                placeholder="https://your-backend.example.com/api"
                spellCheck={false}
              />
            </label>
            <button className="secondary-button" type="submit">Save API URL</button>
          </form>

          <dl className="settings-facts">
            <div>
              <dt>API URL</dt>
              <dd>
                <code>{getApiUrl()}</code>
              </dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>MySQL via Prisma</dd>
            </div>
            <div>
              <dt>Desktop auth</dt>
              <dd>JWT · same accounts as website</dd>
            </div>
            <div>
              <dt>NFC reader</dt>
              <dd>0483:4343 · MI_01</dd>
            </div>
          </dl>
        </section>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Start academic year ${nextYear}?`}
          description={`This will close academic year ${currentYear?.name || 'the current year'} and create ${nextYear} as the active year. Existing student identities, NFC ownership, and historical records remain preserved.`}
          confirmLabel="Start new year"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={rollover}
        />
      )}
    </div>
  );
}

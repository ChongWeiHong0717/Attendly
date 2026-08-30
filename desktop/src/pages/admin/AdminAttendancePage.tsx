import { useEffect, useState } from 'react';
import { attendanceApi, todayString } from '../../services/api';
import type { NfcCheckInSummary } from '../../types';

export default function AdminAttendancePage() {
  const [date, setDate] = useState(todayString());
  const [summary, setSummary] = useState<NfcCheckInSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(targetDate = date) {
    setLoading(true);
    setError('');
    try {
      setSummary(await attendanceApi.nfcSummary(targetDate));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load NFC check-ins.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(date);
    // Load when the selected date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="admin-content">
      <div className="content-toolbar">
        <div>
          <h2>NFC attendance</h2>
          <p>
            Review daily arrival records created by the desktop NFC terminal.
          </p>
        </div>

        <div className="toolbar-actions">
          <input
            className="date-field"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            className="ghost-button"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="inline-alert error page-alert">{error}</div>}

      <section className="stat-grid compact">
        <Metric
          label="Checked in"
          value={String(summary?.checkedInCount ?? 0)}
          trend={date}
        />
        <Metric
          label="Not checked in"
          value={String(summary?.notCheckedInCount ?? 0)}
          trend="Active students"
        />
        <Metric
          label="NFC assigned"
          value={String(summary?.assignedCardCount ?? 0)}
          trend={`${summary?.totalActiveStudents ?? 0} active students`}
        />
        <Metric
          label="Coverage"
          value={
            summary?.totalActiveStudents
              ? `${Math.round(
                  (summary.assignedCardCount / summary.totalActiveStudents) *
                    100,
                )}%`
              : '0%'
          }
          trend="Card assignment"
        />
      </section>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h3>Arrival records</h3>
            <p>
              {summary?.records.length ?? 0} NFC records for {date}
            </p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Time</th>
                <th>NFC UID</th>
                <th>Scanned by</th>
              </tr>
            </thead>
            <tbody>
              {summary?.records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.student.fullName}</strong>
                  </td>
                  <td>
                    <code className="table-code">
                      {record.student.studentCode}
                    </code>
                  </td>
                  <td>
                    {record.classRoom
                      ? `${record.classRoom.formLevel} ${record.classRoom.name}`
                      : 'Unassigned'}
                  </td>
                  <td>
                    {new Intl.DateTimeFormat('en-MY', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }).format(new Date(record.checkedInAt))}
                  </td>
                  <td>
                    <code className="nfc-uid-chip">{record.uid}</code>
                  </td>
                  <td>{record.scannedBy.name}</td>
                </tr>
              ))}

              {!loading && (summary?.records.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="empty-table-cell">
                    No NFC check-ins for this date.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="empty-table-cell">
                    Loading arrival records…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="attendance-note">
        <strong>How this fits the existing website attendance:</strong>
        <span>
          NFC check-in records arrivals. The existing class attendance workflow
          remains the source for final Present/Absent confirmation and absence
          history.
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </div>
  );
}

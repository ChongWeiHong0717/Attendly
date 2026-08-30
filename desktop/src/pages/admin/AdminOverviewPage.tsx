import { useEffect, useMemo, useState } from 'react';
import { attendanceApi, todayString } from '../../services/api';
import type { AdminUser, ClassRoom, NfcCheckInSummary, Student } from '../../types';
import type { AdminView } from '../AdminPage';

export default function AdminOverviewPage({
  onNavigate,
}: {
  onNavigate: (view: AdminView) => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [summary, setSummary] = useState<NfcCheckInSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      attendanceApi.students(),
      attendanceApi.users(),
      attendanceApi.classes(),
      attendanceApi.nfcSummary(todayString()),
    ])
      .then(([studentRows, userRows, classRows, nfcSummary]) => {
        setStudents(studentRows);
        setUsers(userRows);
        setClasses(classRows);
        setSummary(nfcSummary);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Unable to load dashboard.',
        ),
      );
  }, []);

  const teachers = useMemo(
    () => users.filter((row) => row.role === 'TEACHER' && row.isActive),
    [users],
  );
  const assigned = students.filter((student) => Boolean(student.nfcUid)).length;
  const coverage = students.length
    ? Math.round((assigned / students.length) * 100)
    : 0;

  return (
    <div className="admin-content">
      {error && <div className="inline-alert error page-alert">{error}</div>}

      <section className="welcome-strip">
        <div>
          <span className="status-chip neutral">{todayString()}</span>
          <h2>School operations, one database.</h2>
          <p>
            Student records, NFC ownership and gate check-ins now use the same
            backend as the attendance website.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => onNavigate('nfc')}
        >
          Open NFC Check-In
        </button>
      </section>

      <section className="stat-grid">
        <Metric
          label="Active students"
          value={String(students.length)}
          trend={`${classes.length} active classes`}
        />
        <Metric
          label="Teachers"
          value={String(teachers.length)}
          trend={`${users.filter((row) => row.isActive).length} active accounts`}
        />
        <Metric
          label="NFC assigned"
          value={String(assigned)}
          trend={`${coverage}% coverage`}
        />
        <Metric
          label="Checked in today"
          value={String(summary?.checkedInCount ?? 0)}
          trend={`${summary?.notCheckedInCount ?? students.length} not checked in`}
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Administration</h3>
              <p>Common database-backed actions.</p>
            </div>
          </div>
          <div className="quick-actions">
            <QuickAction
              icon="◉"
              title="Manage students"
              detail="Add students, move classes and assign NFC cards"
              onClick={() => onNavigate('students')}
            />
            <QuickAction
              icon="▤"
              title="Manage classes"
              detail="Create and archive school classes"
              onClick={() => onNavigate('classes')}
            />
            <QuickAction
              icon="◇"
              title="Manage teachers"
              detail="Accounts and class assignments"
              onClick={() => onNavigate('teachers')}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>NFC readiness</h3>
              <p>Live assignment coverage.</p>
            </div>
            <span
              className={`status-chip ${coverage >= 90 ? 'success' : 'neutral'}`}
            >
              {coverage}%
            </span>
          </div>
          <div className="coverage-summary">
            <div className="coverage-number">{assigned}</div>
            <p>
              of {students.length} active student records currently have an
              NFC UID assigned.
            </p>
            <div className="progress large-progress">
              <i style={{ width: `${coverage}%` }} />
            </div>
            <button
              className="secondary-button"
              onClick={() => onNavigate('students')}
            >
              Review NFC assignments
            </button>
          </div>
        </div>
      </section>
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

function QuickAction({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <b>→</b>
    </button>
  );
}

import { useState } from 'react';
import Logo from '../components/Logo';
import type { User } from '../types';
import AdminOverviewPage from './admin/AdminOverviewPage';
import AdminStudentsPage from './admin/AdminStudentsPage';
import AdminClassesPage from './admin/AdminClassesPage';
import AdminTeachersPage from './admin/AdminTeachersPage';
import AdminAttendancePage from './admin/AdminAttendancePage';
import AdminSettingsPage from './admin/AdminSettingsPage';
import NfcCheckInPage from './NfcCheckInPage';

export type AdminView =
  | 'overview'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'attendance'
  | 'nfc'
  | 'imports'
  | 'settings';

const nav: { key: AdminView; label: string; icon: string; badge?: string }[] = [
  { key: 'overview', label: 'Overview', icon: '▦' },
  { key: 'students', label: 'Students', icon: '◉' },
  { key: 'classes', label: 'Classes', icon: '▤' },
  { key: 'teachers', label: 'Teachers', icon: '◇' },
  { key: 'attendance', label: 'Attendance', icon: '✓' },
  { key: 'nfc', label: 'NFC Check-In', icon: '⌁' },
  { key: 'imports', label: 'Excel Import', icon: '⇧', badge: 'Soon' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

export default function AdminPage({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [view, setView] = useState<AdminView>('overview');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Logo />
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Workspace</span>
          {nav.map((item) => (
            <button
              key={item.key}
              className={view === item.key ? 'active' : ''}
              onClick={() => {
                if (item.key === 'students') setStudentClassFilter('');
                setView(item.key);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.badge && <small>{item.badge}</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>Administrator</span>
          </div>
          <button onClick={onLogout} title="Log out" aria-label="Log out">
            ↗
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">School administration</span>
            <h1>{nav.find((item) => item.key === view)?.label}</h1>
          </div>
          <div className="admin-top-actions">
            <span className="online-pill">
              <i /> Shared database
            </span>
            <button className="ghost-button" onClick={onLogout}>
              Log out
            </button>
          </div>
        </header>

        {view === 'overview' && (
          <AdminOverviewPage onNavigate={setView} />
        )}
        {view === 'students' && (
          <AdminStudentsPage initialClassFilter={studentClassFilter} />
        )}
        {view === 'classes' && (
          <AdminClassesPage
            onOpenStudents={(classRoomId) => {
              setStudentClassFilter(classRoomId);
              setView('students');
            }}
          />
        )}
        {view === 'teachers' && (
          <AdminTeachersPage currentUser={user} />
        )}
        {view === 'attendance' && <AdminAttendancePage />}
        {view === 'nfc' && (
          <NfcCheckInPage
            user={user}
            onLogout={onLogout}
            adminEmbedded
          />
        )}
        {view === 'imports' && <ImportPlaceholder />}
        {view === 'settings' && <AdminSettingsPage />}
      </main>
    </div>
  );
}

function ImportPlaceholder() {
  return (
    <div className="admin-content">
      <div className="content-toolbar">
        <div>
          <h2>Excel Import</h2>
          <p>
            Reserved for the upcoming yearly enrollment import workflow.
          </p>
        </div>
      </div>
      <div className="panel import-drop">
        <div className="upload-icon">⇧</div>
        <span className="status-chip neutral">Next feature</span>
        <h3>Import is intentionally not enabled yet</h3>
        <p>
          The shared database and desktop admin flows are now in place. Excel
          preview, validation and yearly class mapping can be added here
          without changing the NFC integration.
        </p>
        <button className="secondary-button" disabled>
          Choose Excel file
        </button>
      </div>
    </div>
  );
}

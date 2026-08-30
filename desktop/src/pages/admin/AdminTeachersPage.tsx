import { FormEvent, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { attendanceApi } from '../../services/api';
import type {
  AdminUser,
  ClassRoom,
  TeacherAssignments,
  User,
} from '../../types';

export default function AdminTeachersPage({
  currentUser,
}: {
  currentUser: User;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);

  async function load() {
    try {
      const [userRows, classRows] = await Promise.all([
        attendanceApi.users(),
        attendanceApi.classes(),
      ]);
      setUsers(userRows);
      setClasses(classRows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load accounts.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeCount = useMemo(
    () => users.filter((row) => row.isActive).length,
    [users],
  );

  async function toggleConfirmed() {
    if (!toggleTarget) return;
    try {
      await attendanceApi.toggleUser(toggleTarget.id);
      setToggleTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account.');
    }
  }

  return (
    <div className="admin-content">
      <div className="content-toolbar">
        <div>
          <h2>Teachers & accounts</h2>
          <p>
            Manage login accounts and the classes assigned to each teacher.
          </p>
        </div>
        <button className="primary-button" onClick={() => setCreateOpen(true)}>
          + Add account
        </button>
      </div>

      {error && <div className="inline-alert error page-alert">{error}</div>}

      <section className="mini-stat-row">
        <div>
          <span>Accounts</span>
          <strong>{users.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <span>Teachers</span>
          <strong>
            {users.filter((row) => row.role === 'TEACHER').length}
          </strong>
        </div>
      </section>

      <div className="panel table-panel">
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="identity-cell">
                      <span className="student-avatar account-avatar">
                        {row.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{row.name}</strong>
                        {row.id === currentUser.id && <small>Current account</small>}
                      </div>
                    </div>
                  </td>
                  <td>{row.email}</td>
                  <td>
                    <span className="status-chip neutral normal-case">
                      {row.role === 'ADMIN' ? 'Administrator' : 'Teacher'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-chip ${
                        row.isActive ? 'success' : 'neutral'
                      } normal-case`}
                    >
                      {row.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {row.role === 'TEACHER' && (
                        <button
                          className="table-button primary-lite"
                          onClick={() => setAssignTarget(row)}
                        >
                          Classes
                        </button>
                      )}
                      <button
                        className={`table-button ${
                          row.isActive ? 'danger-text' : ''
                        }`}
                        disabled={row.id === currentUser.id}
                        title={
                          row.id === currentUser.id
                            ? 'You cannot disable your current desktop session here.'
                            : undefined
                        }
                        onClick={() => setToggleTarget(row)}
                      >
                        {row.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-table-cell">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <CreateAccountModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await load();
          }}
        />
      )}

      {assignTarget && (
        <AssignmentsModal
          teacher={assignTarget}
          classes={classes}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.isActive ? 'Disable account?' : 'Enable account?'}
          description={
            toggleTarget.isActive
              ? `${toggleTarget.name} will not be able to sign in until the account is enabled again.`
              : `${toggleTarget.name} will be allowed to sign in again.`
          }
          confirmLabel={toggleTarget.isActive ? 'Disable account' : 'Enable account'}
          danger={toggleTarget.isActive}
          onCancel={() => setToggleTarget(null)}
          onConfirm={toggleConfirmed}
        />
      )}
    </div>
  );
}

function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await attendanceApi.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add account"
      subtitle="Creates a school login in the shared backend."
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="inline-alert error">{error}</div>}

        <label>
          Full name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Temporary password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <small className="field-help">Minimum 6 characters.</small>
        </label>

        <label>
          Role
          <select
            className="field-select"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as 'TEACHER' | 'ADMIN')
            }
          >
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </label>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={
              busy ||
              name.trim().length < 2 ||
              !email.trim() ||
              password.length < 6
            }
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssignmentsModal({
  teacher,
  classes,
  onClose,
}: {
  teacher: AdminUser;
  classes: ClassRoom[];
  onClose: () => void;
}) {
  const [data, setData] = useState<TeacherAssignments | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    attendanceApi
      .userAssignments(teacher.id)
      .then((result) => {
        setData(result);
        setSelected(result.classes.map((row) => row.id));
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : 'Unable to load assignments.',
        ),
      )
      .finally(() => setBusy(false));
  }, [teacher.id]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await attendanceApi.setUserAssignments(teacher.id, selected);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save assignments.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Class assignments — ${teacher.name}`}
      subtitle={data ? `Academic year ${data.academicYear.name}` : undefined}
      onClose={onClose}
      width="large"
    >
      {error && <div className="inline-alert error">{error}</div>}

      {busy ? (
        <div className="modal-loading">Loading class assignments…</div>
      ) : (
        <>
          <div className="assignment-class-grid">
            {[1, 2, 3, 4, 5].map((formLevel) => (
              <section key={formLevel}>
                <h3>Form {formLevel}</h3>
                <div>
                  {classes
                    .filter((row) => row.formLevel === formLevel)
                    .map((row) => (
                      <label
                        className={`class-check ${
                          selected.includes(row.id) ? 'selected' : ''
                        }`}
                        key={row.id}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          onChange={() => toggle(row.id)}
                        />
                        <span>
                          {row.formLevel} {row.name}
                        </span>
                      </label>
                    ))}
                </div>
              </section>
            ))}
          </div>

          <div className="modal-actions">
            <button className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save assignments'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

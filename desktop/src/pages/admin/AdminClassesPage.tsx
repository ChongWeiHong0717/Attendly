import { FormEvent, useEffect, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { attendanceApi } from '../../services/api';
import type { ClassRoom, Student } from '../../types';

export default function AdminClassesPage({ onOpenStudents }: { onOpenStudents: (classRoomId: string) => void }) {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ClassRoom | null>(null);

  async function load() {
    try {
      const [classRows, studentRows] = await Promise.all([
        attendanceApi.classes(),
        attendanceApi.students(),
      ]);
      setClasses(classRows);
      setStudents(studentRows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load classes.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function archive() {
    if (!archiveTarget) return;
    try {
      await attendanceApi.archiveClass(archiveTarget.id);
      setArchiveTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive class.');
    }
  }

  return (
    <div className="admin-content">
      <div className="content-toolbar">
        <div>
          <h2>Classes</h2>
          <p>Manage the fixed class structure used by the website and desktop.</p>
        </div>
        <button className="primary-button" onClick={() => setCreateOpen(true)}>
          + Add class
        </button>
      </div>

      {error && <div className="inline-alert error page-alert">{error}</div>}

      <div className="class-grid">
        {classes.map((classRoom) => {
          const count = students.filter(
            (student) => student.classRoom?.id === classRoom.id,
          ).length;

          return (
            <article className="class-card" key={classRoom.id}>
              <div className="class-card-top">
                <span className="form-badge">FORM {classRoom.formLevel}</span>
                <button
                  className="table-button danger-text"
                  onClick={() => setArchiveTarget(classRoom)}
                >
                  Archive
                </button>
              </div>
              <h3>
                {classRoom.formLevel} {classRoom.name}
              </h3>
              <p>{count} current students</p>
              <div className="class-card-footer">
                <span className="status-chip success normal-case">
                  Active
                </span>
                <button
                  className="table-button primary-lite"
                  onClick={() => onOpenStudents(classRoom.id)}
                >
                  View students →
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {classes.length === 0 && (
        <div className="panel placeholder-panel">
          <div className="empty-icon">▤</div>
          <h3>No active classes</h3>
          <p>Add the first school class to begin enrolling students.</p>
        </div>
      )}

      {createOpen && (
        <CreateClassModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await load();
          }}
        />
      )}

      {archiveTarget && (
        <ConfirmDialog
          title="Archive class?"
          description={`${archiveTarget.formLevel} ${archiveTarget.name} will be hidden from active class selection. Existing historical enrollments remain in the database.`}
          confirmLabel="Archive class"
          danger
          onCancel={() => setArchiveTarget(null)}
          onConfirm={archive}
        />
      )}
    </div>
  );
}

function CreateClassModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [formLevel, setFormLevel] = useState(1);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setBusy(true);
    setError('');

    try {
      await attendanceApi.createClass(formLevel, name.trim());
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create class.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add class"
      subtitle="Creates a new active class in the shared school database."
      onClose={onClose}
      width="small"
    >
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="inline-alert error">{error}</div>}

        <label>
          Form level
          <select
            className="field-select"
            value={formLevel}
            onChange={(event) => setFormLevel(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <option value={level} key={level}>
                Form {level}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Bestari"
            autoFocus
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={busy || !name.trim()}
          >
            {busy ? 'Creating…' : 'Add class'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

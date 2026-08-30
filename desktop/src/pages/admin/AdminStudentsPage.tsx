import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import {
  attendanceApi,
  isNfcTransferRequired,
} from '../../services/api';
import { nfcHardware } from '../../services/nfc';
import type {
  ClassRoom,
  NfcTransferRequired,
  ReaderStatus,
  Student,
} from '../../types';

export default function AdminStudentsPage({ initialClassFilter = '' }: { initialClassFilter?: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState(initialClassFilter);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [assignStudent, setAssignStudent] = useState<Student | null>(null);
  const [moveStudent, setMoveStudent] = useState<Student | null>(null);
  const [archiveStudent, setArchiveStudent] = useState<Student | null>(null);
  const [unassignStudent, setUnassignStudent] = useState<Student | null>(null);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const [studentRows, classRows] = await Promise.all([
        attendanceApi.students(),
        attendanceApi.classes(),
      ]);
      setStudents(studentRows);
      setClasses(classRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load students.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.fullName.toLowerCase().includes(query) ||
        student.studentCode.toLowerCase().includes(query) ||
        (student.nfcUid || '').toLowerCase().includes(query);

      const matchesClass =
        !classFilter || student.classRoom?.id === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [students, search, classFilter]);

  async function archiveConfirmed() {
    if (!archiveStudent) return;
    try {
      await attendanceApi.archiveStudent(archiveStudent.id);
      setArchiveStudent(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive student.');
    }
  }

  async function unassignConfirmed() {
    if (!unassignStudent) return;
    try {
      await attendanceApi.unassignNfc(unassignStudent.id);
      setUnassignStudent(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove NFC card.');
    }
  }

  const assignedCount = students.filter((student) => student.nfcUid).length;

  return (
    <div className="admin-content">
      <div className="content-toolbar">
        <div>
          <h2>Students</h2>
          <p>
            Add students, manage current classes, and assign physical NFC
            cards.
          </p>
        </div>
        <button className="primary-button" onClick={() => setAddOpen(true)}>
          + Add student
        </button>
      </div>

      {error && <div className="inline-alert error page-alert">{error}</div>}

      <section className="mini-stat-row">
        <div>
          <span>Active records</span>
          <strong>{students.length}</strong>
        </div>
        <div>
          <span>NFC assigned</span>
          <strong>{assignedCount}</strong>
        </div>
        <div>
          <span>Without NFC</span>
          <strong>{Math.max(0, students.length - assignedCount)}</strong>
        </div>
      </section>

      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box">
            ⌕
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, student ID, or NFC UID…"
            />
          </div>
          <select
            className="compact-select"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((classRoom) => (
              <option value={classRoom.id} key={classRoom.id}>
                {classRoom.formLevel} {classRoom.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>NFC card</th>
                <th className="actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="identity-cell">
                      <span className="student-avatar">
                        {initials(student.fullName)}
                      </span>
                      <div>
                        <strong>{student.fullName}</strong>
                        <small>IC / MyKid {student.icMasked || '—'}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="table-code">{student.studentCode}</code>
                  </td>
                  <td>
                    {student.classRoom ? (
                      <span className="status-chip neutral normal-case">
                        {student.classRoom.formLevel} {student.classRoom.name}
                      </span>
                    ) : (
                      <span className="status-chip duplicate normal-case">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td>
                    {student.nfcUid ? (
                      <code className="nfc-uid-chip">{student.nfcUid}</code>
                    ) : (
                      <span className="status-chip neutral normal-case">
                        Not assigned
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="table-button primary-lite"
                        onClick={() => setAssignStudent(student)}
                      >
                        {student.nfcUid ? 'Replace NFC' : 'Set NFC'}
                      </button>
                      <button
                        className="table-button"
                        onClick={() => setMoveStudent(student)}
                      >
                        Class
                      </button>
                      {student.nfcUid && (
                        <button
                          className="table-button danger-text"
                          onClick={() => setUnassignStudent(student)}
                        >
                          Remove NFC
                        </button>
                      )}
                      <button
                        className="table-button danger-text"
                        onClick={() => setArchiveStudent(student)}
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-table-cell">
                    No students match this view.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={5} className="empty-table-cell">
                    Loading student records…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddStudentModal
          classes={classes}
          defaultClassId={classFilter}
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await load();
          }}
        />
      )}

      {assignStudent && (
        <AssignNfcModal
          student={assignStudent}
          onClose={() => setAssignStudent(null)}
          onDone={async () => {
            setAssignStudent(null);
            await load();
          }}
        />
      )}

      {moveStudent && (
        <MoveStudentModal
          student={moveStudent}
          classes={classes}
          onClose={() => setMoveStudent(null)}
          onDone={async () => {
            setMoveStudent(null);
            await load();
          }}
        />
      )}

      {archiveStudent && (
        <ConfirmDialog
          title="Archive student?"
          description={`${archiveStudent.fullName} (${archiveStudent.studentCode}) will leave the active roster. Historical attendance and their permanent student ID stay preserved.`}
          confirmLabel="Archive student"
          danger
          onCancel={() => setArchiveStudent(null)}
          onConfirm={archiveConfirmed}
        />
      )}

      {unassignStudent && (
        <ConfirmDialog
          title="Remove NFC assignment?"
          description={`UID ${unassignStudent.nfcUid} will be detached from ${unassignStudent.studentCode} — ${unassignStudent.fullName}. The card can then be assigned to another student.`}
          confirmLabel="Remove NFC"
          danger
          onCancel={() => setUnassignStudent(null)}
          onConfirm={unassignConfirmed}
        />
      )}
    </div>
  );
}

function AddStudentModal({
  classes,
  defaultClassId,
  onClose,
  onAdded,
}: {
  classes: ClassRoom[];
  defaultClassId?: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [classRoomId, setClassRoomId] = useState(
    defaultClassId || classes[0]?.id || '',
  );
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!classRoomId || fullName.trim().length < 2) return;

    setBusy(true);
    setError('');

    try {
      await attendanceApi.createStudent(classRoomId, {
        fullName: fullName.trim(),
        studentCode: studentCode.trim() || undefined,
        icNumber: icNumber.trim() || undefined,
      });
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add student.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add student"
      subtitle="Creates a permanent student identity and current-year class enrollment."
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="inline-alert error">{error}</div>}

        <label>
          Current class
          <select
            className="field-select"
            value={classRoomId}
            onChange={(event) => setClassRoomId(event.target.value)}
            required
          >
            {classes.map((classRoom) => (
              <option value={classRoom.id} key={classRoom.id}>
                Form {classRoom.formLevel} · {classRoom.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Student name *
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            autoFocus
            required
          />
        </label>

        <label>
          Student ID
          <input
            value={studentCode}
            onChange={(event) => setStudentCode(event.target.value)}
            placeholder="Leave blank to auto-generate"
          />
          <small className="field-help">
            Blank IDs are generated by the shared backend and never reused.
          </small>
        </label>

        <label>
          IC / MyKid
          <input
            value={icNumber}
            onChange={(event) => setIcNumber(event.target.value)}
            placeholder="Optional"
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={busy || !classRoomId || fullName.trim().length < 2}
          >
            {busy ? 'Adding student…' : 'Add student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MoveStudentModal({
  student,
  classes,
  onClose,
  onDone,
}: {
  student: Student;
  classes: ClassRoom[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [classRoomId, setClassRoomId] = useState(
    student.classRoom?.id || classes[0]?.id || '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!classRoomId) return;
    setBusy(true);
    setError('');

    try {
      await attendanceApi.enrollStudent(student.id, classRoomId);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update class.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Change class — ${student.fullName}`}
      subtitle="Only the current-year enrollment changes. The permanent student ID and NFC card stay the same."
      onClose={onClose}
      width="small"
    >
      <div className="form-stack">
        {error && <div className="inline-alert error">{error}</div>}
        <label>
          Current class
          <select
            className="field-select"
            value={classRoomId}
            onChange={(event) => setClassRoomId(event.target.value)}
          >
            {classes.map((classRoom) => (
              <option value={classRoom.id} key={classRoom.id}>
                Form {classRoom.formLevel} · {classRoom.name}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={() => void save()}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save class'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssignNfcModal({
  student,
  onClose,
  onDone,
}: {
  student: Student;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [reader, setReader] = useState<ReaderStatus>({
    state: 'not-connected',
    message: 'Checking reader…',
  });
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [capturedUid, setCapturedUid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transfer, setTransfer] = useState<NfcTransferRequired | null>(null);
  const handlingUid = useRef(false);

  useEffect(() => {
    let active = true;
    const offStatus = nfcHardware.onStatus((status) => {
      if (active) setReader(status);
    });
    const offScan = nfcHardware.onScan((result) => {
      if (
        active &&
        result.state === 'success' &&
        result.uid &&
        !handlingUid.current
      ) {
        handlingUid.current = true;
        void handleUid(result.uid);
      }
    });

    nfcHardware
      .status()
      .then((status) => active && setReader(status))
      .catch((err) => {
        if (active) {
          setReader({
            state: 'error',
            message: 'Unable to access NFC reader.',
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      active = false;
      offStatus();
      offScan();
      void nfcHardware.stopContinuous().catch(() => undefined);
    };
    // student is fixed for the lifetime of this modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUid(uid: string) {
    setCapturedUid(uid);
    setScanning(false);
    setBusy(true);
    setError('');
    setTransfer(null);
    await nfcHardware.stopContinuous().catch(() => undefined);

    try {
      const result = await attendanceApi.assignNfc(student.id, uid, false);
      setSuccess(
        result.status === 'already-assigned'
          ? `${uid} is already assigned to ${student.studentCode} — ${student.fullName}.`
          : `${uid} was assigned to ${student.studentCode} — ${student.fullName}.`,
      );
    } catch (err) {
      if (isNfcTransferRequired(err)) {
        setTransfer(err.body);
      } else {
        setError(
          err instanceof Error ? err.message : 'Unable to assign NFC card.',
        );
      }
    } finally {
      setBusy(false);
      handlingUid.current = false;
    }
  }

  async function startScanner() {
    setError('');
    setSuccess('');
    setTransfer(null);
    setCapturedUid(null);

    let current = reader;
    if (current.state !== 'connected') {
      current = await nfcHardware.reconnect();
      setReader(current);
    }

    if (current.state !== 'connected') {
      setError('NFC-X reader is not connected.');
      return;
    }

    handlingUid.current = false;
    const state = await nfcHardware.startContinuous();
    if (!state.active) {
      setError(state.message || 'Unable to start NFC scanner.');
      return;
    }

    setScanning(true);
  }

  async function stopScanner() {
    await nfcHardware.stopContinuous();
    setScanning(false);
  }

  async function confirmTransfer() {
    if (!transfer) return;

    setBusy(true);
    setError('');
    try {
      const result = await attendanceApi.assignNfc(
        student.id,
        transfer.uid,
        true,
      );
      setTransfer(null);
      setSuccess(
        `${result.uid} was transferred to ${student.studentCode} — ${student.fullName}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to transfer NFC card.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    await nfcHardware.stopContinuous().catch(() => undefined);
    await onDone();
  }

  return (
    <Modal
      title={`${student.nfcUid ? 'Replace' : 'Set'} NFC card`}
      subtitle={`${student.studentCode} — ${student.fullName}`}
      onClose={async () => {
        await nfcHardware.stopContinuous().catch(() => undefined);
        onClose();
      }}
    >
      <div className="nfc-assign-layout">
        <div
          className={`reader-inline-card ${
            reader.state === 'connected' ? 'connected' : ''
          }`}
        >
          <span className="reader-dot" />
          <div>
            <strong>
              {reader.state === 'connected'
                ? 'NFC-X connected'
                : reader.message}
            </strong>
            <small>
              {reader.device?.product ||
                reader.detail ||
                'VID 0483 · PID 4343 · MI_01'}
            </small>
          </div>
        </div>

        {student.nfcUid && (
          <div className="current-card-box">
            <span>Current NFC UID</span>
            <code>{student.nfcUid}</code>
          </div>
        )}

        {error && <div className="inline-alert error">{error}</div>}
        {success && <div className="inline-alert success-alert">{success}</div>}

        {transfer && (
          <div className="transfer-warning">
            <span className="warning-icon">!</span>
            <div>
              <strong>This card already belongs to another student</strong>
              <p>
                UID <code>{transfer.uid}</code> is currently assigned to{' '}
                <b>
                  {transfer.currentOwner.studentCode} —{' '}
                  {transfer.currentOwner.fullName}
                </b>
                .
              </p>
              <p>
                Transferring it will remove the UID from that student and
                assign it to <b>{student.studentCode} — {student.fullName}</b>.
                {transfer.targetCurrentUid && (
                  <>
                    {' '}
                    This student's current UID{' '}
                    <code>{transfer.targetCurrentUid}</code> will also be
                    replaced.
                  </>
                )}
              </p>
              <div className="transfer-actions">
                <button
                  className="ghost-button"
                  onClick={() => {
                    setTransfer(null);
                    setCapturedUid(null);
                  }}
                >
                  Cancel transfer
                </button>
                <button
                  className="danger-button"
                  onClick={() => void confirmTransfer()}
                  disabled={busy}
                >
                  {busy ? 'Transferring…' : 'Transfer NFC card'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!success && !transfer && (
          <div className={`assignment-stage ${scanning ? 'active' : ''}`}>
            <div className="assignment-ring">
              <span>⌁</span>
            </div>
            <h3>
              {scanning ? 'Waiting for NFC card…' : 'Ready to scan a card'}
            </h3>
            <p>
              {scanning
                ? 'Tap the physical card on the NFC-X reader. The UID will be captured automatically.'
                : 'Start the scanner, then present the card you want to assign.'}
            </p>
            {capturedUid && <code className="captured-uid">{capturedUid}</code>}
            {scanning ? (
              <button
                className="danger-outline-button"
                onClick={() => void stopScanner()}
              >
                Stop scanner
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={() => void startScanner()}
                disabled={busy}
              >
                Start NFC scanner
              </button>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button
            className="ghost-button"
            onClick={async () => {
              await nfcHardware.stopContinuous().catch(() => undefined);
              onClose();
            }}
          >
            Close
          </button>
          {success && (
            <button className="primary-button" onClick={() => void finish()}>
              Done
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST'
  );
}

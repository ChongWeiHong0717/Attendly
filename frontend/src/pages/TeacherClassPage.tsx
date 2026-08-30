import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarCheck2, ClipboardCheck, Plus, Search, UsersRound, X } from 'lucide-react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Modal } from '../components/Modal';
import { api, todayString } from '../lib/api';
import type { ClassRoom, Student } from '../lib/types';

type StudentAttendanceStatus='PRESENT'|'ABSENT'|'UNMARKED';
type SnapshotStudent={id:string;studentCode:string;fullName:string;nfcCheckedIn:boolean;status:StudentAttendanceStatus};
type Snapshot = { date:string;completed:boolean;presentCount:number;absentCount:number;nfcPresentCount:number;students:SnapshotStudent[] };

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('') || 'ST'}

export function TeacherClassPage() {
  const { classId = '' } = useParams();
  const location = useLocation();
  const [searchParams,setSearchParams] = useSearchParams();
  const initialClass = (location.state as any)?.classRoom as ClassRoom | undefined;
  const [classRoom, setClassRoom] = useState<ClassRoom | undefined>(initialClass);
  const [students, setStudents] = useState<Student[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [date, setDate] = useState(searchParams.get('date') || todayString());
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [list, snap, mine] = await Promise.all([
        api<Student[]>(`/students?classRoomId=${classId}`),
        api<Snapshot>(`/attendance/class/${classId}?date=${date}`),
        classRoom ? Promise.resolve(null) : api<any>('/classes/mine'),
      ]);
      setStudents(list); setSnapshot(snap);
      if (!classRoom && mine) setClassRoom(mine.classes.find((c:ClassRoom)=>c.id===classId));
    } catch(e:any){ setError(e.message); }
  }
  useEffect(()=>{ setSearchParams({date},{replace:true}); load(); },[classId,date]);
  const filtered = useMemo(()=>students.filter(s=>`${s.fullName} ${s.studentCode}`.toLowerCase().includes(search.trim().toLowerCase())),[students,search]);
  const statusByStudent = useMemo(()=>new Map((snapshot?.students ?? []).map(s=>[s.id,s])),[snapshot]);
  const selectedLabel = date===todayString() ? "Today" : new Date(`${date}T00:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});

  return <AppShell><main className="page-container max-w-6xl">
    <Link to="/teacher" className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-bold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={17}/>My Classes</Link>

    <section className="class-focus-panel mb-6">
      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2"><span className="status-chip bg-[var(--primary-soft)] text-[var(--primary)]">Form {classRoom?.formLevel ?? '—'}</span><span className="status-chip bg-slate-100 text-slate-600"><UsersRound size={14}/>{students.length} students</span></div>
          <h1 className="text-[2rem] font-extrabold tracking-[-.035em] text-slate-900 sm:text-[2.5rem]">{classRoom ? `${classRoom.formLevel} ${classRoom.name}` : 'Class'}</h1>
          <p className="mt-1.5 text-sm text-slate-500">Attendance and class roster for {selectedLabel}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[150px_130px_130px_auto] sm:items-stretch">
          <label className="metric-card flex flex-col justify-center"><span className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Date</span><input type="date" value={date} max={todayString()} onChange={e=>setDate(e.target.value)} className="field h-10 py-1.5" aria-label="Attendance date"/></label>
          <div className="metric-card"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="status-dot bg-emerald-500"/>Present</div><div className="metric-number mt-2 text-emerald-700">{snapshot?.presentCount ?? 0}</div><div className="mt-1 text-[11px] text-slate-400">{snapshot?.completed?'Saved':'NFC checked in'}</div></div>
          <div className="metric-card"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="status-dot bg-red-500"/>Absent</div><div className="metric-number mt-2 text-red-700">{snapshot?.absentCount ?? 0}</div><div className="mt-1 text-[11px] text-slate-400">{snapshot?.completed?'Saved':'Not checked in'}</div></div>
          <Link to={`/teacher/classes/${classId}/attendance?date=${date}`} state={{classRoom}} className="btn-primary min-h-[76px] px-5 sm:min-w-[176px]"><ClipboardCheck size={20}/><span>{snapshot?.completed ? 'Edit Attendance' : 'Take Attendance'}</span></Link>
        </div>
      </div>
    </section>

    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <section className="panel overflow-hidden">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2"><CalendarCheck2 size={19} className="text-[var(--primary)]"/><h2 className="section-title">Students</h2></div><p className="section-caption">{students.length} in this class</p></div>
          <button onClick={()=>setShowAdd(true)} className="btn-secondary w-full shrink-0 sm:w-auto"><Plus size={17}/>Add Student</button>
        </div>
        <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or Student ID" className="field pl-10 pr-11" aria-label="Search students in this class"/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear student search" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"><X size={17}/></button>}</div>
      </div>
      <div className="divide-y divide-slate-100">
        {filtered.map(s=>{const attendance=statusByStudent.get(s.id); const saved=snapshot?.completed; const state=attendance?.status; const label=saved?(state==='PRESENT'?'Present':'Absent'):(attendance?.nfcCheckedIn?'Present · NFC':'Not checked in'); const cls=saved?(state==='PRESENT'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'):(attendance?.nfcCheckedIn?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'); return <div key={s.id} className="roster-row"><span className="student-avatar">{initials(s.fullName)}</span><div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold text-slate-900">{s.fullName}</div><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"><span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-600">{s.studentCode}</span>{s.icMasked && <span>IC {s.icMasked}</span>}</div></div><span className={`status-chip shrink-0 ${cls}`}>{label}</span></div>})}
        {!filtered.length&&<div className="p-10 text-center text-sm text-muted">{search?'No matching students.':'No students in this class.'}</div>}
      </div>
    </section>
  </main>{showAdd && <AddStudentModal classId={classId} classRoom={classRoom} onClose={()=>setShowAdd(false)} onAdded={()=>{setShowAdd(false);load();}}/>}</AppShell>;
}

function AddStudentModal({classId,classRoom,onClose,onAdded}:{classId:string;classRoom?:ClassRoom;onClose:()=>void;onAdded:()=>void}) {
  const [fullName,setFullName]=useState('');
  const [studentCode,setStudentCode]=useState('');
  const [icNumber,setIcNumber]=useState('');
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function submit(e:FormEvent){ e.preventDefault(); setBusy(true); setError(''); try { await api(`/students/class/${classId}`,{method:'POST',body:JSON.stringify({fullName,studentCode:studentCode.trim()||undefined,icNumber:icNumber.trim()||undefined})}); onAdded(); } catch(e:any){setError(e.message)} finally{setBusy(false)} }
  return <Modal title="Add Student" onClose={onClose}><form noValidate onSubmit={submit} className="space-y-4"><div className="soft-panel px-4 py-3 text-sm"><span className="text-muted">Class</span><div className="mt-0.5 font-bold text-slate-900">{classRoom ? `${classRoom.formLevel} ${classRoom.name}` : 'Current class'}</div></div>{error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block"><span className="field-label">Student name *</span><input autoFocus value={fullName} onChange={e=>setFullName(e.target.value)} className="field"/></label><label className="block"><span className="field-label">Student ID <span className="font-normal text-slate-400">(optional)</span></span><input value={studentCode} onChange={e=>setStudentCode(e.target.value)} className="field" placeholder="Leave blank to auto-generate"/><span className="mt-1.5 block text-xs text-muted">Must be unique if entered.</span></label><label className="block"><span className="field-label">IC / MyKid <span className="font-normal text-slate-400">(optional)</span></span><input value={icNumber} onChange={e=>setIcNumber(e.target.value)} className="field" placeholder="e.g. 120101-10-1234"/><span className="mt-1.5 block text-xs text-muted">Used to distinguish students with the same name.</span></label><div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={busy||fullName.trim().length<2} className="btn-primary">{busy?'Adding…':'Add Student'}</button></div></form></Modal>;
}

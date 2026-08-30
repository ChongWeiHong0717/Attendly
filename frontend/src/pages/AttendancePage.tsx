import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Save, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { api, todayString } from '../lib/api';
import type { ClassRoom } from '../lib/types';

type Status='PRESENT'|'ABSENT'|'UNMARKED';
type Row={id:string;studentCode:string;fullName:string;status:Status};
type Snapshot={date:string;completed:boolean;presentCount:number|null;absentCount:number|null;students:Row[]};

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('') || 'ST'}

export function AttendancePage(){
  const {classId=''}=useParams(); const location=useLocation(); const classRoom=(location.state as any)?.classRoom as ClassRoom|undefined;
  const [date,setDate]=useState(todayString()); const [rows,setRows]=useState<Row[]>([]); const [completed,setCompleted]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [saved,setSaved]=useState('');
  async function load(){setError('');try{const s=await api<Snapshot>(`/attendance/class/${classId}?date=${date}`);setRows(s.students);setCompleted(s.completed);setSaved('');}catch(e:any){setError(e.message)}}
  useEffect(()=>{load()},[classId,date]);
  const counts=useMemo(()=>({present:rows.filter(r=>r.status==='PRESENT').length,absent:rows.filter(r=>r.status==='ABSENT').length,unmarked:rows.filter(r=>r.status==='UNMARKED').length}),[rows]);
  const marked=counts.present+counts.absent; const progress=rows.length?Math.round(marked/rows.length*100):0;
  function mark(id:string,status:'PRESENT'|'ABSENT'){setRows(r=>r.map(x=>x.id===id?{...x,status}:x));setSaved('');setError('')}
  async function save(){if(counts.unmarked){setError('Mark every student Present or Absent before saving.');return;}setBusy(true);setError('');try{await api(`/attendance/class/${classId}`,{method:'POST',body:JSON.stringify({date,statuses:rows.map(r=>({studentId:r.id,status:r.status}))})});setCompleted(true);setSaved('Attendance saved.');}catch(e:any){setError(e.message)}finally{setBusy(false)}}

  return <AppShell><main className="page-container max-w-6xl pb-28 sm:pb-8">
    <Link to={`/teacher/classes/${classId}`} state={{classRoom}} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-bold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={17}/>Back to class</Link>

    <section className="class-focus-panel mb-5">
      <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_220px] lg:items-end">
        <div><span className="status-chip bg-[var(--primary-soft)] text-[var(--primary)]">{classRoom?`${classRoom.formLevel} ${classRoom.name}`:'Class'}</span><h1 className="mt-3 text-[2rem] font-extrabold tracking-[-.035em] text-slate-900 sm:text-[2.4rem]">Attendance</h1><p className="mt-1.5 text-sm text-slate-500">{completed?'Editing saved attendance.':'Mark each student Present or Absent.'}</p></div>
        <label><span className="field-label">Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="field"/></label>
      </div>
    </section>

    <section className="panel mb-5 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><div className="text-sm font-bold text-slate-900">Attendance progress</div><div className="mt-0.5 text-xs text-slate-500">{marked} of {rows.length} students marked</div></div><div className="text-2xl font-extrabold tracking-[-.03em] text-[var(--primary)]">{progress}%</div></div>
      <div className="attendance-progress" aria-label={`${progress}% attendance marked`}><div className="attendance-progress-bar" style={{width:`${progress}%`}}/></div>
    </section>

    <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3"><Summary label="Present" value={counts.present} tone="success"/><Summary label="Absent" value={counts.absent} tone="danger"/><Summary label="Unmarked" value={counts.unmarked} tone={counts.unmarked?'warning':'success'}/></div>
    {error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{saved&&<div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18}/>{saved}</div>}

    <section className="space-y-3">
      {rows.map(r=><article key={r.id} className={`attendance-row ${r.status==='PRESENT'?'attendance-row-present':r.status==='ABSENT'?'attendance-row-absent':''}`}>
        <div className="mb-3 flex min-w-0 items-center gap-3 sm:mb-0"><span className="student-avatar">{initials(r.fullName)}</span><div className="min-w-0"><div className="truncate font-bold text-slate-900">{r.fullName}</div><div className="mt-1 font-mono text-xs text-muted">{r.studentCode}</div></div></div>
        <div className="grid grid-cols-2 gap-2 sm:flex"><button onClick={()=>mark(r.id,'PRESENT')} aria-pressed={r.status==='PRESENT'} className={`min-h-12 rounded-[.875rem] border px-4 py-2 text-sm font-bold transition sm:min-w-32 ${r.status==='PRESENT'?'border-emerald-500 bg-emerald-600 text-white shadow-sm':'border-slate-300 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}><span className="inline-flex items-center gap-2"><Check size={17}/>Present</span></button><button onClick={()=>mark(r.id,'ABSENT')} aria-pressed={r.status==='ABSENT'} className={`min-h-12 rounded-[.875rem] border px-4 py-2 text-sm font-bold transition sm:min-w-32 ${r.status==='ABSENT'?'border-red-500 bg-red-600 text-white shadow-sm':'border-slate-300 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700'}`}><span className="inline-flex items-center gap-2"><X size={17}/>Absent</span></button></div>
      </article>)}
      {!rows.length&&<div className="empty-state">No students in this class.</div>}
    </section>

    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(18,32,51,.08)] backdrop-blur lg:left-[272px] sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"><div className="mx-auto max-w-6xl"><button onClick={save} disabled={busy||!rows.length} className="btn-primary w-full sm:ml-auto sm:flex sm:w-auto sm:min-w-48"><Save size={18}/>{busy?'Saving…':completed?'Save Correction':'Save Attendance'}</button></div></div>
  </main></AppShell>;
}

function Summary({label,value,tone}:{label:string;value:number;tone:'success'|'danger'|'warning'}){
  const cls=tone==='success'?'text-emerald-700 bg-emerald-50 border-emerald-100':tone==='danger'?'text-red-700 bg-red-50 border-red-100':'text-amber-700 bg-amber-50 border-amber-100';
  return <div className={`min-w-0 rounded-[1rem] border px-3 py-3 text-center sm:px-4 ${cls}`}><div className="text-2xl font-extrabold tracking-[-.03em]">{value}</div><div className="truncate text-xs font-semibold opacity-80">{label}</div></div>
}

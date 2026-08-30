import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpenCheck, Layers3, School } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { api } from '../lib/api';
import type { AcademicYear, ClassRoom } from '../lib/types';

const formTone = ['','form-tone-teal','form-tone-sky','form-tone-navy','form-tone-amber','form-tone-slate'];

export function TeacherHomePage() {
  const [data, setData] = useState<{academicYear: AcademicYear; classes: ClassRoom[]} | null>(null);
  const [error, setError] = useState('');
  useEffect(()=>{ api<any>('/classes/mine').then(setData).catch(e=>setError(e.message)); },[]);
  const groups = useMemo(()=>Array.from({length:5},(_,i)=>({form:i+1, classes:data?.classes.filter(c=>c.formLevel===i+1) || []})).filter(g=>g.classes.length),[data]);

  return <AppShell><main className="page-container max-w-6xl">
    <section className="teacher-intro mb-7">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--primary)]"><BookOpenCheck size={15}/>Academic Year {data?.academicYear.name || '—'}</div>
          <h1 className="page-heading">My Classes</h1>
          <p className="page-subtitle">Open a class to view students or take attendance.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:min-w-40">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[var(--secondary)] shadow-sm"><Layers3 size={19}/></span>
          <div><div className="text-2xl font-extrabold leading-none text-slate-900">{data?.classes.length ?? '—'}</div><div className="mt-1 text-xs font-semibold text-slate-500">Assigned classes</div></div>
        </div>
      </div>
    </section>

    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!data ? <div className="panel p-6 text-sm text-muted">Loading classes…</div> : !data.classes.length ? <div className="empty-state">No classes assigned for {data.academicYear.name}.</div> :
      <div className="space-y-8">{groups.map(g=><section key={g.form}>
        <div className="mb-3 flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${g.form===1?'bg-teal-600':g.form===2?'bg-sky-600':g.form===3?'bg-slate-700':g.form===4?'bg-amber-500':'bg-slate-500'}`}/><h2 className="text-sm font-extrabold uppercase tracking-[.11em] text-slate-600">Form {g.form}</h2><span className="text-xs text-slate-400">{g.classes.length} {g.classes.length===1?'class':'classes'}</span></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {g.classes.map(c=><Link key={c.id} to={`/teacher/classes/${c.id}`} state={{classRoom:c}} className={`teacher-class-card ${formTone[c.formLevel]}`}>
            <div className="flex items-start gap-4">
              <span className="teacher-class-icon"><School size={23}/></span>
              <div className="min-w-0 flex-1">
                <span className="status-chip" style={{background:'var(--tone-soft)',color:'var(--tone)'}}>Form {c.formLevel}</span>
                <h3 className="mt-3 truncate text-[1.45rem] font-extrabold tracking-[-.025em] text-slate-900">{c.formLevel} {c.name}</h3>
                <p className="mt-1 text-sm text-slate-500">Student roster and attendance</p>
              </div>
            </div>
            <div className="teacher-class-action"><span>Open class</span><ArrowUpRight size={18}/></div>
          </Link>)}
        </div>
      </section>)}</div>}
  </main></AppShell>;
}

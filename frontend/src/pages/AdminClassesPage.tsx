import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Layers3, Plus, School, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { UndoToast } from '../components/UndoToast';
import { api } from '../lib/api';
import type { ClassRoom } from '../lib/types';

const formTone = ['','form-tone-teal','form-tone-sky','form-tone-navy','form-tone-amber','form-tone-slate'];

export function AdminClassesPage(){
  const [classes,setClasses]=useState<ClassRoom[]>([]); const [showAdd,setShowAdd]=useState(false); const [pendingDelete,setPendingDelete]=useState<ClassRoom|null>(null); const [undo,setUndo]=useState<ClassRoom|null>(null); const [error,setError]=useState('');
  const load=()=>api<ClassRoom[]>('/classes').then(setClasses).catch(e=>setError(e.message)); useEffect(()=>{load()},[]);
  const groups=useMemo(()=>Array.from({length:5},(_,i)=>({form:i+1,classes:classes.filter(c=>c.formLevel===i+1)})),[classes]);
  async function remove(){const c=pendingDelete;if(!c)return;setPendingDelete(null);try{await api(`/classes/${c.id}`,{method:'DELETE'});setUndo(c);load()}catch(e:any){setError(e.message)}}
  async function restore(){if(!undo)return;try{await api(`/classes/${undo.id}/restore`,{method:'PATCH'});setUndo(null);load()}catch(e:any){setError(e.message)}}

  return <AppShell><main className="page-container">
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="page-kicker">School structure</p><h1 className="page-heading mt-1">Classes</h1><p className="page-subtitle">Active classes across Forms 1–5.</p></div>
      <button onClick={()=>setShowAdd(true)} className="btn-primary w-full sm:w-auto"><Plus size={17}/>Add Class</button>
    </div>
    {error&&<div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-fit">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--secondary-soft)] text-[var(--secondary)]"><Layers3 size={19}/></span>
      <div><div className="text-2xl font-extrabold leading-none text-slate-900">{classes.length}</div><div className="mt-1 text-xs font-semibold text-slate-500">Active classes</div></div>
    </div>

    <div className="space-y-5">{groups.map(g=><section key={g.form} className="admin-section">
      <div className="admin-section-header"><div><h2 className="section-title">Form {g.form}</h2><p className="section-caption">{g.classes.length} {g.classes.length===1?'class':'classes'}</p></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${g.form===1?'bg-teal-50 text-teal-700':g.form===2?'bg-sky-50 text-sky-700':g.form===3?'bg-slate-100 text-slate-700':g.form===4?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}><School size={17}/></span></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {g.classes.map(c=><div key={c.id} className={`admin-class-card ${formTone[c.formLevel]}`}><div className="pl-1"><span className="status-chip" style={{background:'var(--tone-soft)',color:'var(--tone)'}}>Form {c.formLevel}</span><div className="mt-2 text-lg font-extrabold tracking-[-.02em] text-slate-900">{c.formLevel} {c.name}</div></div><button aria-label={`Remove ${c.formLevel} ${c.name}`} title="Remove class" onClick={()=>setPendingDelete(c)} className="icon-button border-0 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={18}/></button></div>)}
        {!g.classes.length&&<div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-sm text-muted">No classes in Form {g.form}.</div>}
      </div>
    </section>)}</div>
  </main>{showAdd&&<AddClass onClose={()=>setShowAdd(false)} onAdded={()=>{setShowAdd(false);load()}}/>}{pendingDelete&&<ConfirmDialog title="Remove class?" description={`${pendingDelete.formLevel} ${pendingDelete.name} will be removed from active classes. Historical records stay preserved.`} confirmLabel="Remove class" onCancel={()=>setPendingDelete(null)} onConfirm={remove}/>} {undo&&<UndoToast message="Class removed." onUndo={restore} onDismiss={()=>setUndo(null)}/>}</AppShell>;
}

function AddClass({onClose,onAdded}:{onClose:()=>void;onAdded:()=>void}){const[formLevel,setForm]=useState(1);const[name,setName]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await api('/classes',{method:'POST',body:JSON.stringify({formLevel,name})});onAdded()}catch(e:any){setError(e.message)}finally{setBusy(false)}}return <Modal title="Add Class" onClose={onClose}><form noValidate onSubmit={submit} className="space-y-4">{error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block"><span className="field-label">Form</span><select value={formLevel} onChange={e=>setForm(Number(e.target.value))} className="field">{[1,2,3,4,5].map(x=><option key={x} value={x}>Form {x}</option>)}</select></label><label className="block"><span className="field-label">Class name</span><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Aranda" className="field"/></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button disabled={busy||!name.trim()} className="btn-primary">{busy?'Creating…':'Create'}</button></div></form></Modal>}

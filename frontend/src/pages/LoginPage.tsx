import { FormEvent, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, GraduationCap, School, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const user = await login(email, password);
      nav(user.role === 'ADMIN' ? '/admin/classes' : '/teacher');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[var(--bg)] lg:grid lg:grid-cols-[minmax(360px,0.95fr)_1.05fr]">
    <section className="relative hidden min-h-screen overflow-hidden bg-[var(--secondary-strong)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-2xl"/>
      <div className="relative z-10 flex items-center gap-3"><span className="sidebar-logo"><GraduationCap size={22}/></span><div><div className="font-bold">School Attendance</div><div className="text-xs text-slate-400">Attendance management</div></div></div>
      <div className="relative z-10 max-w-lg">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-bold text-teal-200"><School size={14}/>School operations</span>
        <h1 className="mt-5 max-w-md text-4xl font-extrabold tracking-[-.04em] xl:text-5xl">Attendance, clearly managed.</h1>
        <div className="mt-8 space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-3"><CheckCircle2 size={18} className="text-teal-300"/>Class-first teacher workflow</div>
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-teal-300"/>Historical records stay preserved</div>
          <div className="flex items-center gap-3"><GraduationCap size={18} className="text-teal-300"/>Mobile and school-laptop ready</div>
        </div>
      </div>
      <div className="relative z-10 text-xs text-slate-500">Campus Signal 1.2 visual system</div>
    </section>

    <section className="grid min-h-screen place-items-center px-4 py-8 sm:px-6 lg:px-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3 lg:hidden"><span className="sidebar-logo"><GraduationCap size={22}/></span><div><h1 className="text-xl font-extrabold text-slate-900">School Attendance</h1><p className="text-sm text-muted">Sign in</p></div></div>
        <div className="mb-6 hidden lg:block"><p className="page-kicker">Welcome back</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-slate-900">Sign in</h2><p className="mt-1 text-sm text-slate-500">Use your school account.</p></div>
        <form noValidate onSubmit={submit} className="panel-elevated p-5 sm:p-7">
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <label className="mb-4 block"><span className="field-label">Email</span><input value={email} onChange={e=>setEmail(e.target.value)} className="field" type="email" autoComplete="username"/></label>
          <label className="mb-6 block"><span className="field-label">Password</span><span className="relative block"><input value={password} onChange={e=>setPassword(e.target.value)} className="field pr-12" type={showPassword?'text':'password'} autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100" aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </section>
  </main>;
}

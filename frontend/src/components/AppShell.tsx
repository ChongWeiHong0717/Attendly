import { useState } from 'react';
import { CalendarRange, GraduationCap, LogOut, Menu, School, Shield, UserRoundCog, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const adminItems = [
  ['/admin/classes', 'Classes', School],
  ['/admin/students', 'Students', Users],
  ['/admin/users', 'Teachers & Accounts', UserRoundCog],
  ['/admin/year', 'Academic Year', CalendarRange],
] as const;
const teacherItems = [['/teacher', 'My Classes', School]] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items = user?.role === 'ADMIN' ? adminItems : teacherItems;
  const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : 'Teacher';
  const RoleIcon = user?.role === 'ADMIN' ? Shield : GraduationCap;

  const nav = <>
    <div className="sidebar-brand">
      <span className="sidebar-logo"><RoleIcon size={21}/></span>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold text-white">School Attendance</div>
        <div className="mt-0.5 text-xs text-slate-400">{roleLabel}</div>
      </div>
    </div>
    <div className="sidebar-section">Workspace</div>
    <nav className="space-y-1.5">
      {items.map(([to,label,Icon])=><NavLink key={to} to={to} onClick={()=>setOpen(false)} className={({isActive})=>`sidebar-link ${isActive?'sidebar-link-active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}
    </nav>
    <div className="mt-auto border-t border-white/10 pt-4">
      <div className="mb-3 rounded-xl bg-white/[.06] px-3 py-3">
        <div className="truncate text-sm font-semibold text-white">{user?.name}</div>
        <div className="mt-0.5 truncate text-xs text-slate-400">{user?.email}</div>
      </div>
      <button onClick={logout} className="sidebar-link w-full"><LogOut size={18}/>Logout</button>
    </div>
  </>;

  return <div className="min-h-screen bg-app text-app">
    <aside className="sidebar-desktop">{nav}</aside>
    {open&&<div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" onClick={()=>setOpen(false)}/><aside className="sidebar-mobile"><button onClick={()=>setOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={20}/></button>{nav}</aside></div>}
    <div className="lg:pl-[272px]">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl" style={{borderColor:'rgba(211,220,230,.85)'}}>
        <div className="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={()=>setOpen(true)} className="icon-button lg:hidden" aria-label="Open navigation"><Menu size={20}/></button>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">{user?.role==='ADMIN'?'School administration':'Teacher attendance'}</div>
              <div className="mt-0.5 truncate text-xs text-slate-500">{user?.role==='ADMIN'?'Manage classes, students and accounts':'Classes and daily attendance'}</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex"><span className="h-2 w-2 rounded-full bg-teal-600"/>{user?.name}</div>
        </div>
      </header>
      {children}
    </div>
  </div>;
}

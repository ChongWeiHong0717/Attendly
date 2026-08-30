import { useEffect } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',fn);return()=>document.removeEventListener('keydown',fn)},[onClose]);
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.25rem] border border-slate-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-[1.25rem]" onMouseDown={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-5 py-4"><h2 id="modal-title" className="text-lg font-extrabold tracking-[-.02em] text-slate-900">{title}</h2><button onClick={onClose} className="icon-button" aria-label="Close dialog"><X size={18}/></button></div>
      <div className="max-h-[calc(92dvh-65px)] overflow-y-auto p-5 sm:p-6">{children}</div>
    </div>
  </div>;
}

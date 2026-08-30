import { Modal } from './Modal';
export function ConfirmDialog({title,description,confirmLabel='Confirm',danger=true,onCancel,onConfirm}:{title:string;description:string;confirmLabel?:string;danger?:boolean;onCancel:()=>void;onConfirm:()=>void}){
 return <Modal title={title} onClose={onCancel}><p className="text-sm leading-6 text-muted">{description}</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button autoFocus className="btn-secondary" onClick={onCancel}>Cancel</button><button className={danger?'btn-danger':'btn-primary'} onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}

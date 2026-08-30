import Modal from './Modal';

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal title={title} onClose={onCancel} width="small">
      <p className="dialog-description">{description}</p>
      <div className="modal-actions">
        <button className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className={danger ? 'danger-button' : 'primary-button'}
          onClick={() => void onConfirm()}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

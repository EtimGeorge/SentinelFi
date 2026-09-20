import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { Trash2, ShieldCheck } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Controlled destructive/decision confirmation dialog.
 * Wraps the shared Modal and standardizes confirm/cancel actions.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', busy = false, onConfirm, onCancel,
}) => {
  const isDanger = tone === 'danger';
  const Icon = isDanger ? Trash2 : ShieldCheck;

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      hideCloseButton={busy}
      size="sm"
    >
      <div className="space-y-6 pt-4 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border ${isDanger ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'}`}>
          <Icon className="w-10 h-10" />
        </div>
        <p className="text-sm text-slate-400 leading-relaxed font-medium">{message}</p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" className="px-8 border-slate-800" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            className={isDanger ? 'bg-red-600 hover:bg-red-700 text-white px-8 font-black text-xs' : 'px-8 font-black text-xs'}
            onClick={onConfirm}
            isLoading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
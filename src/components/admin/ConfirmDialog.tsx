import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}) => {
  const { at } = useAdminLanguage();

  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const displayText = description || message || at('common.confirmProceed');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidthClass="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
            {cancelLabel ?? at('common.cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel ?? at('common.confirm')}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
            variant === 'danger'
              ? 'bg-[#DC2626]/10 text-[#DC2626]'
              : 'bg-[#F47125]/10 text-[#F47125]'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm leading-relaxed text-[#5B6577]">{displayText}</p>
        </div>
      </div>
    </Modal>
  );
};

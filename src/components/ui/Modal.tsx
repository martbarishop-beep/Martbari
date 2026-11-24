import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { acquireBodyScrollLock } from '../../lib/scrollLock';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const releaseScrollLock = acquireBodyScrollLock();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseScrollLock();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Dialog'}
    >
      <div
        className="fixed inset-0 bg-[#0F1A2C]/65 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 w-full rounded-[16px] bg-white shadow-card border border-[#17263E]/10 overflow-hidden',
          maxWidthClass,
        )}
      >
        <div className="flex items-center justify-between border-b border-[#17263E]/10 px-5 py-4">
          {title ? (
            <h2 className="text-lg font-semibold text-[#0F1A2C]">{title}</h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] text-[#5B6577] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[82dvh] overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[#17263E]/10 bg-[#F5F7FA] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

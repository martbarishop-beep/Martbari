import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { acquireBodyScrollLock } from '../../lib/scrollLock';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  position?: 'left' | 'right';
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  position = 'right',
  children,
  footer,
  widthClass = 'max-w-sm',
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
      className="fixed inset-0 z-50 flex h-[100dvh]"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Drawer'}
    >
      <div
        className="fixed inset-0 bg-[#0F1A2C]/65"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'relative z-10 flex h-[100dvh] w-full flex-col bg-white shadow-card',
          widthClass,
          position === 'right' ? 'ml-auto' : 'mr-auto',
        )}
      >
        <div className="flex items-center justify-between border-b border-[#17263E]/10 px-5 py-4 shrink-0">
          {title ? (
            <h2 className="text-base font-semibold text-[#0F1A2C]">{title}</h2>
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

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t border-[#17263E]/10 bg-[#F5F7FA] px-5 py-4 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
};

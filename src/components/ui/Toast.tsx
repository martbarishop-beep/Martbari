import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import type { ToastMessage } from '../../types';

const TOAST_STYLES: Record<
  ToastMessage['type'],
  { border: string; iconColor: string; Icon: React.FC<{ className?: string }> }
> = {
  success: { border: 'border-[#16A34A]/30', iconColor: 'text-[#16A34A]', Icon: CheckCircle2 },
  error: { border: 'border-[#DC2626]/30', iconColor: 'text-[#DC2626]', Icon: AlertCircle },
  warning: { border: 'border-[#F47125]/35', iconColor: 'text-[#F47125]', Icon: AlertTriangle },
  info: { border: 'border-[#17263E]/20', iconColor: 'text-[#17263E]', Icon: Info },
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();
  const { t } = useTranslation();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="print:hidden fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const { border, iconColor, Icon } = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'flex items-start gap-3 rounded-[12px] border bg-white p-3.5 shadow-card',
              border,
            )}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconColor)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0F1A2C]">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[#5B6577]">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={t('common.close')}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5B6577] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

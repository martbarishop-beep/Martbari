import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  onRetry,
  retryLabel,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-[12px] border border-[#DC2626]/20 bg-[#DC2626]/5 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[12px] bg-white text-[#DC2626] shadow-soft">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-[#0F1A2C]">{title ?? t('common.errorTitle')}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#5B6577]">
        {description ?? t('common.errorDesc')}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-5">
          {retryLabel ?? t('common.retry')}
        </Button>
      )}
    </div>
  );
};

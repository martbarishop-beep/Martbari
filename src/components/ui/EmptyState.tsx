import React from 'react';
import { PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[12px] bg-white text-[#17263E] shadow-soft">
        {icon ?? <PackageOpen className="h-7 w-7 text-[#F47125]" />}
      </div>
      <h3 className="text-lg font-semibold text-[#0F1A2C]">{title ?? t('common.emptyTitle')}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#5B6577]">
        {description ?? t('common.emptyDesc')}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

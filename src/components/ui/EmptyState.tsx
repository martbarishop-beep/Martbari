import React, { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  imageUrl?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  imageUrl,
  actionLabel,
  onAction,
  className,
}) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-[#17263E]/10 bg-[#F8FAFC] px-6 py-12 text-center',
        className,
      )}
    >
      {imageUrl && !imgError ? (
        <div className="mb-5 h-28 w-44 overflow-hidden rounded-xl border border-[#17263E]/10 bg-white shadow-soft">
          <img
            src={imageUrl}
            alt={title ?? t('common.emptyTitle')}
            width={352}
            height={224}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : (
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#17263E] shadow-soft">
          {icon ?? <PackageOpen className="h-7 w-7 text-[#F47125]" />}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#0F1A2C]">{title ?? t('common.emptyTitle')}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#5B6577]">
        {description ?? t('common.emptyDesc')}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5 min-h-[44px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

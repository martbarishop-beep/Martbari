import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { formatNumber } from '../../lib/format';
import { cn } from '../../lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  const { t } = useTranslation();
  const { lang } = useLanguage();

  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={t('common.previous')}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] border border-[#17263E]/15 bg-white px-3 text-sm font-medium text-[#0F1A2C] transition-colors hover:bg-[#F5F7FA] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page) => {
        const active = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] border px-3 text-sm font-semibold tabular-nums transition-colors cursor-pointer',
              active
                ? 'border-[#F47125] bg-[#F47125] text-white'
                : 'border-[#17263E]/15 bg-white text-[#0F1A2C] hover:bg-[#F5F7FA]',
            )}
          >
            {formatNumber(page, lang)}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={t('common.next')}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] border border-[#17263E]/15 bg-white px-3 text-sm font-medium text-[#0F1A2C] transition-colors hover:bg-[#F5F7FA] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
};

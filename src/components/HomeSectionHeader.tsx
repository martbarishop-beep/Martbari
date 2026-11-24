import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export interface HomeSectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  className?: string;
}

export const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  viewAllTo,
  viewAllLabel,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        <p className="text-xs font-bold tracking-wide text-[#D95F18]">{eyebrow}</p>
        <h2 className="mt-1 text-[22px] md:text-[28px] font-bold leading-[1.32] tracking-tight text-[#0F1A2C]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-relaxed text-[#5B6577] line-clamp-1 md:line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>

      {viewAllTo && viewAllLabel && (
        <Link
          to={viewAllTo}
          className="inline-flex min-h-[40px] w-fit shrink-0 items-center gap-1.5 rounded-[12px] border border-[#17263E] bg-white px-4 text-xs md:text-sm font-semibold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors duration-150 whitespace-nowrap"
        >
          <span>{viewAllLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
};

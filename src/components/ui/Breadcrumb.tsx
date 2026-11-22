import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1.5 text-sm', className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-[#5B6577]/70" aria-hidden="true" />}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="text-[#5B6577] transition-colors hover:text-[#F47125]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? 'font-medium text-[#0F1A2C]' : 'text-[#5B6577]',
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

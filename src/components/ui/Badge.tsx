import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'neutral' | 'navy' | 'accent' | 'success' | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-[#F5F7FA] text-[#5B6577] border-[#17263E]/10',
  navy: 'bg-[#17263E] text-white border-transparent',
  accent: 'bg-[#F47125]/12 text-[#D95F18] border-[#F47125]/25',
  success: 'bg-[#16A34A]/10 text-[#15803D] border-[#16A34A]/25',
  danger: 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/25',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'card';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect' }) => {
  if (variant === 'card') {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'rounded-2xl border border-[#17263E]/10 bg-white p-3.5 shadow-soft',
          className,
        )}
      >
        <div className="aspect-square w-full animate-pulse rounded-xl bg-[#E5E9F0]" />
        <div className="mt-3.5 h-3 w-1/3 animate-pulse rounded bg-[#E5E9F0]" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[#E5E9F0]" />
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <div className="h-5 w-1/2 animate-pulse rounded bg-[#E5E9F0]" />
          <div className="h-11 w-20 animate-pulse rounded-xl bg-[#E5E9F0]" />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-[#E5E9F0]',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'h-4 w-full rounded-md',
        variant === 'rect' && 'rounded-[12px]',
        className,
      )}
    />
  );
};

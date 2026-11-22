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
          'rounded-[12px] border border-[#17263E]/10 bg-white p-4 shadow-soft',
          className,
        )}
      >
        <div className="aspect-[4/3] w-full animate-pulse rounded-[10px] bg-[#E5E9F0]" />
        <div className="mt-4 h-3 w-1/3 animate-pulse rounded bg-[#E5E9F0]" />
        <div className="mt-2.5 h-5 w-4/5 animate-pulse rounded bg-[#E5E9F0]" />
        <div className="mt-4 h-6 w-1/2 animate-pulse rounded bg-[#E5E9F0]" />
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

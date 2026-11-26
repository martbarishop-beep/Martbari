import React from 'react';
import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#F47125] text-white hover:bg-[#D95F18] active:bg-[#C25313] shadow-sm border border-transparent',
  secondary:
    'bg-[#17263E] text-white hover:bg-[#1F3252] active:bg-[#121D30] shadow-sm border border-transparent',
  outline:
    'bg-white text-[#0F1A2C] border border-[#17263E]/15 hover:border-[#17263E]/35 hover:bg-[#F5F7FA]',
  ghost:
    'bg-transparent text-[#0F1A2C] hover:bg-[#F5F7FA] border border-transparent',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-sm border border-transparent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] sm:min-h-[38px] px-4 py-2 text-sm',
  md: 'min-h-[44px] px-5 py-2.5 text-sm sm:text-base',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold leading-[1.45] transition-all duration-100 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer select-none',
          'disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';

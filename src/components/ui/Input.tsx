import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      containerClassName,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[#0F1A2C]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 text-[#5B6577]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cn(
              'min-h-[44px] w-full rounded-[12px] border bg-white px-4 py-2.5 text-sm leading-[1.5] text-[#0F1A2C] placeholder:text-[#5B6577]/75 placeholder:leading-[1.5] transition-colors',
              'border-[#17263E]/15 hover:border-[#17263E]/30 focus:border-[#F47125] focus:outline-none focus:ring-2 focus:ring-[#F47125]/20',
              'disabled:bg-[#F5F7FA] disabled:text-[#5B6577] disabled:cursor-not-allowed',
              Boolean(leftIcon) && 'pl-10',
              Boolean(rightIcon) && 'pr-10',
              Boolean(error) && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-[#5B6577]">{rightIcon}</span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-[#DC2626]">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#5B6577]">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

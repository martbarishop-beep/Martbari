import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, containerClassName, className, id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-[#0F1A2C]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full rounded-[12px] border bg-white px-4 py-3 text-sm text-[#0F1A2C] placeholder:text-[#5B6577]/75 transition-colors',
            'border-[#17263E]/15 hover:border-[#17263E]/30 focus:border-[#F47125] focus:outline-none focus:ring-2 focus:ring-[#F47125]/20',
            'disabled:bg-[#F5F7FA] disabled:text-[#5B6577] disabled:cursor-not-allowed',
            error && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-[#DC2626]">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#5B6577]">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

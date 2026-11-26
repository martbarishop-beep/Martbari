import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
      containerClassName,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-[#0F1A2C]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
              'min-h-[44px] w-full appearance-none rounded-[12px] border bg-white px-4 py-2.5 pr-10 text-sm leading-[1.5] text-[#0F1A2C] transition-colors',
              'border-[#17263E]/15 hover:border-[#17263E]/30 focus:border-[#F47125] focus:outline-none focus:ring-2 focus:ring-[#F47125]/20',
              'disabled:bg-[#F5F7FA] disabled:text-[#5B6577] disabled:cursor-not-allowed',
              error && 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]"
            aria-hidden="true"
          />
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

Select.displayName = 'Select';

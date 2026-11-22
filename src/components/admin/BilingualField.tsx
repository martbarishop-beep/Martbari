import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface BilingualFieldProps {
  label: string;
  valueBn: string;
  valueEn: string;
  onChangeBn: (val: string) => void;
  onChangeEn: (val: string) => void;
  placeholderBn?: string;
  placeholderEn?: string;
  multiline?: boolean;
  isTextarea?: boolean;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  helperText?: string;
  error?: string;
  className?: string;
}

export const BilingualField: React.FC<BilingualFieldProps> = ({
  label,
  valueBn,
  valueEn,
  onChangeBn,
  onChangeEn,
  placeholderBn,
  placeholderEn,
  multiline = false,
  isTextarea = false,
  rows = 3,
  required = false,
  maxLength,
  helperText,
  error,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'bn' | 'en'>('bn');

  const currentValue = activeTab === 'bn' ? valueBn : valueEn;
  const currentSetter = activeTab === 'bn' ? onChangeBn : onChangeEn;
  const currentPlaceholder = activeTab === 'bn' ? placeholderBn : placeholderEn;
  const isMulti = multiline || isTextarea;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-[#0F1A2C] uppercase tracking-wider">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>

        {/* BN / EN switcher tabs */}
        <div className="inline-flex rounded-[8px] border border-[#17263E]/15 bg-[#F5F7FA] p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('bn')}
            className={`rounded-[6px] px-2.5 py-0.5 text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === 'bn'
                ? 'bg-[#F47125] text-white shadow-sm'
                : 'text-[#5B6577] hover:text-[#0F1A2C]'
            }`}
          >
            BN {valueBn.trim() && '•'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('en')}
            className={`rounded-[6px] px-2.5 py-0.5 text-[11px] font-bold transition-colors cursor-pointer ${
              activeTab === 'en'
                ? 'bg-[#F47125] text-white shadow-sm'
                : 'text-[#5B6577] hover:text-[#0F1A2C]'
            }`}
          >
            EN {valueEn.trim() && '•'}
          </button>
        </div>
      </div>

      <div className="relative">
        {isMulti ? (
          <textarea
            rows={rows}
            value={currentValue}
            maxLength={maxLength}
            onChange={(e) => currentSetter(e.target.value)}
            placeholder={currentPlaceholder ?? (activeTab === 'bn' ? 'বাংলায় লিখুন...' : 'Write in English...')}
            className={cn(
              'w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-xs text-[#0F1A2C] placeholder:text-[#5B6577]/60 focus:border-[#F47125] focus:outline-none focus:ring-1 focus:ring-[#F47125]',
              error ? 'border-[#DC2626]' : 'border-[#17263E]/15',
            )}
          />
        ) : (
          <input
            type="text"
            value={currentValue}
            maxLength={maxLength}
            onChange={(e) => currentSetter(e.target.value)}
            placeholder={currentPlaceholder ?? (activeTab === 'bn' ? 'বাংলায় লিখুন...' : 'Write in English...')}
            className={cn(
              'h-10 w-full rounded-[10px] border bg-white px-3.5 text-xs text-[#0F1A2C] placeholder:text-[#5B6577]/60 focus:border-[#F47125] focus:outline-none focus:ring-1 focus:ring-[#F47125]',
              error ? 'border-[#DC2626]' : 'border-[#17263E]/15',
            )}
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px]">
        {error ? (
          <span className="font-medium text-[#DC2626]">{error}</span>
        ) : helperText ? (
          <span className="text-[#5B6577]">{helperText}</span>
        ) : (
          <span />
        )}

        {maxLength && (
          <span className="font-mono text-[#5B6577] tabular-nums">
            {currentValue.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

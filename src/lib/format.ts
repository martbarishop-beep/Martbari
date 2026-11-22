import type { SupportedLanguage } from '../config/constants';
import { getCurrentLanguage } from './bilingual';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)] ?? digit);
}

export function toLatinDigits(input: string | number): string {
  return String(input).replace(/[০-৯]/g, (ch) => {
    const idx = BANGLA_DIGITS.indexOf(ch);
    return idx >= 0 ? String(idx) : ch;
  });
}

/**
 * Phone numbers and order numbers always remain in Latin digits regardless of UI language.
 */
export function keepLatinDigits(value: string | null | undefined): string {
  if (!value) return '';
  return toLatinDigits(value);
}

export function formatNumber(value: number, lang?: SupportedLanguage): string {
  const activeLang = lang ?? getCurrentLanguage();
  const safeValue = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat(activeLang === 'bn' ? 'en-IN' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(safeValue));

  return activeLang === 'bn' ? toBanglaDigits(formatted) : formatted;
}

export function formatPrice(amount: number, lang?: SupportedLanguage): string {
  const activeLang = lang ?? getCurrentLanguage();
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.abs(safeAmount % 1) > 0.001;

  const formatted = new Intl.NumberFormat(activeLang === 'bn' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(safeAmount);

  return `৳${activeLang === 'bn' ? toBanglaDigits(formatted) : formatted}`;
}

export function formatDate(
  input: string | Date | null | undefined,
  lang?: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const activeLang = lang ?? getCurrentLanguage();
  const defaultOptions: Intl.DateTimeFormatOptions = options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(activeLang === 'bn' ? 'bn-BD' : 'en-US', defaultOptions).format(date);
}

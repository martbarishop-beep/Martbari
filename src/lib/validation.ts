/**
 * Normalizes any Bangladeshi phone input into a standard 11-digit format: 01XXXXXXXXX
 */
export function normalizeBdPhone(input: string | null | undefined): string {
  if (!input) return '';
  // Convert any Bengali digits to Latin digits first
  const latin = input.replace(/[০-৯]/g, (ch) => {
    const code = ch.charCodeAt(0) - 0x09e6;
    return code >= 0 && code <= 9 ? String(code) : ch;
  });

  // Remove spaces, dashes, parentheses
  let cleaned = latin.replace(/[\s\-()]/g, '');

  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('880')) {
    cleaned = cleaned.slice(2);
  }

  // Ensure leading zero
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

/**
 * Validates whether the normalized phone number is a valid 11-digit Bangladeshi mobile number:
 * 01[3-9]XXXXXXXX
 */
export function isValidBdPhone(phone: string): boolean {
  const normalized = normalizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return true; // Email is optional in guest checkout
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isNonNegativeNumber(value: number | string | null | undefined): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

export function isPositiveNumber(value: number | string | null | undefined): boolean {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isFinite(num) && num > 0;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isNotFutureDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) <= getTodayIsoDate();
}


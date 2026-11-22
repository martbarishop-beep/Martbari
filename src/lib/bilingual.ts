import {
  DEFAULT_LANGUAGE,
  STORE_DEFAULTS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../config/constants';
import i18n from '../i18n';

export function isSupportedLanguage(value: string | undefined | null): value is SupportedLanguage {
  return Boolean(value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value));
}

export function getSavedLanguage(): SupportedLanguage {
  try {
    const stored = window.localStorage.getItem(STORE_DEFAULTS.storageKeyLang);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors
  }
  return DEFAULT_LANGUAGE;
}

export function saveLanguage(lang: SupportedLanguage): void {
  try {
    window.localStorage.setItem(STORE_DEFAULTS.storageKeyLang, lang);
  } catch {
    // Ignore storage access errors
  }
}

export function getCurrentLanguage(): SupportedLanguage {
  const active = i18n.language?.slice(0, 2);
  return isSupportedLanguage(active) ? active : DEFAULT_LANGUAGE;
}

/**
 * Returns the localized database field (`${field}_bn` or `${field}_en`)
 * with automatic fallback to the alternate language.
 */
export function t_field<T extends object>(
  obj: T | null | undefined,
  field: string,
  lang?: SupportedLanguage,
): string {
  if (!obj) return '';
  const activeLang = lang ?? getCurrentLanguage();
  const fallbackLang: SupportedLanguage = activeLang === 'bn' ? 'en' : 'bn';
  const record = obj as Record<string, unknown>;

  const primaryVal = record[`${field}_${activeLang}`];
  if (typeof primaryVal === 'string' && primaryVal.trim().length > 0) {
    return primaryVal;
  }

  const fallbackVal = record[`${field}_${fallbackLang}`];
  if (typeof fallbackVal === 'string' && fallbackVal.trim().length > 0) {
    return fallbackVal;
  }

  return '';
}

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ADMIN_TRANSLATIONS, type AdminLang } from '../i18n/adminTranslations';

const ADMIN_LANG_STORAGE_KEY = 'martbari_admin_lang';

function getSavedAdminLang(): AdminLang {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(ADMIN_LANG_STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') return saved;
    } catch {
      // Ignore storage errors
    }
  }
  return 'en';
}

interface AdminLanguageContextValue {
  adminLang: AdminLang;
  setAdminLang: (lang: AdminLang) => void;
  toggleAdminLang: () => void;
  at: (key: string, vars?: Record<string, string | number>) => string;
  tAdminField: <T extends object>(obj: T | null | undefined, field: string) => string;
  formatAdminPrice: (amount: number) => string;
  formatAdminDate: (date: string | Date | null | undefined, includeTime?: boolean) => string;
}

const AdminLanguageContext = createContext<AdminLanguageContextValue | null>(null);

export const AdminLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminLang, setAdminLangState] = useState<AdminLang>(() => getSavedAdminLang());

  const setAdminLang = useCallback((lang: AdminLang) => {
    setAdminLangState(lang);
    try {
      window.localStorage.setItem(ADMIN_LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleAdminLang = useCallback(() => {
    setAdminLang(adminLang === 'en' ? 'bn' : 'en');
  }, [adminLang, setAdminLang]);

  const at = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const entry = ADMIN_TRANSLATIONS[key];
      let text = entry ? entry[adminLang] || entry.en : key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [adminLang],
  );

  const tAdminField = useCallback(
    <T extends object>(obj: T | null | undefined, field: string): string => {
      if (!obj) return '';
      const record = obj as Record<string, unknown>;
      const primary = record[`${field}_${adminLang}`];
      if (typeof primary === 'string' && primary.trim() !== '') return primary;
      const fallback = record[`${field}_${adminLang === 'bn' ? 'en' : 'bn'}`];
      if (typeof fallback === 'string' && fallback.trim() !== '') return fallback;
      const plain = record[field];
      return typeof plain === 'string' ? plain : '';
    },
    [adminLang],
  );

  const formatAdminPrice = useCallback(
    (amount: number): string => {
      const num = Number.isFinite(amount) ? amount : 0;
      const formatted = new Intl.NumberFormat(adminLang === 'bn' ? 'bn-BD' : 'en-US', {
        maximumFractionDigits: 0,
      }).format(num);
      return `৳${formatted}`;
    },
    [adminLang],
  );

  const formatAdminDate = useCallback(
    (date: string | Date | null | undefined, includeTime = false): string => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      if (Number.isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(adminLang === 'bn' ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      }).format(d);
    },
    [adminLang],
  );

  const value = useMemo<AdminLanguageContextValue>(
    () => ({
      adminLang,
      setAdminLang,
      toggleAdminLang,
      at,
      tAdminField,
      formatAdminPrice,
      formatAdminDate,
    }),
    [adminLang, setAdminLang, toggleAdminLang, at, tAdminField, formatAdminPrice, formatAdminDate],
  );

  return <AdminLanguageContext.Provider value={value}>{children}</AdminLanguageContext.Provider>;
};

export function useAdminLanguage(): AdminLanguageContextValue {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) {
    throw new Error('useAdminLanguage must be used within AdminLanguageProvider');
  }
  return ctx;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_LANGUAGE, type SupportedLanguage } from '../config/constants';
import { isSupportedLanguage, saveLanguage, t_field } from '../lib/bilingual';
import { formatDate as fmtDate, formatPrice as fmtPrice } from '../lib/format';

interface LanguageContextValue {
  lang: SupportedLanguage;
  switchLanguage: (nextLang: SupportedLanguage) => void;
  localizedPath: (path: string, targetLang?: SupportedLanguage) => string;
  tField: <T extends object>(obj: T | null | undefined, field: string) => string;
  formatPrice: (amount: number) => string;
  formatDate: (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{
  routeLang?: string;
  children: React.ReactNode;
}> = ({ routeLang, children }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const lang: SupportedLanguage = isSupportedLanguage(routeLang)
    ? routeLang
    : isSupportedLanguage(i18n.language?.slice(0, 2))
      ? (i18n.language.slice(0, 2) as SupportedLanguage)
      : DEFAULT_LANGUAGE;

  useEffect(() => {
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    saveLanguage(lang);
    document.documentElement.lang = lang;
  }, [i18n, lang]);

  const localizedPath = useCallback(
    (path: string, targetLang: SupportedLanguage = lang) => {
      const normalized = path.startsWith('/') ? path : `/${path}`;
      const stripped = normalized.replace(/^\/(bn|en)(?=\/|$)/, '');
      return `/${targetLang}${stripped === '' ? '' : stripped}`;
    },
    [lang],
  );

  const switchLanguage = useCallback(
    (nextLang: SupportedLanguage) => {
      saveLanguage(nextLang);
      void i18n.changeLanguage(nextLang);
      document.documentElement.lang = nextLang;
      const nextUrl = localizedPath(`${location.pathname}${location.search}${location.hash}`, nextLang);
      navigate(nextUrl, { replace: false });
    },
    [i18n, localizedPath, location.hash, location.pathname, location.search, navigate],
  );

  const tField = useCallback(
    <T extends object>(obj: T | null | undefined, field: string) => t_field(obj, field, lang),
    [lang],
  );

  const formatPrice = useCallback((amount: number) => fmtPrice(amount, lang), [lang]);
  const formatDate = useCallback(
    (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) =>
      fmtDate(date, lang, options),
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      switchLanguage,
      localizedPath,
      tField,
      formatPrice,
      formatDate,
    }),
    [lang, switchLanguage, localizedPath, tField, formatPrice, formatDate],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguageContext(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguageContext must be used inside LanguageProvider');
  }
  return ctx;
}

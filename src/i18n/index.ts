import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguage } from '../config/constants';
import bn from './bn.json';
import en from './en.json';

function getInitialLang(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    const seg = window.location.pathname.split('/')[1];
    if (seg === 'bn' || seg === 'en') {
      return seg;
    }
    try {
      const saved = window.localStorage.getItem('martbari_lang');
      if (saved === 'bn' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
  }
  return DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      bn: { translation: bn },
      en: { translation: en },
    },
    lng: getInitialLang(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;

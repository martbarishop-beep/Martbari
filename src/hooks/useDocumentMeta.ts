import { useEffect } from 'react';
import { useLanguage } from './useLanguage';

export function useDocumentMeta(title: string, description?: string) {
  const { lang } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
    if (title) {
      document.title = title;
    }
    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      }
    }
  }, [title, description, lang]);
}

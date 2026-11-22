import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import { useLanguage } from '../hooks/useLanguage';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath } = useLanguage();

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t('notFound.title')} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-6xl font-bold text-[#F47125] tabular-nums">{t('notFound.code')}</p>
        <h1 className="mt-4 text-2xl font-bold text-[#0F1A2C] sm:text-3xl">
          {t('notFound.title')}
        </h1>
        <p className="mt-2.5 text-base text-[#5B6577]">{t('notFound.description')}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to={localizedPath('/')}>
            <Button>{t('notFound.homeCta')}</Button>
          </Link>
          <Link to={localizedPath('/shop')}>
            <Button variant="outline">{t('notFound.shopCta')}</Button>
          </Link>
        </div>
      </div>
    </>
  );
};

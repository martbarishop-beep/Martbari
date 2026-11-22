import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, Button } from '../components/ui';
import { useLanguage } from '../hooks/useLanguage';

interface PlaceholderPageProps {
  titleKey: string;
  descriptionKey: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  titleKey,
  descriptionKey,
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath } = useLanguage();
  const params = useParams();

  const paramContext = params.slug ?? params.orderNumber ?? '';

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t(titleKey)} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: localizedPath('/') },
            { label: t(titleKey) },
          ]}
        />

        <div className="mt-6 rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-8 sm:p-10">
          <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">{t(titleKey)}</h1>
          {paramContext && (
            <p className="mt-2 text-sm font-medium text-[#D95F18] tabular-nums">{paramContext}</p>
          )}
          <p className="mt-3 max-w-2xl text-base text-[#5B6577]">{t(descriptionKey)}</p>
          <p className="mt-2 text-xs text-[#5B6577]">{t('placeholder.stepNote')}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={localizedPath('/')}>
              <Button>{t('placeholder.backHome')}</Button>
            </Link>
            <Link to={localizedPath('/shop')}>
              <Button variant="outline">{t('placeholder.browseShop')}</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

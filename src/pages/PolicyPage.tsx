import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Breadcrumb, Skeleton } from '../components/ui';
import { EDITORIAL_DEMO_IMAGES } from '../config/demoImages';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../lib/supabase';
import type { PageContent } from '../types';

interface PolicyPageProps {
  slug: 'about' | 'return-policy' | 'privacy-policy' | 'terms';
  fallbackTitleKey: string;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ slug, fallbackTitleKey }) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();
  const [page, setPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase
          .from('pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (active && data) {
          setPage(data as PageContent);
        }
      } catch {
        // Fallback to i18n text
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPage();
    return () => {
      active = false;
    };
  }, [slug]);

  const title = tField(page, 'title') || t(fallbackTitleKey);
  const body = tField(page, 'content') || t('placeholder.stepNote');

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {title} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Breadcrumb
          items={[{ label: t('nav.home'), to: localizedPath('/') }, { label: title }]}
        />

        <div className="mt-6 rounded-2xl border border-[#17263E]/10 bg-white p-6 sm:p-10 shadow-soft">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton variant="text" />
              <Skeleton variant="text" className="w-5/6" />
              <Skeleton variant="text" className="w-2/3" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">{title}</h1>

              {slug === 'about' && !heroImgError && (
                <div className="mt-5 aspect-[16/7] w-full overflow-hidden rounded-2xl border border-[#17263E]/10 bg-[#F5F7FA]">
                  <img
                    src={EDITORIAL_DEMO_IMAGES.aboutHero}
                    alt={title}
                    width={1200}
                    height={525}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="mt-5 space-y-4 text-base leading-relaxed text-[#5B6577] whitespace-pre-line">
                {body}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

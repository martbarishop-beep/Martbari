import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Breadcrumb, Skeleton } from '../components/ui';
import { EDITORIAL_DEMO_IMAGES } from '../config/demoImages';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import {
  buildBreadcrumbJsonLd,
  cleanMetaDescription,
  resolveCanonicalOrigin,
} from '../lib/seo';
import { supabase } from '../lib/supabase';
import type { PageContent } from '../types';

interface PolicyPageProps {
  slug: 'about' | 'return-policy' | 'privacy-policy' | 'terms';
  fallbackTitleKey: string;
}

const POLICY_FALLBACK_COPY: Record<
  PolicyPageProps['slug'],
  { bn: string; en: string }
> = {
  about: {
    bn: 'মার্টবাড়ি (MartBari) বাংলাদেশের একটি বিশ্বস্ত অনলাইন ইলেকট্রনিক্স, স্মার্ট গ্যাজেট ও হোম অ্যাপ্লায়েন্স স্টোর। প্রতিটি পণ্য যাচাইকৃত মান ও ওয়ারেন্টিসহ সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারিতে পৌঁছে দেওয়া হয়।',
    en: 'MartBari is a trusted Bangladeshi online store for curated electronics, smart gadgets, and home appliances, delivered nationwide with Cash on Delivery and verified warranty support.',
  },
  'return-policy': {
    bn: 'পণ্য হাতে পাওয়ার ৭ দিনের মধ্যে কোনো উৎপাদনজনিত ত্রুটি বা ভুল পণ্য পেলে আমাদের কাস্টমার কেয়ারে যোগাযোগ করলে দ্রুত রিটার্ন বা রিপ্লেসমেন্ট সুবিধা পাবেন।',
    en: 'If you receive a defective or incorrect product, contact our support team within 7 days of delivery for a prompt return or replacement.',
  },
  'privacy-policy': {
    bn: 'অর্ডার প্রসেসিং ও কুরিয়ার ডেলিভারির প্রয়োজনে সংগৃহীত আপনার নাম, ফোন নম্বর ও ঠিকানা সম্পূর্ণ নিরাপদ রাখা হয় এবং তৃতীয় পক্ষের সাথে শেয়ার করা হয় না।',
    en: 'Your name, phone number, and delivery address are collected strictly for order fulfillment and courier delivery and are never sold or shared with unauthorized third parties.',
  },
  terms: {
    bn: 'মার্টবাড়ি থেকে অর্ডার করার মাধ্যমে আপনি আমাদের ডেলিভারি চার্জ (ঢাকায় ৳৭০, বাইরে ৳১৩০ এবং ৳৩,০০০+ অর্ডারে ফ্রি), পেমেন্ট ও ৭ দিনের রিপ্লেসমেন্ট শর্তাবলীতে সম্মত হচ্ছেন।',
    en: 'By placing an order on MartBari, you agree to our standard delivery terms (৳70 inside Dhaka, ৳130 outside Dhaka, free on ৳3,000+ orders), payment verification, and 7-day replacement terms.',
  },
};

export const PolicyPage: React.FC<PolicyPageProps> = ({ slug, fallbackTitleKey }) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();
  const { settings } = useSettings();
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
        // Fallback to bilingual text
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPage();
    return () => {
      active = false;
    };
  }, [slug]);

  const storeDisplayName =
    (lang === 'bn' ? settings.store_name_bn : settings.store_name_en) || t('brand.name');
  const title = tField(page, 'title') || t(fallbackTitleKey);
  const body = tField(page, 'content') || POLICY_FALLBACK_COPY[slug][lang];

  const siteOrigin = resolveCanonicalOrigin();
  const canonicalUrl = `${siteOrigin}/${lang}/${slug}`;
  const pageTitle = `${title} — ${storeDisplayName}`;
  const pageDescription = cleanMetaDescription(body);
  const ogImageUrl =
    slug === 'about' ? EDITORIAL_DEMO_IMAGES.aboutHero : `${siteOrigin}/pwa-512x512.png`;

  const breadcrumbJsonLd = useMemo(
    () =>
      buildBreadcrumbJsonLd(
        [
          { name: t('nav.home'), url: `/${lang}` },
          { name: title, url: `/${lang}/${slug}` },
        ],
        siteOrigin,
      ),
    [lang, siteOrigin, slug, t, title],
  );

  const webPageJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': slug === 'about' ? 'AboutPage' : 'WebPage',
      name: title,
      description: pageDescription,
      url: canonicalUrl,
      inLanguage: lang,
    }),
    [canonicalUrl, lang, pageDescription, slug, title],
  );

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow, max-snippet:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="bn" href={`${siteOrigin}/bn/${slug}`} />
        <link rel="alternate" hrefLang="en" href={`${siteOrigin}/en/${slug}`} />
        <link rel="alternate" hrefLang="x-default" href={`${siteOrigin}/bn/${slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={storeDisplayName} />
        <meta property="og:locale" content={lang === 'bn' ? 'bn_BD' : 'en_US'} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(webPageJsonLd)}</script>
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

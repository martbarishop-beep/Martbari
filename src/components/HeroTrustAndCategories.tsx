import React, { useEffect, useMemo, useState } from 'react';
import {
  Headphones,
  Home,
  Lightbulb,
  Package,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Truck,
  Watch,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { buildResponsiveCardSources } from '../lib/imageUrls';
import { cn } from '../lib/utils';
import type { Category } from '../types';
import { Skeleton } from './ui';

export type CategoryStripItem = Pick<
  Category,
  'id' | 'name_bn' | 'name_en' | 'slug' | 'image_url'
>;

interface HeroTrustAndCategoriesProps {
  categories: CategoryStripItem[];
  loading: boolean;
}

function getCategoryIcon(slug: string) {
  const key = slug.toLowerCase();
  if (key.includes('watch')) return Watch;
  if (key.includes('headphone') || key.includes('earbud') || key.includes('audio')) return Headphones;
  if (key.includes('home') || key.includes('appliance')) return Home;
  if (key.includes('light') || key.includes('lamp')) return Lightbulb;
  if (key.includes('mobile') || key.includes('accessor')) return Smartphone;
  return Package;
}

const CategoryCircleMedia: React.FC<{
  src?: string | null;
  alt: string;
  slug: string;
}> = ({ src, alt, slug }) => {
  const [hasError, setHasError] = useState(false);
  const sources = useMemo(() => buildResponsiveCardSources(src, '92px'), [src]);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const FallbackIcon = getCategoryIcon(slug);

  if (!sources.src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#FFF6F0] to-[#F3F6FA] text-[#17263E]">
        <FallbackIcon className="h-8 w-8 text-[#F47125]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <picture className="block h-full w-full overflow-hidden rounded-full bg-[#F8FAFC]">
      {sources.avifSrcSet && (
        <source type="image/avif" srcSet={sources.avifSrcSet} sizes={sources.sizes} />
      )}
      {sources.webpSrcSet && (
        <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sources.sizes} />
      )}
      <img
        src={sources.src}
        alt={alt}
        width={84}
        height={84}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
    </picture>
  );
};

export const HeroTrustAndCategories: React.FC<HeroTrustAndCategoriesProps> = ({
  categories,
  loading,
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();
  const isBangla = lang === 'bn';

  const stripCategories = useMemo(() => categories.slice(0, 6), [categories]);

  const trustItems = [
    {
      key: 'cod',
      icon: Truck,
      title: t('home.trustBarCodTitle'),
      desc: t('home.trustBarCodDesc'),
      isAuthentic: false,
    },
    {
      key: 'return',
      icon: RotateCcw,
      title: t('home.trustBarReturnTitle'),
      desc: t('home.trustBarReturnDesc'),
      isAuthentic: false,
    },
    {
      key: 'authentic',
      icon: ShieldCheck,
      title: t('home.trustBarAuthenticTitleRest'),
      desc: t('home.trustBarAuthenticDesc'),
      isAuthentic: true,
    },
    {
      key: 'fast',
      icon: Zap,
      title: t('home.trustBarFastTitle'),
      desc: t('home.trustBarFastDesc'),
      isAuthentic: false,
    },
  ];

  return (
    <section
      data-lang={lang}
      aria-label={t('home.popularStripTitle')}
      className="trust-strip-band relative z-20 overflow-visible bg-gradient-to-b from-[#F4F7FA] via-[#F8FAFC] to-white pb-10 sm:pb-12"
    >
      {/* 1. FLOATING TRUST BAR */}
      <div className="relative z-20 mx-auto -mt-5 max-w-[1440px] px-4 overflow-visible sm:-mt-[34px] sm:px-6 lg:px-8">
        <div className="overflow-visible rounded-[18px] border border-[#17263E]/6 bg-white px-3.5 py-3.5 shadow-[0_14px_38px_-12px_rgba(15,26,44,0.12)] sm:px-5 sm:py-4 lg:px-4 lg:py-[18px]">
          <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[#17263E]/10">
            {trustItems.map(({ key, icon: Icon, title, desc, isAuthentic }) => (
              <div
                key={key}
                className="flex items-center gap-2.5 overflow-visible sm:gap-3.5 lg:px-5 lg:first:pl-2 lg:last:pr-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] text-[#F47125] sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1 overflow-visible">
                  <h3
                    className={cn(
                      'h-auto overflow-visible py-[1px] text-[12.5px] font-bold text-[#0F1A2C] sm:text-[14.5px]',
                      isBangla ? 'leading-[1.45]' : 'leading-[1.3]',
                    )}
                  >
                    {isAuthentic ? (
                      <>
                        <span className="font-poppins-en tabular-nums">100%</span>{' '}
                        <span>{title}</span>
                      </>
                    ) : (
                      title
                    )}
                  </h3>
                  <p
                    className={cn(
                      'mt-0.5 hidden h-auto overflow-visible py-[1px] text-[12px] text-[#5B6577] sm:block',
                      isBangla ? 'leading-[1.45]' : 'leading-[1.35]',
                    )}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. POPULAR CATEGORY STRIP */}
      {(loading || stripCategories.length > 0) && (
        <div className="mx-auto mt-9 max-w-[1440px] px-4 overflow-visible sm:mt-11 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 overflow-visible">
            <div className="min-w-0 overflow-visible">
              <h2
                className={cn(
                  'h-auto overflow-visible py-[2px] text-xl font-bold tracking-tight text-[#0F1A2C] sm:text-[26px]',
                  isBangla ? 'leading-[1.42]' : 'leading-[1.25]',
                )}
              >
                {t('home.popularStripTitle')}
              </h2>
              <p
                className={cn(
                  'mt-0.5 h-auto overflow-visible py-[1px] text-xs text-[#5B6577] sm:text-sm',
                  isBangla ? 'leading-[1.45]' : 'leading-[1.35]',
                )}
              >
                {t('home.popularStripSubtitle')}
              </p>
            </div>

            <Link
              to={localizedPath('/shop')}
              className={cn(
                'inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap text-sm font-semibold text-[#F47125] transition-colors hover:text-[#D95F18]',
                isBangla ? 'leading-[1.4]' : 'leading-[1.3]',
              )}
            >
              {t('home.viewAll')} →
            </Link>
          </div>

          <div className="-mx-4 mt-5 flex gap-3.5 overflow-x-auto px-4 py-2 snap-x snap-mandatory no-scrollbar sm:mt-7 md:mx-0 md:grid md:grid-cols-6 md:gap-5 md:overflow-visible md:px-0 md:py-1">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex w-[96px] shrink-0 snap-start flex-col items-center md:w-auto md:shrink"
                  >
                    <Skeleton className="h-[84px] w-[84px] rounded-full sm:h-[92px] sm:w-[92px]" />
                    <Skeleton className="mt-3 h-4 w-20 rounded-md" />
                  </div>
                ))
              : stripCategories.map((cat) => {
                  const label = tField(cat, 'name');
                  return (
                    <Link
                      key={cat.id}
                      to={localizedPath(`/category/${cat.slug}`)}
                      className="group flex w-[96px] shrink-0 snap-start flex-col items-center overflow-visible text-center focus-visible:outline-none md:w-auto md:shrink"
                    >
                      <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#17263E]/6 bg-white p-2 shadow-[0_10px_28px_-10px_rgba(15,26,44,0.14)] transition-all duration-200 group-hover:-translate-y-1.5 group-hover:scale-105 group-hover:border-[#F47125] group-hover:shadow-[0_14px_30px_-10px_rgba(244,113,37,0.28)] group-focus-visible:border-[#F47125] sm:h-[92px] sm:w-[92px]">
                        <CategoryCircleMedia src={cat.image_url} alt={label} slug={cat.slug} />
                      </div>
                      <span
                        className={cn(
                          'mt-2.5 h-auto overflow-visible px-0.5 py-[2px] text-[13px] font-semibold text-[#0F1A2C] transition-colors group-hover:text-[#F47125] sm:mt-3 sm:text-sm',
                          isBangla ? 'leading-[1.45]' : 'leading-[1.3]',
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}
          </div>
        </div>
      )}
    </section>
  );
};

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
  const sources = useMemo(() => buildResponsiveCardSources(src, '76px'), [src]);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const FallbackIcon = getCategoryIcon(slug);

  if (!sources.src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-white/90">
        <FallbackIcon className="h-6 w-6 sm:h-7 sm:w-7 text-[#FF9D5C]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <picture className="block h-full w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
      {sources.avifSrcSet && (
        <source type="image/avif" srcSet={sources.avifSrcSet} sizes={sources.sizes} />
      )}
      {sources.webpSrcSet && (
        <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sources.sizes} />
      )}
      <img
        src={sources.src}
        alt={alt}
        width={72}
        height={72}
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
      className="trust-strip-band relative z-20 overflow-visible bg-[var(--navy)] py-5 text-white sm:py-7"
    >
      <div className="mx-auto max-w-[1440px] px-4 overflow-visible sm:px-6 lg:px-8">
        {/* 1. SLIM TRANSLUCENT TRUST BAR */}
        <div className="overflow-visible rounded-[14px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[rgba(255,255,255,0.12)]">
            {trustItems.map(({ key, icon: Icon, title, desc, isAuthentic }) => (
              <div
                key={key}
                className="flex items-center gap-2.5 overflow-visible sm:gap-3 lg:px-4 lg:first:pl-1 lg:last:pr-1"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F47125]/18 text-[#F47125] sm:h-[38px] sm:w-[38px]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1 overflow-visible">
                  <h3
                    className={cn(
                      'h-auto overflow-visible text-[13px] font-semibold text-white sm:text-[14.5px]',
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
                      'mt-0.5 hidden h-auto overflow-visible text-[12px] text-[#aeb8d0] lg:block xl:text-[12.5px]',
                      isBangla ? 'leading-[1.42]' : 'leading-[1.35]',
                    )}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. SLIM & COMPACT POPULAR CATEGORY STRIP */}
        {(loading || stripCategories.length > 0) && (
          <div className="mt-5 overflow-visible sm:mt-6">
            <div className="flex items-end justify-between gap-4 overflow-visible">
              <div className="min-w-0 overflow-visible">
                <h2
                  className={cn(
                    'h-auto overflow-visible py-[1px] text-lg font-bold tracking-tight text-white sm:text-[22px]',
                    isBangla ? 'leading-[1.42]' : 'leading-[1.28]',
                  )}
                >
                  {t('home.popularStripTitle')}
                </h2>
                <p
                  className={cn(
                    'mt-0.5 h-auto overflow-visible text-xs text-[#aeb8d0] sm:text-[13px]',
                    isBangla ? 'leading-[1.42]' : 'leading-[1.35]',
                  )}
                >
                  {t('home.popularStripSubtitle')}
                </p>
              </div>

              <Link
                to={localizedPath('/shop')}
                className={cn(
                  'inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap text-xs font-semibold text-[#F47125] transition-colors hover:text-[#FF9D5C] sm:text-sm',
                  isBangla ? 'leading-[1.4]' : 'leading-[1.3]',
                )}
              >
                {t('home.viewAll')} →
              </Link>
            </div>

            <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 py-1.5 snap-x snap-mandatory no-scrollbar sm:mt-5 md:mx-0 md:grid md:grid-cols-6 md:justify-items-center md:gap-4 md:overflow-visible md:px-0 md:py-1">
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex w-[calc((100%-30px)/3.35)] min-w-[82px] max-w-[96px] shrink-0 snap-start flex-col items-center md:w-full md:max-w-none md:shrink"
                    >
                      <Skeleton className="h-16 w-16 rounded-full bg-white/10 sm:h-[74px] sm:w-[74px]" />
                      <Skeleton className="mt-2.5 h-3.5 w-16 rounded bg-white/10" />
                    </div>
                  ))
                : stripCategories.map((cat) => {
                    const label = tField(cat, 'name');
                    return (
                      <Link
                        key={cat.id}
                        to={localizedPath(`/category/${cat.slug}`)}
                        className="group flex w-[calc((100%-30px)/3.35)] min-w-[82px] max-w-[98px] shrink-0 snap-start flex-col items-center overflow-visible text-center focus-visible:outline-none md:w-full md:max-w-none md:shrink"
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-1.5 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#F47125] group-focus-visible:border-[#F47125] sm:h-[74px] sm:w-[74px]">
                          <CategoryCircleMedia src={cat.image_url} alt={label} slug={cat.slug} />
                        </div>
                        <span
                          className={cn(
                            'mt-2 h-auto overflow-visible px-0.5 py-[1px] text-[13px] font-medium text-white transition-colors group-hover:text-[#FF9D5C] sm:text-sm',
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
      </div>
    </section>
  );
};

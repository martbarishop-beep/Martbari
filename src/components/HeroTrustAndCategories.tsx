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
import { theme } from '../config/theme';
import { useLanguage } from '../hooks/useLanguage';
import { buildResponsiveCardSources } from '../lib/imageUrls';
import { cn } from '../lib/utils';
import type { Category } from '../types';
import { HomeSectionHeader } from './HomeSectionHeader';
import { Skeleton } from './ui';

export type CategoryStripItem = Pick<
  Category,
  'id' | 'name_bn' | 'name_en' | 'slug' | 'image_url'
>;

function getCategoryIcon(slug: string) {
  const key = slug.toLowerCase();
  if (key.includes('watch')) return Watch;
  if (key.includes('headphone') || key.includes('earbud') || key.includes('audio')) return Headphones;
  if (key.includes('home') || key.includes('appliance')) return Home;
  if (key.includes('light') || key.includes('lamp')) return Lightbulb;
  if (key.includes('mobile') || key.includes('accessor')) return Smartphone;
  return Package;
}

const CategoryTileMedia: React.FC<{
  src?: string | null;
  alt: string;
  slug: string;
}> = ({ src, alt, slug }) => {
  const [hasError, setHasError] = useState(false);
  const sources = useMemo(
    () => buildResponsiveCardSources(src, '(max-width: 767px) 30vw, 180px'),
    [src],
  );

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const FallbackIcon = getCategoryIcon(slug);

  if (!sources.src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[12px] bg-[#FFF4EC] text-[#F47125]">
        <FallbackIcon className="h-7 w-7" aria-hidden="true" />
      </div>
    );
  }

  return (
    <picture className="block h-full w-full overflow-hidden rounded-[12px] bg-[#FAF8F5]">
      {sources.avifSrcSet && (
        <source type="image/avif" srcSet={sources.avifSrcSet} sizes={sources.sizes} />
      )}
      {sources.webpSrcSet && (
        <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sources.sizes} />
      )}
      <img
        src={sources.src}
        alt={alt}
        width={180}
        height={180}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
        className="desktop-hover-scale h-full w-full object-cover transition-transform duration-200"
      />
    </picture>
  );
};

export const HomeTrustStrip: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    {
      key: 'cod',
      icon: Truck,
      title: t('home.trustStrip.codTitle'),
      subtitle: t('home.trustStrip.codSubtitle'),
    },
    {
      key: 'fast',
      icon: Zap,
      title: t('home.trustStrip.fastTitle'),
      subtitle: t('home.trustStrip.fastSubtitle'),
    },
    {
      key: 'return',
      icon: RotateCcw,
      title: t('home.trustStrip.returnTitle'),
      subtitle: t('home.trustStrip.returnSubtitle'),
    },
    {
      key: 'authentic',
      icon: ShieldCheck,
      title: t('home.trustStrip.authenticTitle'),
      subtitle: t('home.trustStrip.authenticSubtitle'),
    },
  ];

  return (
    <section aria-label={t('home.trustStrip.codTitle')} className="w-full">
      <div className={theme.layout.containerClass}>
        <div
          style={{
            background: `linear-gradient(90deg, ${theme.colors.trustBandOrangeGlow} 0%, rgba(23, 38, 62, 0) 45%), ${theme.colors.trustBandBg}`,
          }}
          className="overflow-hidden rounded-[16px] md:rounded-[20px] border border-white/10 px-3.5 py-4 sm:px-6 sm:py-5 md:px-7 md:py-6"
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4 md:gap-0">
            {items.map(({ key, icon: Icon, title, subtitle }, idx) => (
              <div
                key={key}
                style={
                  idx < items.length - 1
                    ? { borderColor: theme.colors.trustDivider }
                    : undefined
                }
                className={cn(
                  'group flex items-center gap-2.5 sm:gap-3.5 min-w-0',
                  'py-1 md:px-5 md:py-1',
                  idx === 0 && 'md:pl-0',
                  idx === items.length - 1 && 'md:pr-0',
                  idx < items.length - 1 && 'md:border-r',
                )}
              >
                <span
                  style={{ backgroundColor: theme.colors.trustBadgeBg }}
                  className="inline-flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-150 md:group-hover:-translate-y-0.5"
                >
                  <Icon className="h-[18px] w-[18px] md:h-5 md:w-5" strokeWidth={2} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    style={{ color: theme.colors.trustTitle }}
                    className="text-[13px] md:text-[15px] font-bold leading-[1.55] break-words"
                  >
                    {title}
                  </p>
                  <p
                    style={{ color: theme.colors.trustSubtitle }}
                    className="mt-0.5 text-[11.5px] md:text-xs font-normal leading-[1.55] break-words"
                  >
                    {subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

interface ShopByCategorySectionProps {
  categories: CategoryStripItem[];
  loading: boolean;
}

export const HeroTrustAndCategories: React.FC<ShopByCategorySectionProps> = ({
  categories,
  loading,
}) => {
  const { t } = useTranslation();
  const { localizedPath, tField } = useLanguage();
  const tiles = useMemo(() => categories.slice(0, 6), [categories]);

  if (!loading && tiles.length === 0) return null;

  return (
    <section className="w-full">
      <div className={theme.layout.containerClass}>
        <div
          style={{ backgroundColor: theme.colors.sectionOrangeTint }}
          className={theme.layout.homeSectionBoxClass}
        >
          <HomeSectionHeader
            eyebrow={t('home.categoriesEyebrow')}
            title={t('home.categoriesTitle')}
            subtitle={t('home.categoriesSubtitle')}
            viewAllTo={localizedPath('/shop')}
            viewAllLabel={t('home.viewAll')}
          />

          <div className="mt-5 md:mt-7 grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-[16px] border border-[#17263E]/10 bg-white p-2.5 sm:p-4"
                  >
                    <Skeleton className="aspect-square w-full rounded-[12px]" />
                    <Skeleton className="mt-3 h-4 w-3/4 mx-auto rounded" />
                  </div>
                ))
              : tiles.map((cat) => {
                  const name = tField(cat, 'name');
                  return (
                    <Link
                      key={cat.id}
                      to={localizedPath(`/category/${cat.slug}`)}
                      style={{ borderRadius: theme.radii.card }}
                      className="group desktop-card-lift flex flex-col items-center border border-[#17263E]/10 bg-white p-2.5 sm:p-4 text-center"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-[12px]">
                        <CategoryTileMedia src={cat.image_url} alt={name} slug={cat.slug} />
                      </div>
                      <span className="mt-2 sm:mt-2.5 py-0.5 text-xs sm:text-sm font-bold leading-[1.48] text-[#0F1A2C] group-hover:text-[#F47125] line-clamp-2 transition-colors">
                        {name}
                      </span>
                    </Link>
                  );
                })}
          </div>
        </div>
      </div>
    </section>
  );
};

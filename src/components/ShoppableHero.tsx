import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Lightbulb,
  Package,
  Smartphone,
  Watch,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { HERO_BANNER_IMAGES, type DemoCategoryKey } from '../config/demoImages';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { buildResponsiveHeroSources, getOptimalPreloadSrc } from '../lib/heroImages';
import { cn } from '../lib/utils';
import type { ProductReviewStats, StorefrontProduct } from './QuickViewModal';
import { Button } from './ui';

const LazyHeroQuickOrderModal = lazy(() =>
  import('./HeroQuickOrderModal').then((m) => ({ default: m.HeroQuickOrderModal })),
);

export interface ShoppableHeroSlide {
  id: string;
  imageUrl: string;
  labelBn: string;
  labelEn: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  priceBadgeBn: string;
  priceBadgeEn: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  secondaryCtaBn: string;
  secondaryCtaEn: string;
  linkUrl: string;
  secondaryLinkUrl: string;
  categoryKey: DemoCategoryKey;
  product?: StorefrontProduct | null;
  reviewStats?: ProductReviewStats | null;
}

interface ShoppableHeroProps {
  slides: ShoppableHeroSlide[];
  storeDisplayName: string;
  prefersReducedMotion: boolean;
}

function getHeroFallbackIcon(categoryKey: DemoCategoryKey) {
  switch (categoryKey) {
    case 'smart-watches':
      return Watch;
    case 'headphones':
    case 'earbuds':
      return Headphones;
    case 'lighting':
      return Lightbulb;
    case 'home-appliances':
      return Zap;
    case 'mobile-accessories':
      return Smartphone;
    default:
      return Package;
  }
}

interface HeroResponsivePictureProps {
  src: string;
  alt: string;
  eager: boolean;
  categoryKey: DemoCategoryKey;
  className?: string;
  onImageReady?: () => void;
}

const HeroResponsivePicture: React.FC<HeroResponsivePictureProps> = ({
  src,
  alt,
  eager,
  categoryKey,
  className,
  onImageReady,
}) => {
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const fallbackSrc = HERO_BANNER_IMAGES[categoryKey] || '';
  const effectiveSrc =
    !src || src.startsWith('/src/') || useFallback ? fallbackSrc : src;

  const sources = useMemo(() => buildResponsiveHeroSources(effectiveSrc), [effectiveSrc]);
  const FallbackIcon = getHeroFallbackIcon(categoryKey);

  useEffect(() => {
    setHasError(false);
    setUseFallback(false);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      onImageReady?.();
    }
  }, [effectiveSrc, onImageReady]);

  if (!effectiveSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#233759]"
      >
        <div
          aria-hidden="true"
          className="absolute right-12 top-12 h-56 w-56 rounded-full bg-[#F47125]/18 blur-3xl"
        />
        <div className="relative hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#FF9D5C] backdrop-blur-sm">
          <FallbackIcon className="h-9 w-9" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#101C30]">
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#1E3252] transition-opacity duration-300',
          isLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      <picture className="block h-full w-full">
        {sources.avifSrcSet && (
          <source type="image/avif" srcSet={sources.avifSrcSet} sizes="100vw" />
        )}
        {sources.webpSrcSet && (
          <source type="image/webp" srcSet={sources.webpSrcSet} sizes="100vw" />
        )}
        <img
          ref={imgRef}
          src={sources.src}
          srcSet={sources.webpSrcSet}
          sizes="100vw"
          alt={alt}
          width={1920}
          height={520}
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          fetchPriority={eager ? 'high' : 'low'}
          referrerPolicy="no-referrer"
          onLoad={() => {
            setIsLoaded(true);
            onImageReady?.();
          }}
          onError={() => {
            if (!useFallback && fallbackSrc && effectiveSrc !== fallbackSrc) {
              setUseFallback(true);
              setIsLoaded(false);
            } else {
              setHasError(true);
              onImageReady?.();
            }
          }}
          className={cn(
            'h-full w-full object-cover object-center md:object-[68%_center] transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
        />
      </picture>
    </div>
  );
};

export const ShoppableHero: React.FC<ShoppableHeroProps> = ({
  slides,
  storeDisplayName,
  prefersReducedMotion,
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField, formatPrice } = useLanguage();
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [firstSlideReady, setFirstSlideReady] = useState(slides.length === 0);
  const [unlockedSlides, setUnlockedSlides] = useState<number[]>([0]);
  const [quickOrderProduct, setQuickOrderProduct] = useState<StorefrontProduct | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  const firstSlide = slides[0] ?? null;
  const firstPreloadSources = useMemo(() => {
    const raw = firstSlide?.imageUrl;
    const safeUrl =
      raw && !raw.startsWith('/src/')
        ? raw
        : firstSlide
        ? HERO_BANNER_IMAGES[firstSlide.categoryKey] || ''
        : '';
    return safeUrl ? buildResponsiveHeroSources(safeUrl) : null;
  }, [firstSlide]);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (firstSlideReady || slides.length <= 1) return;
    const timer = window.setTimeout(() => setFirstSlideReady(true), 2200);
    return () => window.clearTimeout(timer);
  }, [firstSlideReady, slides.length]);

  const handleFirstSlideReady = useCallback(() => {
    setFirstSlideReady(true);
  }, []);

  useEffect(() => {
    setUnlockedSlides((prev) => (prev.includes(activeIndex) ? prev : [...prev, activeIndex]));

    if (!firstSlideReady || slides.length <= 1) return;
    const nextIdx = (activeIndex + 1) % slides.length;
    const nextSlide = slides[nextIdx];

    const scheduleIdle = (cb: () => void): (() => void) => {
      const win = window as Window & {
        requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof win.requestIdleCallback === 'function') {
        const id = win.requestIdleCallback(cb, { timeout: 1200 });
        return () => win.cancelIdleCallback?.(id);
      }
      const id = window.setTimeout(cb, 300);
      return () => window.clearTimeout(id);
    };

    const cancel = scheduleIdle(() => {
      setUnlockedSlides((prev) => (prev.includes(nextIdx) ? prev : [...prev, nextIdx]));
      const rawNext = nextSlide?.imageUrl;
      const safeNext =
        rawNext && !rawNext.startsWith('/src/')
          ? rawNext
          : nextSlide
          ? HERO_BANNER_IMAGES[nextSlide.categoryKey] || ''
          : '';
      if (safeNext) {
        const optimal = getOptimalPreloadSrc(buildResponsiveHeroSources(safeNext));
        if (optimal && !preloadedUrlsRef.current.has(optimal)) {
          preloadedUrlsRef.current.add(optimal);
          const preloader = new Image();
          preloader.decoding = 'async';
          preloader.referrerPolicy = 'no-referrer';
          preloader.src = optimal;
        }
      }
    });

    return cancel;
  }, [activeIndex, firstSlideReady, slides]);

  const autoplayPaused =
    slides.length <= 1 ||
    prefersReducedMotion ||
    isHovered ||
    isFocused ||
    isTouching ||
    Boolean(quickOrderProduct);

  // Auto-play every 4.5 seconds (pauses on hover, focus, touch & prefers-reduced-motion)
  useEffect(() => {
    if (autoplayPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoplayPaused, slides.length]);

  const handlePrevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const handleNextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    setIsTouching(false);

    if (startX === null || endX === null || slides.length <= 1) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;

    if (delta < 0) {
      handleNextSlide();
    } else {
      handlePrevSlide();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slides.length <= 1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNextSlide();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevSlide();
    }
  };

  const handleFocusCapture = () => setIsFocused(true);
  const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsFocused(false);
    }
  };

  const handleSlideBuyNow = useCallback(
    (slide: ShoppableHeroSlide) => {
      if (slide.product) {
        setQuickOrderProduct(slide.product);
      } else {
        navigate(localizedPath(slide.linkUrl || '/shop'));
      }
    },
    [localizedPath, navigate],
  );

  const activeSlide = slides[activeIndex] ?? slides[0] ?? null;

  return (
    <>
      <Helmet>
        {firstPreloadSources?.src && (
          <link
            rel="preload"
            as="image"
            href={firstPreloadSources.src}
            imageSrcSet={firstPreloadSources.webpSrcSet}
            imageSizes="100vw"
          />
        )}
      </Helmet>

      <section
        aria-label={t('hero.kicker')}
        className="relative w-full overflow-hidden bg-[#0F1A2C] text-white"
      >
        {slides.length > 0 && activeSlide ? (
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label={t('hero.kicker')}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={handleFocusCapture}
            onBlur={handleBlurCapture}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative h-[270px] sm:h-[280px] md:h-[330px] lg:h-[370px] xl:h-auto xl:aspect-[10/3] xl:min-h-[400px] xl:max-h-[420px] w-full select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F47125]"
          >
            {/* Full-Width High-Res Background Product Slides with Smooth Fade + Scale Transition */}
            {slides.map((slide, index) => {
              const isActive = index === activeIndex;
              const shouldMountMedia = index === 0 || unlockedSlides.includes(index);
              const product = slide.product ?? null;
              const slideAlt =
                (product ? tField(product, 'name') : '') ||
                (lang === 'bn' ? slide.titleBn : slide.titleEn);

              return (
                <div
                  key={slide.id}
                  aria-hidden={!isActive}
                  className={cn(
                    'absolute inset-0 transition-all duration-700 ease-out',
                    isActive
                      ? 'z-10 opacity-100 scale-100'
                      : 'z-0 opacity-0 scale-[1.03] pointer-events-none',
                    prefersReducedMotion && 'transition-opacity scale-100',
                  )}
                >
                  {shouldMountMedia ? (
                    <HeroResponsivePicture
                      src={slide.imageUrl}
                      alt={slideAlt}
                      eager={index === 0}
                      categoryKey={slide.categoryKey}
                      onImageReady={index === 0 ? handleFirstSlideReady : undefined}
                      className={cn(
                        isActive && !prefersReducedMotion ? 'animate-hero-ken-burns' : '',
                      )}
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#1E3252]" />
                  )}
                </div>
              );
            })}

            {/* Mobile: Bottom-Only Gradient Scrim (Top of Photo Stays Clear) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[64%] bg-gradient-to-t from-[#091220]/94 via-[#0F1A2C]/68 to-transparent md:hidden"
            />
            {/* Tablet/Desktop: Left-Only Gradient Scrim (Right Product Showcase Stays 100% Clear) */}
            <div
              aria-hidden="true"
              className="pointer-events-none hidden md:block absolute inset-y-0 left-0 z-20 w-[62%] bg-gradient-to-r from-[#091220]/92 via-[#0F1A2C]/68 to-transparent"
            />

            {/* Foreground Product Information (Mobile: Bottom-Left, Desktop: Vertically Centered Left 45-50%) */}
            <div className="relative z-30 mx-auto flex h-full max-w-[1440px] items-end pb-9 sm:pb-10 md:items-center md:pb-8 px-11 sm:px-14 md:px-16 lg:px-20">
              {(() => {
                const product = activeSlide.product ?? null;
                const productName =
                  (product ? tField(product, 'name') : '') ||
                  (lang === 'bn' ? activeSlide.titleBn : activeSlide.titleEn);
                const shortDesc =
                  (product ? tField(product, 'short_desc') : '') ||
                  (lang === 'bn' ? activeSlide.subtitleBn : activeSlide.subtitleEn);
                const priceBadgeText =
                  lang === 'bn' ? activeSlide.priceBadgeBn : activeSlide.priceBadgeEn;

                const hasSale = Boolean(
                  product &&
                    product.sale_price !== null &&
                    product.sale_price > 0 &&
                    product.sale_price < product.price,
                );
                const currentPrice = product
                  ? Number(hasSale ? product.sale_price! : product.price)
                  : null;
                const discountPercent =
                  product && hasSale
                    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
                    : 0;
                const inStock = product ? !product.track_stock || product.stock > 0 : true;
                const detailHref = localizedPath(
                  product ? `/product/${product.slug}` : activeSlide.linkUrl || '/shop',
                );

                return (
                  <div
                    key={activeSlide.id}
                    className={cn(
                      'flex w-full md:max-w-[48%] lg:max-w-[46%] flex-col items-start gap-1.5 sm:gap-2 md:gap-2.5',
                      !prefersReducedMotion && 'animate-hero-text-in',
                    )}
                  >
                    {/* Product Name: clamp(1.5rem, 3vw, 2.5rem), 1-2 lines */}
                    <h1 className="w-full text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-[1.18] tracking-tight text-white drop-shadow-xs line-clamp-2">
                      <Link
                        to={detailHref}
                        className="hover:text-[#FF9D5C] transition-colors"
                      >
                        {productName}
                      </Link>
                    </h1>

                    {/* Short Description (1-2 lines max) */}
                    <p className="w-full text-xs sm:text-sm lg:text-[15px] leading-[1.45] text-white/88 line-clamp-1 md:line-clamp-2">
                      {shortDesc}
                    </p>

                    {/* Price + Compact CTA Row */}
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-0.5">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        {currentPrice !== null ? (
                          <>
                            <span className="text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight text-[#FF9D5C] tabular-nums">
                              {formatPrice(currentPrice)}
                            </span>
                            {hasSale && product && (
                              <span className="text-xs sm:text-sm text-white/60 line-through tabular-nums">
                                {formatPrice(Number(product.price))}
                              </span>
                            )}
                            {hasSale && discountPercent > 0 && (
                              <span className="inline-flex items-center rounded bg-[#F47125] px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold leading-none text-white tabular-nums">
                                -{formatNumber(discountPercent, lang)}%
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-base sm:text-lg lg:text-xl font-bold text-[#FF9D5C]">
                            {priceBadgeText}
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={!inStock}
                        onClick={() => handleSlideBuyNow(activeSlide)}
                        className="h-8 sm:h-9 md:h-10 min-h-0 rounded-lg bg-[#F47125] px-3.5 sm:px-5 text-xs sm:text-[13px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(244,113,37,0.55)] hover:bg-[#D95F18] transition-all active:scale-[0.98]"
                        rightIcon={<ArrowRight className="h-3.5 w-3.5 shrink-0" />}
                      >
                        <span>
                          {!inStock ? t('product.outOfStock') : t('hero.shopNow')}
                        </span>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Left & Right Arrow Buttons (Upper Third on Mobile / Vertically Centered on Desktop - Zero Text Overlap) */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label={t('hero.prevSlide')}
                  className="absolute left-1.5 sm:left-3 top-[32%] md:top-1/2 z-30 -translate-y-1/2 inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/25 bg-[#0F1A2C]/55 text-white backdrop-blur-md transition-all hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label={t('hero.nextSlide')}
                  className="absolute right-1.5 sm:right-3 top-[32%] md:top-1/2 z-30 -translate-y-1/2 inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/25 bg-[#0F1A2C]/55 text-white backdrop-blur-md transition-all hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer active:scale-95"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </>
            )}

            {/* Bottom Dot Indicators (Dedicated Bottom Strip Below Content Padding) */}
            {slides.length > 1 && (
              <div
                role="tablist"
                aria-label={t('hero.kicker')}
                className="absolute inset-x-0 bottom-1.5 sm:bottom-2.5 z-30 flex items-center justify-center gap-1"
              >
                {slides.map((slide, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={t('hero.slideLabel', { number: idx + 1 })}
                      onClick={() => setActiveIndex(idx)}
                      className="inline-flex h-7 sm:h-8 min-w-[26px] items-center justify-center px-1 cursor-pointer focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          'block h-1.5 sm:h-2 rounded-full transition-all duration-300',
                          isActive
                            ? 'w-5 sm:w-6 bg-[#F47125] shadow-xs'
                            : 'w-1.5 sm:w-2 bg-white/55 hover:bg-white/85',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Clean Balanced Full-Width Fallback when Demo Data is OFF and no banners exist */
          <div className="relative flex h-[270px] sm:h-[280px] md:h-[330px] lg:h-[370px] xl:h-[410px] w-full items-end pb-9 md:items-center md:pb-0 bg-gradient-to-r from-[#0F1A2C] via-[#17263E] to-[#213659]">
            <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 md:px-14 lg:px-20">
              <div className="flex w-full md:max-w-[48%] lg:max-w-[46%] flex-col items-start gap-2 sm:gap-2.5">
                <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold leading-[1.18] tracking-tight text-white line-clamp-2">
                  {t('hero.title')}
                </h1>
                <p className="text-xs sm:text-sm lg:text-[15px] leading-[1.45] text-white/85 line-clamp-2">
                  {t('hero.subtitle')}
                </p>
                <div className="pt-0.5">
                  <Link to={localizedPath('/shop')} aria-label={storeDisplayName}>
                    <Button
                      size="sm"
                      className="h-9 sm:h-10 min-h-0 rounded-lg bg-[#F47125] px-4 sm:px-5 text-xs sm:text-[13px] font-semibold text-white hover:bg-[#D95F18]"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      {t('hero.shopNow')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {quickOrderProduct && (
        <Suspense fallback={null}>
          <LazyHeroQuickOrderModal
            product={quickOrderProduct}
            isOpen={Boolean(quickOrderProduct)}
            onClose={() => setQuickOrderProduct(null)}
          />
        </Suspense>
      )}
    </>
  );
};

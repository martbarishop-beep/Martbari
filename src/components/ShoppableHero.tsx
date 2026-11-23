import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Lightbulb,
  Package,
  Pause,
  Play,
  ShoppingBag,
  Smartphone,
  Star,
  Truck,
  Watch,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { HERO_BANNER_IMAGES, type DemoCategoryKey } from '../config/demoImages';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
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

function formatTwoDigit(value: number, lang: 'bn' | 'en'): string {
  const padded = String(value).padStart(2, '0');
  if (lang === 'en') return padded;
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return padded.replace(/\d/g, (d) => bnDigits[Number(d)] ?? d);
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
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#122036] via-[#17263E] to-[#233759]"
      >
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#F47125]/18 blur-2xl"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#FF9D5C] backdrop-blur-sm">
          <FallbackIcon className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#111E33]">
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br from-[#101C30] via-[#17263E] to-[#223656] transition-opacity duration-300',
          isLoaded ? 'opacity-0' : 'opacity-100',
        )}
      />

      <picture className="block h-full w-full">
        {sources.avifSrcSet && (
          <source type="image/avif" srcSet={sources.avifSrcSet} sizes={sources.sizes} />
        )}
        {sources.webpSrcSet && (
          <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sources.sizes} />
        )}
        <img
          ref={imgRef}
          src={sources.src}
          srcSet={sources.webpSrcSet}
          sizes={sources.sizes}
          alt={alt}
          width={1280}
          height={720}
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
            'h-full w-full object-cover object-center transition-opacity duration-300',
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
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [firstSlideReady, setFirstSlideReady] = useState(slides.length === 0);
  const [unlockedSlides, setUnlockedSlides] = useState<number[]>([0]);
  const [addedSlideId, setAddedSlideId] = useState<string | null>(null);
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
    isPaused ||
    isHovered ||
    isFocused ||
    isTouching ||
    Boolean(quickOrderProduct);

  useEffect(() => {
    if (autoplayPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [autoplayPaused, slides.length]);

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
      setActiveIndex((prev) => (prev + 1) % slides.length);
    } else {
      setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slides.length <= 1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % slides.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const handleFocusCapture = () => setIsFocused(true);
  const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsFocused(false);
    }
  };

  const handleSlideAddToCart = useCallback(
    (slide: ShoppableHeroSlide) => {
      const product = slide.product;
      if (!product) {
        navigate(localizedPath(slide.linkUrl || '/shop'));
        return;
      }

      const inStock = !product.track_stock || product.stock > 0;
      if (!inStock) return;

      const hasSale =
        product.sale_price !== null &&
        product.sale_price > 0 &&
        product.sale_price < product.price;
      const activePrice = hasSale ? product.sale_price! : product.price;

      addItem(
        {
          productId: product.id,
          slug: product.slug,
          nameBn: product.name_bn,
          nameEn: product.name_en,
          price: Number(activePrice),
          imageUrl: product.image_urls?.[0] || product.image_url || slide.imageUrl || null,
        },
        1,
        false,
      );

      setAddedSlideId(slide.id);
      window.setTimeout(() => {
        setAddedSlideId((curr) => (curr === slide.id ? null : curr));
      }, 1500);

      showToast({
        type: 'success',
        title: t('product.addedToCart'),
        description: tField(product, 'name'),
      });
    },
    [addItem, localizedPath, navigate, showToast, t, tField],
  );

  const handleSlideOrderNow = useCallback(
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
            imageSizes={firstPreloadSources.sizes}
          />
        )}
      </Helmet>

      <section
        aria-label={t('hero.kicker')}
        className="overflow-x-clip bg-[#F5F7FA] py-3 sm:py-4"
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
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
              className="relative overflow-hidden rounded-2xl border border-[#17263E]/10 bg-[#17263E] text-white shadow-[0_18px_44px_-18px_rgba(15,26,44,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F47125] select-none"
            >
              {/* Slim-fit Split Stage: Unobstructed Photo on Top (Mobile) / Right (Desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-12 md:h-[360px] lg:h-[395px] xl:h-[415px]">
                {/* Media Showcase (Top on Mobile, Right on Desktop) */}
                <div className="relative order-1 aspect-[16/9] w-full overflow-hidden bg-[#101C30] md:order-2 md:col-span-6 lg:col-span-6 md:aspect-auto md:h-full">
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
                          'absolute inset-0 transition-opacity duration-500 ease-out',
                          isActive ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
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
                          <div className="h-full w-full bg-gradient-to-br from-[#101C30] via-[#17263E] to-[#233759]" />
                        )}
                      </div>
                    );
                  })}

                  {/* Smooth Navy Seam Blend on Desktop Left Edge + Bottom Edge on Mobile */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-[#17263E] via-[#17263E]/40 to-transparent md:hidden"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none hidden md:block absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#17263E] via-[#17263E]/55 to-transparent"
                  />

                  {/* Top-Right Compact Counter + Discount / Pause Pill on Photo */}
                  <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 md:right-3 md:top-3">
                    {activeSlide.product &&
                      activeSlide.product.sale_price !== null &&
                      activeSlide.product.sale_price > 0 &&
                      activeSlide.product.sale_price < activeSlide.product.price && (
                        <span className="inline-flex h-8 items-center rounded-lg bg-[#F47125] px-2.5 text-xs font-bold text-white shadow-sm tabular-nums">
                          -
                          {formatNumber(
                            Math.round(
                              ((activeSlide.product.price - activeSlide.product.sale_price) /
                                activeSlide.product.price) *
                                100,
                            ),
                            lang,
                          )}
                          %
                        </span>
                      )}

                    {slides.length > 1 && (
                      <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#0F1B30]/75 px-1.5 py-0.5 backdrop-blur-md md:hidden">
                        <span className="px-1.5 text-[11px] font-bold text-white tabular-nums">
                          {formatTwoDigit(activeIndex + 1, lang)}/{formatTwoDigit(slides.length, lang)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsPaused((p) => !p)}
                          aria-label={isPaused ? t('hero.play') : t('hero.pause')}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white hover:text-[#FF9D5C] cursor-pointer"
                        >
                          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Editorial Details & Shoppable Actions (Bottom on Mobile, Left on Desktop) */}
                <div className="relative order-2 flex flex-col justify-center bg-[#17263E] px-4 py-3.5 sm:px-6 sm:py-5 md:order-1 md:col-span-6 lg:col-span-6 md:px-7 lg:px-9 md:py-5">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-[#F47125]/12 blur-3xl"
                  />

                  <div
                    key={activeSlide.id}
                    className={cn(
                      'relative z-10 flex flex-col',
                      !prefersReducedMotion && 'animate-hero-text-in',
                    )}
                  >
                    {(() => {
                      const product = activeSlide.product ?? null;
                      const labelText = lang === 'bn' ? activeSlide.labelBn : activeSlide.labelEn;
                      const headingText = lang === 'bn' ? activeSlide.titleBn : activeSlide.titleEn;
                      const subtitleText =
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
                      const isLowStock = Boolean(
                        product &&
                          product.track_stock &&
                          product.stock > 0 &&
                          product.stock <= (product.low_stock_threshold ?? 5),
                      );
                      const detailHref = localizedPath(
                        product ? `/product/${product.slug}` : activeSlide.linkUrl || '/shop',
                      );
                      const isJustAdded = addedSlideId === activeSlide.id;

                      return (
                        <>
                          {/* Clean Unboxed Kicker + Trust/Rating Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#FF9D5C]">
                              <span className="h-[2px] w-4 rounded-full bg-[#F47125]" aria-hidden="true" />
                              <span>{labelText}</span>
                            </span>

                            {product && isLowStock ? (
                              <span className="text-[11px] font-semibold text-[#FFB484] tabular-nums">
                                {t('product.onlyShort', { count: formatNumber(product.stock, lang) })}
                              </span>
                            ) : activeSlide.reviewStats && activeSlide.reviewStats.count > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFD08A] tabular-nums">
                                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                                <span>{activeSlide.reviewStats.avg.toFixed(1)}</span>
                                <span className="text-white/65">
                                  ({formatNumber(activeSlide.reviewStats.count, lang)})
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/75">
                                <Truck className="h-3.5 w-3.5 text-[#FF9D5C]" aria-hidden="true" />
                                <span>{t('hero.codBadge')}</span>
                              </span>
                            )}
                          </div>

                          {/* Slim-Fit Headline */}
                          <h1 className="mt-1.5 text-lg font-bold leading-[1.32] tracking-tight text-white sm:text-2xl lg:text-[28px] xl:text-[31px] [text-wrap:balance] line-clamp-2">
                            {headingText}
                          </h1>

                          {/* Concise Subtitle (hidden on super tight mobile to keep hero ultra-slim, visible sm+) */}
                          <p className="mt-1 hidden sm:block text-xs lg:text-sm leading-[1.6] text-white/78 line-clamp-2 max-w-xl">
                            {subtitleText}
                          </p>

                          {/* Clean Inline Featured Product & Price Row */}
                          <div className="mt-2.5 sm:mt-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 pt-2.5 sm:pt-3">
                            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                              {currentPrice !== null ? (
                                <>
                                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white tabular-nums">
                                    {formatPrice(currentPrice)}
                                  </span>
                                  {hasSale && product && (
                                    <span className="text-xs sm:text-sm text-white/50 line-through tabular-nums">
                                      {formatPrice(Number(product.price))}
                                    </span>
                                  )}
                                  {hasSale && discountPercent > 0 && (
                                    <span className="hidden md:inline-flex items-center rounded-md bg-[#F47125] px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                                      -{formatNumber(discountPercent, lang)}%
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-base sm:text-lg font-extrabold text-[#FF9D5C] tabular-nums">
                                  {priceBadgeText}
                                </span>
                              )}
                            </div>

                            <Link
                              to={detailHref}
                              className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-[#FF9D5C] hover:text-white transition-colors"
                            >
                              <span className="max-w-[145px] sm:max-w-[200px] truncate">
                                {product ? tField(product, 'name') : t('hero.viewDetails')}
                              </span>
                              <span aria-hidden="true">→</span>
                            </Link>
                          </div>

                          {/* Unified User-Friendly Action Buttons (44px+ touch targets on both Mobile & Desktop) */}
                          <div className="mt-2.5 sm:mt-3.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
                            <Button
                              type="button"
                              size="md"
                              disabled={!inStock}
                              onClick={() => handleSlideOrderNow(activeSlide)}
                              className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#F47125] px-3.5 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#F47125]/25 hover:bg-[#D95F18]"
                              rightIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
                            >
                              <span className="truncate">{t('hero.orderNow')}</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="md"
                              disabled={!inStock}
                              onClick={() => handleSlideAddToCart(activeSlide)}
                              className="min-h-[44px] w-full sm:w-auto rounded-xl border-white/25 bg-white/10 px-3 sm:px-5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 hover:text-white"
                              leftIcon={
                                isJustAdded ? (
                                  <Check className="h-4 w-4 shrink-0 text-[#4ADE80]" />
                                ) : (
                                  <ShoppingBag className="h-4 w-4 shrink-0" />
                                )
                              }
                            >
                              <span className="truncate">
                                {isJustAdded
                                  ? t('hero.addedToCart')
                                  : !inStock
                                  ? t('product.outOfStock')
                                  : t('hero.addToCart')}
                              </span>
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Slim Integrated Footer Bar (Dots on Mobile, Compact Thumbnails + Arrows on Desktop) */}
              {slides.length > 1 && (
                <div className="relative border-t border-white/10 bg-[#121F34]">
                  {/* Mobile Dots */}
                  <div
                    className="flex md:hidden items-center justify-center gap-1 px-4 py-0.5"
                    role="tablist"
                    aria-label={t('hero.kicker')}
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
                          className="inline-flex h-10 min-w-[36px] items-center justify-center cursor-pointer focus-visible:outline-none"
                        >
                          <span
                            className={cn(
                              'block h-1.5 rounded-full transition-all duration-300',
                              isActive ? 'w-6 bg-[#F47125]' : 'w-2 bg-white/35',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Desktop Slim Thumbnail Selector + Controls */}
                  <div className="hidden md:flex items-center justify-between gap-4 px-6 py-2 lg:px-8">
                    <div
                      className="flex items-center gap-2 overflow-x-auto no-scrollbar"
                      role="tablist"
                      aria-label={t('hero.kicker')}
                    >
                      {slides.map((slide, idx) => {
                        const isActive = idx === activeIndex;
                        const label = lang === 'bn' ? slide.labelBn : slide.labelEn;
                        const slideTitle =
                          (slide.product ? tField(slide.product, 'name') : '') || label;
                        const safeThumbUrl =
                          slide.imageUrl && !slide.imageUrl.startsWith('/src/')
                            ? slide.imageUrl
                            : HERO_BANNER_IMAGES[slide.categoryKey] || '';
                        const thumbSources = buildResponsiveHeroSources(safeThumbUrl);
                        const thumbFallback = buildResponsiveHeroSources(
                          HERO_BANNER_IMAGES[slide.categoryKey] || '',
                        ).thumbnailSrc;

                        return (
                          <button
                            key={slide.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-label={t('hero.selectThumbnail', { title: slideTitle })}
                            onClick={() => setActiveIndex(idx)}
                            className={cn(
                              'group flex h-10 items-center gap-2 rounded-xl border px-2 py-1 text-left transition-all cursor-pointer shrink-0',
                              isActive
                                ? 'border-[#F47125] bg-white/12 text-white'
                                : 'border-white/10 bg-white/4 text-white/70 hover:border-white/25 hover:bg-white/8 hover:text-white',
                            )}
                          >
                            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-[#17263E]">
                              {firstSlideReady && thumbSources.thumbnailSrc ? (
                                <img
                                  src={thumbSources.thumbnailSrc}
                                  alt={slideTitle}
                                  width={56}
                                  height={56}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const imgEl = e.currentTarget;
                                    if (thumbFallback && imgEl.src !== thumbFallback) {
                                      imgEl.src = thumbFallback;
                                    }
                                  }}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-[#1D2F4C]" />
                              )}
                            </div>
                            <span className="max-w-[140px] truncate text-xs font-semibold leading-[1.4]">
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="mr-1.5 text-xs font-bold text-white/80 tabular-nums">
                        {formatTwoDigit(activeIndex + 1, lang)} / {formatTwoDigit(slides.length, lang)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPaused((prev) => !prev)}
                        aria-label={isPaused ? t('hero.play') : t('hero.pause')}
                        title={isPaused ? t('hero.play') : t('hero.pause')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-white transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                      >
                        {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
                        }
                        aria-label={t('hero.prevSlide')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-white transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                        aria-label={t('hero.nextSlide')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/6 text-white transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thin Progress Bar */}
                  <div className="h-[2.5px] w-full bg-white/10 overflow-hidden">
                    <div
                      key={`${activeIndex}-${autoplayPaused ? 'paused' : 'run'}`}
                      className={cn(
                        'h-full w-full bg-[#F47125]',
                        !autoplayPaused ? 'animate-hero-progress' : 'w-full opacity-60',
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Clean Slim Fallback when Demo Data is OFF and no custom banners exist */
            <div className="flex min-h-[260px] flex-col justify-center rounded-2xl bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#1E3252] p-6 text-white sm:p-9 shadow-[0_18px_44px_-18px_rgba(15,26,44,0.35)]">
              <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#FF9D5C]">
                <span className="h-[2px] w-4 bg-[#F47125]" aria-hidden="true" />
                <span>{storeDisplayName}</span>
              </p>
              <h1 className="mt-2 max-w-xl text-2xl font-bold leading-[1.3] tracking-tight text-white sm:text-3xl [text-wrap:balance]">
                {t('hero.title')}
              </h1>
              <p className="mt-2 max-w-lg text-xs sm:text-sm leading-[1.6] text-white/80 line-clamp-2">
                {t('hero.subtitle')}
              </p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link to={localizedPath('/shop')} className="w-full sm:w-auto">
                  <Button
                    size="md"
                    className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#F47125] px-6 font-semibold text-white hover:bg-[#D95F18]"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t('hero.shopNow')}
                  </Button>
                </Link>
                <Link to={localizedPath('/track-order')} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="md"
                    className="min-h-[44px] w-full sm:w-auto rounded-xl border-white/30 bg-white/10 px-6 font-semibold text-white hover:bg-white/20"
                  >
                    {t('hero.secondaryCta')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
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

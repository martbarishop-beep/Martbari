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
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0F1B30] via-[#17263E] to-[#24395C]"
      >
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#F47125]/18 blur-2xl"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#FF9D5C] backdrop-blur-sm">
          <FallbackIcon className="h-9 w-9" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0F1B30]">
      {/* Dominant color + blurred glow placeholder until high-res WebP/AVIF paints */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0E192B] via-[#17263E] to-[#233759] transition-opacity duration-300',
          isLoaded ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div className="absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-[#F47125]/16 blur-3xl" />
      </div>

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
  const firstPreloadSources = useMemo(
    () => (firstSlide?.imageUrl ? buildResponsiveHeroSources(firstSlide.imageUrl) : null),
    [firstSlide?.imageUrl],
  );

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  // Safety fallback so secondary slides unlock even if image CDN blocks load event
  useEffect(() => {
    if (firstSlideReady || slides.length <= 1) return;
    const timer = window.setTimeout(() => setFirstSlideReady(true), 2200);
    return () => window.clearTimeout(timer);
  }, [firstSlideReady, slides.length]);

  const handleFirstSlideReady = useCallback(() => {
    setFirstSlideReady(true);
  }, []);

  // Ensure active slide is unlocked & idle-preload ONLY the next slide after first paint
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
      const tid = window.setTimeout(cb, 350);
      return () => window.clearTimeout(tid);
    };

    return scheduleIdle(() => {
      setUnlockedSlides((prev) => (prev.includes(nextIdx) ? prev : [...prev, nextIdx]));
      if (nextSlide?.imageUrl) {
        const optimalSrc = getOptimalPreloadSrc(
          buildResponsiveHeroSources(nextSlide.imageUrl),
        );
        if (optimalSrc && !preloadedUrlsRef.current.has(optimalSrc)) {
          preloadedUrlsRef.current.add(optimalSrc);
          const preloader = new window.Image();
          preloader.decoding = 'async';
          preloader.src = optimalSrc;
        }
      }
    });
  }, [activeIndex, firstSlideReady, slides]);

  const autoplayPaused =
    slides.length <= 1 || isHovered || isFocused || isPaused || isTouching || prefersReducedMotion;

  useEffect(() => {
    if (autoplayPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoplayPaused, slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && slides.length > 1) {
      const delta = touchStartXRef.current - e.changedTouches[0].clientX;
      if (Math.abs(delta) > 40) {
        setActiveIndex((prev) =>
          delta > 0 ? (prev + 1) % slides.length : (prev - 1 + slides.length) % slides.length,
        );
      }
    }
    touchStartXRef.current = null;
    setIsTouching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (slides.length <= 1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % slides.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  const handleFocusCapture = () => {
    setIsFocused(true);
  };

  const handleBlurCapture = (e: React.FocusEvent<HTMLElement>) => {
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
      if (!inStock) {
        navigate(localizedPath(`/product/${product.slug}`));
        return;
      }

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
  const activeProduct = activeSlide?.product ?? null;
  const activeHasSale = Boolean(
    activeProduct &&
      activeProduct.sale_price !== null &&
      activeProduct.sale_price > 0 &&
      activeProduct.sale_price < activeProduct.price,
  );
  const activePrice = activeProduct
    ? Number(activeHasSale ? activeProduct.sale_price! : activeProduct.price)
    : null;
  const activeInStock = activeProduct ? !activeProduct.track_stock || activeProduct.stock > 0 : true;

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
        className="overflow-x-clip border-b border-[#17263E]/10 bg-[#F5F7FA] pt-3 pb-0 md:pt-4 md:pb-6"
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
          {slides.length > 0 ? (
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
              className="relative w-full aspect-[4/5] min-h-[480px] sm:aspect-[16/10] sm:min-h-[460px] lg:aspect-auto lg:h-[540px] xl:h-[570px] rounded-2xl overflow-hidden bg-[#0F1B30] text-white shadow-[0_24px_60px_-20px_rgba(15,26,44,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F47125] select-none"
            >
              {slides.map((slide, index) => {
                const isActive = index === activeIndex;
                const shouldMountMedia = index === 0 || unlockedSlides.includes(index);
                const product = slide.product ?? null;

                const slideAlt =
                  (product ? tField(product, 'name') : '') ||
                  (lang === 'bn' ? slide.titleBn : slide.titleEn);
                const labelText = lang === 'bn' ? slide.labelBn : slide.labelEn;
                const headingText = lang === 'bn' ? slide.titleBn : slide.titleEn;
                const subtitleText =
                  (product ? tField(product, 'short_desc') : '') ||
                  (lang === 'bn' ? slide.subtitleBn : slide.subtitleEn);
                const priceBadgeText = lang === 'bn' ? slide.priceBadgeBn : slide.priceBadgeEn;

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
                  product ? `/product/${product.slug}` : slide.linkUrl || '/shop',
                );
                const isJustAdded = addedSlideId === slide.id;
                const HeadingTag = index === 0 ? 'h1' : 'h2';

                return (
                  <div
                    key={slide.id}
                    aria-hidden={!isActive}
                    className={cn(
                      'absolute inset-0 transition-opacity duration-500 ease-out',
                      isActive ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
                    )}
                  >
                    {/* Background Hero Photography with Gentle Zoom */}
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
                      <div className="h-full w-full bg-gradient-to-br from-[#0E192B] via-[#17263E] to-[#233759]" />
                    )}

                    {/* Soft Navy Gradient Overlays for Contrast & Readability */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#091220]/98 via-[#0F1B30]/75 to-[#17263E]/20 md:hidden"
                    />
                    <div
                      aria-hidden="true"
                      className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#0A1324]/92 via-[#17263E]/68 to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="hidden md:block absolute inset-0 bg-gradient-to-t from-[#091220]/82 via-transparent to-[#091220]/20"
                    />

                    {/* Subtle Glass-Style Shoppable Details Card */}
                    <div className="relative z-10 flex h-full flex-col justify-end px-3.5 pb-12 pt-14 md:justify-center md:px-9 md:pb-24 md:pt-8">
                      <div
                        className={cn(
                          'w-full max-w-[530px] rounded-2xl border border-white/15 bg-[#0F1B30]/68 p-4 sm:p-6 backdrop-blur-md shadow-[0_20px_50px_-14px_rgba(6,12,24,0.65)]',
                          isActive && !prefersReducedMotion ? 'animate-hero-text-in' : '',
                        )}
                      >
                        {/* Top Kicker + Trust Micro-Indicator */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#FF9D5C]">
                            <span className="h-[2px] w-4 rounded-full bg-[#F47125]" aria-hidden="true" />
                            <span>{labelText}</span>
                          </span>

                          {product && isLowStock ? (
                            <span className="text-[11px] font-semibold text-[#FFB484] tabular-nums">
                              {t('product.onlyShort', { count: formatNumber(product.stock, lang) })}
                            </span>
                          ) : slide.reviewStats && slide.reviewStats.count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FFD08A] tabular-nums">
                              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                              <span>{slide.reviewStats.avg.toFixed(1)}</span>
                              <span className="text-white/65">
                                ({formatNumber(slide.reviewStats.count, lang)})
                              </span>
                            </span>
                          ) : (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-white/75">
                              <Truck className="h-3.5 w-3.5 text-[#FF9D5C]" aria-hidden="true" />
                              <span>{t('hero.codBadge')}</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <HeadingTag className="mt-2 text-xl font-bold leading-[1.32] tracking-tight text-white sm:text-3xl lg:text-[34px] [text-wrap:balance]">
                          {headingText}
                        </HeadingTag>

                        {/* Description */}
                        <p className="mt-1.5 text-xs sm:text-sm leading-[1.65] text-white/85 line-clamp-2">
                          {subtitleText}
                        </p>

                        {/* Linked Product Title (if distinct) + Price Block with Discount Badge */}
                        <div className="mt-3 sm:mt-4 rounded-xl border border-white/12 bg-white/8 px-3.5 py-2.5">
                          {product && (
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-white/80">
                              <span className="truncate font-semibold text-white">
                                {tField(product, 'name')}
                              </span>
                              <Link
                                to={detailHref}
                                tabIndex={isActive ? 0 : -1}
                                className="shrink-0 font-semibold text-[#FF9D5C] hover:underline"
                              >
                                {t('hero.viewDetails')} →
                              </Link>
                            </div>
                          )}

                          {currentPrice !== null ? (
                            <div className="flex flex-wrap items-baseline gap-2.5">
                              <span className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white tabular-nums">
                                {formatPrice(currentPrice)}
                              </span>
                              {hasSale && product && (
                                <span className="text-sm text-white/55 line-through tabular-nums">
                                  {formatPrice(Number(product.price))}
                                </span>
                              )}
                              {hasSale && discountPercent > 0 && (
                                <span className="inline-flex items-center rounded-md bg-[#F47125] px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                                  -{formatNumber(discountPercent, lang)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-lg font-extrabold text-[#FF9D5C] tabular-nums">
                              {priceBadgeText}
                            </span>
                          )}
                        </div>

                        {/* Desktop / Tablet Primary Shoppable Buttons (>= 44px) */}
                        <div className="mt-4 hidden md:flex flex-wrap items-center gap-2.5">
                          <Button
                            type="button"
                            size="lg"
                            disabled={!inStock}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => handleSlideOrderNow(slide)}
                            className="min-h-[44px] rounded-xl bg-[#F47125] px-5 text-sm font-semibold text-white shadow-lg shadow-[#F47125]/25 hover:bg-[#D95F18]"
                            rightIcon={<ArrowRight className="h-4 w-4" />}
                          >
                            {t('hero.orderNow')}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            disabled={!inStock}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => handleSlideAddToCart(slide)}
                            className="min-h-[44px] rounded-xl border-white/30 bg-white/12 px-5 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/22 hover:text-white"
                            leftIcon={
                              isJustAdded ? (
                                <Check className="h-4 w-4 text-[#4ADE80]" />
                              ) : (
                                <ShoppingBag className="h-4 w-4" />
                              )
                            }
                          >
                            {isJustAdded
                              ? t('hero.addedToCart')
                              : !inStock
                              ? t('product.outOfStock')
                              : t('hero.addToCart')}
                          </Button>

                          {!product && (
                            <Link
                              to={detailHref}
                              tabIndex={isActive ? 0 : -1}
                              className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-white/85 hover:text-[#FF9D5C]"
                            >
                              {t('hero.viewDetails')} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Top Mobile Status + Pause Pill (Small & Unobtrusive) */}
              {slides.length > 1 && (
                <div className="absolute right-3 top-3 z-20 flex items-center gap-2 md:hidden">
                  <span className="rounded-lg border border-white/15 bg-[#0F1B30]/75 px-2.5 py-1 text-[11px] font-bold text-white tabular-nums backdrop-blur-md">
                    {formatTwoDigit(activeIndex + 1, lang)} / {formatTwoDigit(slides.length, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    aria-label={isPaused ? t('hero.play') : t('hero.pause')}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-[#0F1B30]/75 text-white backdrop-blur-md hover:border-[#F47125] cursor-pointer"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {/* Bottom Controls Overlay */}
              {slides.length > 1 && (
                <div className="absolute inset-x-0 bottom-0 z-20">
                  {/* Mobile Small Pagination Dots (>= 44px tap hitboxes) */}
                  <div
                    className="flex md:hidden items-center justify-center px-4 pb-1"
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
                          className="inline-flex h-11 min-w-[44px] items-center justify-center cursor-pointer focus-visible:outline-none"
                        >
                          <span
                            className={cn(
                              'block h-1.5 rounded-full transition-all duration-300',
                              isActive ? 'w-6 bg-[#F47125]' : 'w-2 bg-white/45',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Desktop Thumbnail Strip + Arrow/Pause Controls */}
                  <div className="hidden md:flex items-end justify-between gap-4 px-8 pb-4 pt-2">
                    {/* Clickable Slide Thumbnails */}
                    <div
                      className="flex items-center gap-2.5 overflow-x-auto no-scrollbar max-w-[78%]"
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
                        const thumbPrice = slide.product
                          ? formatPrice(
                              Number(
                                slide.product.sale_price !== null &&
                                  slide.product.sale_price < slide.product.price
                                  ? slide.product.sale_price
                                  : slide.product.price,
                              ),
                            )
                          : lang === 'bn'
                          ? slide.priceBadgeBn
                          : slide.priceBadgeEn;

                        return (
                          <button
                            key={slide.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-label={t('hero.selectThumbnail', { title: slideTitle })}
                            onClick={() => setActiveIndex(idx)}
                            className={cn(
                              'group flex min-h-[52px] min-w-[112px] lg:min-w-[148px] max-w-[184px] items-center gap-2 lg:gap-2.5 rounded-xl border p-1.5 text-left transition-all cursor-pointer backdrop-blur-md',
                              isActive
                                ? 'border-[#F47125] bg-[#0F1B30]/92 ring-2 ring-[#F47125]/35 shadow-lg'
                                : 'border-white/15 bg-[#0F1B30]/65 hover:border-white/40 hover:bg-[#0F1B30]/82',
                            )}
                          >
                            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-[#17263E]">
                              {firstSlideReady && thumbSources.thumbnailSrc ? (
                                <img
                                  src={thumbSources.thumbnailSrc}
                                  alt={slideTitle}
                                  width={96}
                                  height={80}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    const imgEl = e.currentTarget;
                                    if (thumbFallback && imgEl.src !== thumbFallback) {
                                      imgEl.src = thumbFallback;
                                    }
                                  }}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-[#17263E] to-[#273B5E]" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 pr-1">
                              <p className="truncate text-[11px] font-semibold text-white">
                                {label}
                              </p>
                              <p className="truncate text-[11px] font-bold text-[#FF9D5C] tabular-nums">
                                {thumbPrice}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Counter + Pause + Prev/Next (>= 44px tap targets) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="mr-1 text-xs font-bold text-white/90 tabular-nums">
                        {formatTwoDigit(activeIndex + 1, lang)} / {formatTwoDigit(slides.length, lang)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsPaused((prev) => !prev)}
                        aria-label={isPaused ? t('hero.play') : t('hero.pause')}
                        title={isPaused ? t('hero.play') : t('hero.pause')}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-[#0F1B30]/75 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                      >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
                        }
                        aria-label={t('hero.prevSlide')}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-[#0F1B30]/75 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                        aria-label={t('hero.nextSlide')}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-[#0F1B30]/75 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thin Progress Bar */}
                  <div className="h-[3px] w-full bg-white/15 overflow-hidden">
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
            /* Clean Editorial Fallback when Demo Data is OFF and no custom banners exist */
            <div className="flex min-h-[340px] flex-col justify-center rounded-2xl bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#1E3252] p-6 text-white sm:p-10 shadow-[0_24px_60px_-20px_rgba(15,26,44,0.35)]">
              <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#FF8C47]">
                <span className="h-[2px] w-4 bg-[#F47125]" aria-hidden="true" />
                <span>{storeDisplayName}</span>
              </p>
              <h1 className="mt-2.5 max-w-xl text-2xl font-bold leading-[1.3] tracking-tight text-white sm:text-4xl [text-wrap:balance]">
                {t('hero.title')}
              </h1>
              <p className="mt-2.5 max-w-lg text-xs sm:text-sm leading-[1.65] text-white/80 line-clamp-2">
                {t('hero.subtitle')}
              </p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link to={localizedPath('/shop')} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#F47125] px-6 font-semibold text-white hover:bg-[#D95F18]"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t('hero.shopNow')}
                  </Button>
                </Link>
                <Link to={localizedPath('/track-order')} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[44px] w-full sm:w-auto rounded-xl border-white/30 bg-white/10 px-6 font-semibold text-white hover:bg-white/20"
                  >
                    {t('hero.secondaryCta')}
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sticky Action Bar ("Order Now" + "Add to Cart", >= 44px tap targets, zero horizontal scroll) */}
        {activeSlide && (
          <div className="sticky bottom-0 z-40 mt-3 border-t border-white/15 bg-[#0E192B]/96 px-3 py-2.5 text-white backdrop-blur-lg shadow-[0_-10px_28px_-10px_rgba(8,15,28,0.45)] md:hidden">
            <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!activeInStock}
                onClick={() => handleSlideAddToCart(activeSlide)}
                className="min-h-[44px] w-full rounded-xl border-white/25 bg-white/10 px-2 text-xs font-semibold text-white hover:bg-white/20 hover:text-white"
                leftIcon={
                  addedSlideId === activeSlide.id ? (
                    <Check className="h-4 w-4 shrink-0 text-[#4ADE80]" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 shrink-0" />
                  )
                }
              >
                <span className="truncate">
                  {addedSlideId === activeSlide.id
                    ? t('hero.addedToCart')
                    : !activeInStock
                    ? t('product.outOfStock')
                    : t('hero.addToCart')}
                </span>
              </Button>

              <Button
                type="button"
                disabled={!activeInStock}
                onClick={() => handleSlideOrderNow(activeSlide)}
                className="min-h-[44px] w-full rounded-xl bg-[#F47125] px-2 text-xs font-semibold text-white shadow-sm hover:bg-[#D95F18]"
                rightIcon={<ArrowRight className="h-4 w-4 shrink-0" />}
              >
                <span className="truncate">
                  {t('hero.orderNow')}
                  {activePrice !== null ? ` · ${formatPrice(activePrice)}` : ''}
                </span>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Lazy-Loaded Express Quick Order Modal (deferred out of first-paint bundle) */}
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

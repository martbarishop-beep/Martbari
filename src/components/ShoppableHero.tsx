import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Lightbulb,
  Package,
  Pause,
  Play,
  Smartphone,
  Watch,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HERO_BANNER_IMAGES, type DemoCategoryKey } from '../config/demoImages';
import { theme } from '../config/theme';
import { useLanguage } from '../hooks/useLanguage';
import { buildResponsiveHeroSources, getOptimalPreloadSrc } from '../lib/heroImages';
import { cn } from '../lib/utils';
import type { ProductReviewStats, StorefrontProduct } from './QuickViewModal';

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

interface SlimCoverMediaProps {
  src: string;
  alt: string;
  eager: boolean;
  categoryKey: DemoCategoryKey;
  onImageReady?: () => void;
}

const SlimCoverMedia: React.FC<SlimCoverMediaProps> = ({
  src,
  alt,
  eager,
  categoryKey,
  onImageReady,
}) => {
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const fallbackSrc = HERO_BANNER_IMAGES[categoryKey] || '';
  const effectiveSrc = !src || src.startsWith('/src/') || useFallback ? fallbackSrc : src;

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
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1C2E4B] to-[#0F1A2C]"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#FF9D5C]">
          <FallbackIcon className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#132138]">
      {!isLoaded && (
        <div
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 60% 45%, rgba(244, 113, 37, 0.2) 0%, rgba(28, 46, 75, 0.94) 62%, #101C30 100%)',
          }}
          className="pointer-events-none absolute inset-0 z-0"
        />
      )}

      <picture className="relative z-10 block h-full w-full">
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
          height={400}
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
            eager || isLoaded ? 'opacity-100' : 'opacity-0',
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

  const [activeIndex, setActiveIndex] = useState(0);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isHeroInView, setIsHeroInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [firstSlideReady, setFirstSlideReady] = useState(slides.length === 0);
  const [unlockedSlides, setUnlockedSlides] = useState<number[]>([0]);

  const sectionRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef(false);
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  const firstSlide = slides[0] ?? null;
  const firstPreloadSources = useMemo(() => {
    const raw = firstSlide?.imageUrl || firstSlide?.product?.image_url;
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
    const timer = window.setTimeout(() => setFirstSlideReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, [firstSlideReady, slides.length]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const handleFirstSlideReady = useCallback(() => {
    setFirstSlideReady(true);
  }, []);

  // Unlock active slide & idle-preload only the next slide
  useEffect(() => {
    setUnlockedSlides((prev) => (prev.includes(activeIndex) ? prev : [...prev, activeIndex]));

    if (!firstSlideReady || slides.length <= 1) return;
    const nextIdx = (activeIndex + 1) % slides.length;
    const nextSlide = slides[nextIdx];
    const rawNext = nextSlide?.imageUrl || nextSlide?.product?.image_url;
    const safeNext =
      rawNext && !rawNext.startsWith('/src/')
        ? rawNext
        : nextSlide
        ? HERO_BANNER_IMAGES[nextSlide.categoryKey] || ''
        : '';

    const scheduleIdle = (cb: () => void): (() => void) => {
      const win = window as Window & {
        requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof win.requestIdleCallback === 'function') {
        const id = win.requestIdleCallback(cb, { timeout: 1400 });
        return () => win.cancelIdleCallback?.(id);
      }
      const id = window.setTimeout(cb, 350);
      return () => window.clearTimeout(id);
    };

    return scheduleIdle(() => {
      setUnlockedSlides((prev) => (prev.includes(nextIdx) ? prev : [...prev, nextIdx]));
      if (!safeNext) return;
      const optimal = getOptimalPreloadSrc(buildResponsiveHeroSources(safeNext));
      if (optimal && !preloadedUrlsRef.current.has(optimal)) {
        preloadedUrlsRef.current.add(optimal);
        const img = new Image();
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.src = optimal;
      }
    });
  }, [activeIndex, firstSlideReady, slides]);

  const autoplayPaused =
    slides.length <= 1 ||
    prefersReducedMotion ||
    isManuallyPaused ||
    isHovered ||
    isFocused ||
    isTouching ||
    !isHeroInView ||
    !isPageVisible;

  useEffect(() => {
    if (autoplayPaused) return;
    const timer = window.setInterval(() => {
      if (isHorizontalSwipeRef.current) return;
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [autoplayPaused, slides.length]);

  const handlePrevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const handleNextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    const touch = e.touches[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const touch = e.touches[0];
    if (startX === null || startY === null || !touch) return;

    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx > 14 && dx > dy * 1.35) {
      isHorizontalSwipeRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsTouching(false);
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const wasHorizontal = isHorizontalSwipeRef.current;
    const touch = e.changedTouches[0];

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = false;

    if (!touch || startX === null || startY === null || slides.length <= 1) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!wasHorizontal && Math.abs(dx) <= Math.abs(dy) * 1.45) return;
    if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy) * 1.35) return;

    if (dx < 0) handleNextSlide();
    else handlePrevSlide();
  };

  const handleTouchCancel = () => {
    setIsTouching(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = false;
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
        ref={sectionRef}
        aria-label={storeDisplayName}
        className="w-full"
      >
        <div className={theme.layout.containerClass}>
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label={t('hero.kicker')}
            tabIndex={0}
            style={{ touchAction: 'pan-y' }}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsFocused(false);
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="relative w-full aspect-[15/8] sm:aspect-[21/8] lg:aspect-[16/5] lg:max-h-[385px] overflow-hidden rounded-[16px] md:rounded-[20px] border border-[#17263E]/10 bg-[#17263E] shadow-[0_14px_34px_-14px_rgba(15,26,44,0.22)] focus:outline-none"
          >
            {slides.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-[#17263E] via-[#1E3354] to-[#17263E] px-6 text-center text-white">
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{storeDisplayName}</p>
                  <p className="mt-1 text-xs sm:text-sm text-white/75">{t('brand.tagline')}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Stacked Slim-Fit Cover Slides with Smooth Compositor Fade */}
                {slides.map((slide, index) => {
                  const isActive = index === activeIndex;
                  const shouldMount = index === 0 || unlockedSlides.includes(index);
                  const slideProduct = slide.product ?? null;

                  const labelText = (lang === 'bn' ? slide.labelBn : slide.labelEn).trim();
                  const titleText = (lang === 'bn' ? slide.titleBn : slide.titleEn).trim();
                  const subtitleText = (lang === 'bn' ? slide.subtitleBn : slide.subtitleEn).trim();
                  const priceBadgeText = (lang === 'bn' ? slide.priceBadgeBn : slide.priceBadgeEn).trim();
                  const ctaText = (lang === 'bn' ? slide.primaryCtaBn : slide.primaryCtaEn).trim();

                  const rawLink = (slide.linkUrl || '').trim();
                  const resolvedLink =
                    rawLink || (slideProduct ? `/product/${slideProduct.slug}` : '');
                  const isExternalLink =
                    resolvedLink.startsWith('http://') || resolvedLink.startsWith('https://');

                  const hasSale = Boolean(
                    slideProduct &&
                      slideProduct.sale_price !== null &&
                      slideProduct.sale_price > 0 &&
                      slideProduct.sale_price < slideProduct.price,
                  );
                  const displayPrice = slideProduct
                    ? hasSale
                      ? Number(slideProduct.sale_price)
                      : Number(slideProduct.price)
                    : null;

                  const hasOverlay = Boolean(
                    titleText || subtitleText || ctaText || labelText || slideProduct,
                  );

                  const altText =
                    titleText ||
                    labelText ||
                    (slideProduct ? tField(slideProduct, 'name') : '') ||
                    `${storeDisplayName} ${t('hero.slideLabel', { number: index + 1 })}`;

                  const slideInner = (
                    <>
                      {shouldMount && (
                        <SlimCoverMedia
                          src={slide.imageUrl || slideProduct?.image_url || ''}
                          alt={altText}
                          eager={index === 0}
                          categoryKey={slide.categoryKey}
                          onImageReady={index === 0 ? handleFirstSlideReady : undefined}
                        />
                      )}

                      {hasOverlay && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center bg-gradient-to-r from-[#0F1A2C]/82 via-[#0F1A2C]/45 to-transparent">
                          <div className="max-w-xl px-12 sm:px-16 md:px-20 pb-6 sm:pb-8">
                            {labelText && (
                              <span className="inline-block rounded-full bg-[#F47125] px-2.5 py-1 text-[10px] sm:text-xs font-bold leading-[1.45] text-white">
                                {labelText}
                              </span>
                            )}

                            {(titleText || slideProduct) && (
                              <h2 className="mt-1.5 py-0.5 text-base sm:text-2xl md:text-[28px] lg:text-[34px] font-bold leading-[1.42] text-white line-clamp-2">
                                {titleText || (slideProduct ? tField(slideProduct, 'name') : '')}
                              </h2>
                            )}

                            {subtitleText && (
                              <p className="hidden sm:block mt-1.5 py-0.5 text-xs md:text-sm leading-[1.5] text-white/85 line-clamp-1 max-w-md">
                                {subtitleText}
                              </p>
                            )}

                            {(displayPrice !== null || priceBadgeText || ctaText) && (
                              <div className="mt-2.5 sm:mt-4 flex flex-wrap items-center gap-2.5">
                                {displayPrice !== null ? (
                                  <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs sm:text-sm font-extrabold leading-[1.45] text-[#FF9D5C] tabular-nums">
                                    {formatPrice(displayPrice)}
                                  </span>
                                ) : priceBadgeText ? (
                                  <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs sm:text-sm font-bold leading-[1.45] text-[#FF9D5C]">
                                    {priceBadgeText}
                                  </span>
                                ) : null}

                                {ctaText && (
                                  <span className="inline-flex items-center rounded-full bg-[#F47125] px-3.5 py-1.5 sm:px-5 sm:py-2 text-[11px] sm:text-sm font-bold leading-[1.45] text-white shadow-sm">
                                    {ctaText}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );

                  const slideClasses = cn(
                    'absolute inset-0 block h-full w-full transition-opacity duration-500 ease-out',
                    isActive ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
                  );

                  if (resolvedLink) {
                    if (isExternalLink) {
                      return (
                        <a
                          key={slide.id}
                          href={resolvedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-hidden={!isActive}
                          tabIndex={isActive ? 0 : -1}
                          className={slideClasses}
                        >
                          {slideInner}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={slide.id}
                        to={localizedPath(resolvedLink)}
                        aria-hidden={!isActive}
                        tabIndex={isActive ? 0 : -1}
                        className={slideClasses}
                      >
                        {slideInner}
                      </Link>
                    );
                  }

                  return (
                    <div key={slide.id} aria-hidden={!isActive} className={slideClasses}>
                      {slideInner}
                    </div>
                  );
                })}

                {/* Bottom Contrast Scrim Behind Dots & Pause Button */}
                {slides.length > 1 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-gradient-to-t from-[#0F1A2C]/45 to-transparent"
                  />
                )}

                {/* Left & Right Circular White Navigation Arrows */}
                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      aria-label={t('hero.prevSlide')}
                      className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-[#0F1A2C] shadow-[0_4px_14px_rgba(15,26,44,0.22)] transition-[transform,colors] duration-150 hover:scale-105 hover:bg-[#FFF4EC] hover:text-[#F47125] active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextSlide}
                      aria-label={t('hero.nextSlide')}
                      className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-[#0F1A2C] shadow-[0_4px_14px_rgba(15,26,44,0.22)] transition-[transform,colors] duration-150 hover:scale-105 hover:bg-[#FFF4EC] hover:text-[#F47125] active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" aria-hidden="true" />
                    </button>
                  </>
                )}

                {/* Bottom-Center Dots + Active Elongated White Pill + Circular White Pause/Play Button */}
                {slides.length > 1 && (
                  <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2">
                    <div
                      role="tablist"
                      aria-label={t('hero.kicker')}
                      className="flex items-center gap-0.5 sm:gap-1"
                    >
                      {slides.map((slide, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                          <button
                            key={slide.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-label={t('hero.selectSlide', { number: idx + 1 })}
                            onClick={() => setActiveIndex(idx)}
                            className="inline-flex h-7 items-center justify-center px-1 cursor-pointer"
                          >
                            <span
                              className={cn(
                                'block h-2 rounded-full transition-[width,background-color] duration-200',
                                isActive
                                  ? 'w-6 sm:w-7 bg-white shadow-xs'
                                  : 'w-2 bg-white/55 hover:bg-white/85',
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsManuallyPaused((prev) => !prev)}
                      aria-pressed={isManuallyPaused}
                      aria-label={isManuallyPaused ? t('hero.play') : t('hero.pause')}
                      className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white text-[#0F1A2C] shadow-[0_3px_10px_rgba(15,26,44,0.25)] transition-[transform,colors] duration-150 hover:scale-105 hover:text-[#F47125] active:scale-95 cursor-pointer"
                    >
                      {isManuallyPaused ? (
                        <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current ml-0.5" aria-hidden="true" />
                      ) : (
                        <Pause className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

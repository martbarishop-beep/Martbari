import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Brand } from '../types';
import { cn } from '../lib/utils';
import { ProductCard } from './ProductCard';
import type { ProductReviewStats, StorefrontProduct } from './QuickViewModal';

export interface ProductShelfProps {
  products: StorefrontProduct[];
  brandsMap?: Map<string, Brand>;
  reviewsStatsMap?: Map<string, ProductReviewStats>;
  showFlashProgress?: boolean;
  tone?: 'light' | 'dark';
  viewAllTo?: string;
  viewAllLabel?: string;
}

export const ProductShelf: React.FC<ProductShelfProps> = ({
  products,
  brandsMap,
  reviewsStatsMap,
  showFlashProgress = false,
  tone = 'light',
  viewAllTo,
  viewAllLabel,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 6) {
      setIsOverflowing(false);
      setCanScrollPrev(false);
      setCanScrollNext(false);
      setScrollProgress(0);
      return;
    }
    setIsOverflowing(true);
    setCanScrollPrev(el.scrollLeft > 8);
    setCanScrollNext(el.scrollLeft < maxScroll - 8);
    setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => updateScrollState();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(el);
    } else {
      window.addEventListener('resize', updateScrollState);
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [products.length, updateScrollState]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const isDark = tone === 'dark';

  return (
    <div className="relative">
      {/* Full-bleed horizontal snap carousel on mobile; structured responsive grid on md+ */}
      <div
        ref={scrollRef}
        className={cn(
          '-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scroll-px-4 snap-x snap-mandatory scroll-smooth no-scrollbar touch-pan-x',
          'sm:-mx-6 sm:gap-4 sm:px-6 sm:scroll-px-6',
          'md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 md:overflow-visible md:snap-none',
        )}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[58vw] min-w-[186px] max-w-[232px] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none"
          >
            <ProductCard
              product={product}
              brandsMap={brandsMap}
              reviewStats={reviewsStatsMap?.get(product.id) ?? null}
              showFlashProgress={showFlashProgress}
            />
          </div>
        ))}

        {/* Trailing thumb-friendly View All card at the end of the mobile horizontal scroll */}
        {viewAllTo && products.length >= 2 && (
          <div className="w-[42vw] min-w-[144px] max-w-[176px] shrink-0 snap-start md:hidden">
            <Link
              to={viewAllTo}
              className={cn(
                'flex h-full min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-all active:scale-[0.98]',
                isDark
                  ? 'border-white/15 bg-white/6 text-white hover:bg-white/10'
                  : 'border-[#17263E]/10 bg-[#FAFBFC] text-[#0F1A2C] hover:border-[#F47125]/40 hover:bg-[#FFF8F3]',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-12 w-12 items-center justify-center rounded-full shadow-xs',
                  isDark ? 'bg-[#F47125] text-white' : 'bg-[#17263E] text-white',
                )}
              >
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-[1.4]">
                {viewAllLabel || t('home.viewAll')}
              </span>
              <span
                className={cn(
                  'text-xs font-medium leading-[1.4]',
                  isDark ? 'text-white/70' : 'text-[#64748B]',
                )}
              >
                {t('home.browseMoreProducts')}
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Scroll Indicator & Touch Controls */}
      {isOverflowing && (
        <div className="mt-3 flex items-center justify-between gap-3 md:hidden">
          <div
            aria-hidden="true"
            className={cn(
              'h-1.5 flex-1 max-w-[140px] overflow-hidden rounded-full',
              isDark ? 'bg-white/15' : 'bg-[#17263E]/10',
            )}
          >
            <div
              className="h-full rounded-full bg-[#F47125] transition-transform duration-150"
              style={{
                width: '40%',
                transform: `translateX(${scrollProgress * 150}%)`,
              }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              disabled={!canScrollPrev}
              aria-label={t('home.scrollPrev')}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default',
                isDark
                  ? 'border-white/18 bg-white/10 text-white hover:bg-white/20'
                  : 'border-[#17263E]/12 bg-white text-[#0F1A2C] hover:bg-[#F5F7FA]',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              disabled={!canScrollNext}
              aria-label={t('home.scrollNext')}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default',
                isDark
                  ? 'border-white/18 bg-white/10 text-white hover:bg-white/20'
                  : 'border-[#17263E]/12 bg-white text-[#0F1A2C] hover:bg-[#F5F7FA]',
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

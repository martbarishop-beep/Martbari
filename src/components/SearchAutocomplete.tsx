import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { isDemoCategory, isDemoProduct } from '../config/demoCatalog';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { getCachedActiveCategories } from '../lib/categoryCache';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { Category, ProductImage as DbProductImage, PublicProduct } from '../types';
import { ProductImage } from './ProductImage';

interface SearchResultItem extends PublicProduct {
  image_url?: string | null;
}

export interface SearchAutocompleteProps {
  onSearchSubmit?: () => void;
  className?: string;
  isMobile?: boolean;
  surface?: 'light' | 'dark';
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  onSearchSubmit,
  className,
  isMobile = false,
  surface = 'light',
}) => {
  const { t } = useTranslation();
  const { localizedPath, tField, formatPrice } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const showDemoData = settings.show_demo_data !== false;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [quickCategories, setQuickCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadQuickCategories = () => {
    if (quickCategories.length > 0) return;
    void getCachedActiveCategories(8).then((data) => {
      if (data.length > 0) setQuickCategories(data);
    });
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('public_products')
          .select('id, name_bn, name_en, slug, sku, price, sale_price')
          .or(`name_bn.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`)
          .limit(10);

        if (!error && data) {
          const filteredProds = (data as PublicProduct[])
            .filter((p) => showDemoData || !isDemoProduct(p))
            .slice(0, 5);

          if (filteredProds.length > 0) {
            const ids = filteredProds.map((p) => p.id);
            const { data: imgData } = await supabase
              .from('product_images')
              .select('product_id, image_url')
              .in('product_id', ids)
              .order('sort_order', { ascending: true });

            const imgMap = new Map<string, string>();
            (imgData as DbProductImage[] | null)?.forEach((img) => {
              if (!imgMap.has(img.product_id)) {
                imgMap.set(img.product_id, img.image_url);
              }
            });

            setResults(
              filteredProds.map((p) => ({
                ...p,
                image_url: imgMap.get(p.id) ?? null,
              })),
            );
          } else {
            setResults([]);
          }
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, showDemoData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    onSearchSubmit?.();
    const q = query.trim();
    if (q) {
      navigate(`${localizedPath('/shop')}?q=${encodeURIComponent(q)}`);
    } else {
      navigate(localizedPath('/shop'));
    }
  };

  const handleSelectProduct = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    onSearchSubmit?.();
    navigate(localizedPath(`/product/${slug}`));
  };

  const handleSelectCategory = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    onSearchSubmit?.();
    navigate(localizedPath(`/category/${slug}`));
  };

  const visibleQuickCategories = quickCategories.filter(
    (c) => showDemoData || !isDemoCategory(c),
  );

  const hasTypedQuery = query.trim().length >= 2;
  const isDark = surface === 'dark';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} role="search" className="relative w-full group">
        <Search
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-100',
            isDark
              ? 'text-white/60 group-focus-within:text-[#64748B]'
              : 'text-[#64748B]',
          )}
        />

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            loadQuickCategories();
            setIsOpen(true);
          }}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
          className={cn(
            'w-full rounded-full border pl-10 text-sm focus:outline-none transition-all duration-150',
            isDark
              ? 'border-white/15 bg-white/10 text-white placeholder:text-white/60 hover:bg-white/15 focus:border-white focus:bg-white focus:text-[#0F1A2C] focus:placeholder:text-[#64748B] focus:shadow-lg'
              : 'border-transparent bg-[#F4F6F9] text-[#0F1A2C] placeholder:text-[#64748B] hover:bg-[#EDF1F6] focus:border-[#17263E]/18 focus:bg-white focus:shadow-md',
            isMobile ? 'min-h-[44px] pr-16' : 'h-9 pr-16',
          )}
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              aria-label="Clear search"
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-100 cursor-pointer',
                isDark
                  ? 'text-white/75 group-focus-within:text-[#64748B] hover:bg-black/10'
                  : 'text-[#64748B] hover:bg-[#17263E]/8 hover:text-[#0F1A2C]',
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {query.trim().length > 0 && (
            <button
              type="submit"
              aria-label={t('nav.searchButton')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F47125] text-white hover:bg-[#D95F18] transition-colors duration-100 active:scale-95 cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Instant Dropdown: Quick Categories OR Product Results */}
      {isOpen && (hasTypedQuery || visibleQuickCategories.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#17263E]/12 bg-white text-[#0F1A2C] shadow-[0_18px_40px_-12px_rgba(15,26,44,0.25)]">
          {!hasTypedQuery ? (
            <div className="p-3">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {t('nav.quickCategories')}
              </p>
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {visibleQuickCategories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.slug)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium text-[#0F1A2C] hover:bg-[#F5F7FA] hover:text-[#F47125] transition-colors duration-100 cursor-pointer"
                  >
                    <span className="truncate">{tField(cat, 'name')}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 opacity-40" />
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="p-4 text-center text-xs text-[#5B6577]">
              {t('common.loading')}
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-[#17263E]/6">
              {results.map((product) => {
                const hasSale =
                  product.sale_price !== null &&
                  product.sale_price > 0 &&
                  product.sale_price < product.price;
                const price = hasSale ? product.sale_price! : product.price;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.slug)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-[#F7F9FC] transition-colors duration-100 cursor-pointer"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#17263E]/8 bg-[#F5F7FA]">
                      <ProductImage
                        src={product.image_url}
                        alt={tField(product, 'name')}
                        aspectClassName="aspect-square"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#0F1A2C]">
                        {tField(product, 'name')}
                      </p>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-xs font-bold text-[#F47125] tabular-nums">
                          {formatPrice(Number(price))}
                        </span>
                        {hasSale && (
                          <span className="text-[11px] text-[#94A3B8] line-through tabular-nums">
                            {formatPrice(Number(product.price))}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-[#F8FAFC] p-2.5 text-center text-xs font-semibold text-[#17263E] hover:text-[#F47125] transition-colors duration-100 cursor-pointer"
              >
                {t('home.viewAll')} "{query.trim()}" →
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#5B6577]">
              {t('nav.noSearchResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

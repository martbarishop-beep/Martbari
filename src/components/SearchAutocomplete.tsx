import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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

const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

function sanitizePostgrestLikeTerm(raw: string): string {
  return raw
    .replace(/[,()*]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderHighlightedMatch(text: string, term: string): React.ReactNode {
  const cleanTerm = term.trim();
  if (!cleanTerm) return text;
  const escapedRegex = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedRegex})`, 'ig');
  const parts = text.split(regex);
  if (parts.length <= 1) return text;

  return parts.map((part, idx) =>
    part.toLowerCase() === cleanTerm.toLowerCase() ? (
      <mark
        key={idx}
        className="rounded-xs bg-[#FFF0E5] px-0.5 text-[#D95F18] font-bold"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    ),
  );
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  onSearchSubmit,
  className,
  isMobile = false,
  surface = 'light',
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField, formatPrice } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const listboxId = useId();
  const showDemoData = settings.show_demo_data !== false;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [quickCategories, setQuickCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);
  const searchCacheRef = useRef<Map<string, SearchResultItem[]>>(new Map());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadQuickCategories = useCallback(() => {
    if (quickCategories.length > 0) return;
    void getCachedActiveCategories(8).then((data) => {
      if (data.length > 0) setQuickCategories(data);
    });
  }, [quickCategories.length]);

  const executeSearch = useCallback(
    async (rawTerm: string, seq: number) => {
      if (!supabase) {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
        return;
      }

      const safeTerm = sanitizePostgrestLikeTerm(rawTerm);
      if (safeTerm.length < 2) {
        if (seq === requestSeqRef.current) {
          setResults([]);
          setLoading(false);
          setFetchError(false);
        }
        return;
      }

      const cacheKey = `${rawTerm.trim().toLowerCase()}::${showDemoData ? '1' : '0'}`;

      try {
        const { data, error } = await supabase
          .from('public_products')
          .select('id, name_bn, name_en, slug, sku, price, sale_price, stock, track_stock, is_featured')
          .or(
            `name_bn.ilike.%${safeTerm}%,name_en.ilike.%${safeTerm}%,sku.ilike.%${safeTerm}%`,
          )
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(12);

        if (seq !== requestSeqRef.current) return;

        if (error) {
          setFetchError(true);
          setResults([]);
          return;
        }

        const filteredProds = ((data as PublicProduct[] | null) ?? [])
          .filter((p) => showDemoData || !isDemoProduct(p))
          .slice(0, MAX_SUGGESTIONS);

        if (filteredProds.length === 0) {
          searchCacheRef.current.set(cacheKey, []);
          setResults([]);
          setFetchError(false);
          return;
        }

        const ids = filteredProds.map((p) => p.id);
        const { data: imgData } = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .in('product_id', ids)
          .order('sort_order', { ascending: true });

        if (seq !== requestSeqRef.current) return;

        const imgMap = new Map<string, string>();
        (imgData as DbProductImage[] | null)?.forEach((img) => {
          if (!imgMap.has(img.product_id)) {
            imgMap.set(img.product_id, img.image_url);
          }
        });

        const mapped: SearchResultItem[] = filteredProds.map((p) => ({
          ...p,
          image_url: imgMap.get(p.id) ?? null,
        }));

        searchCacheRef.current.set(cacheKey, mapped);
        setResults(mapped);
        setFetchError(false);
      } catch {
        if (seq === requestSeqRef.current) {
          setFetchError(true);
          setResults([]);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [showDemoData],
  );

  useEffect(() => {
    const trimmed = query.trim();
    setActiveIndex(-1);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (trimmed.length < 2) {
      requestSeqRef.current += 1;
      setResults([]);
      setLoading(false);
      setFetchError(false);
      return;
    }

    const cacheKey = `${trimmed.toLowerCase()}::${showDemoData ? '1' : '0'}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      requestSeqRef.current += 1;
      setResults(cached);
      setLoading(false);
      setFetchError(false);
      setIsOpen(true);
      return;
    }

    const seq = ++requestSeqRef.current;
    setLoading(true);
    setFetchError(false);
    setIsOpen(true);

    debounceTimerRef.current = window.setTimeout(() => {
      void executeSearch(trimmed, seq);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, showDemoData, executeSearch]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsOpen(false);
    setActiveIndex(-1);
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
    setActiveIndex(-1);
    setQuery('');
    onSearchSubmit?.();
    navigate(localizedPath(`/product/${slug}`));
  };

  const handleSelectCategory = (slug: string) => {
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery('');
    onSearchSubmit?.();
    navigate(localizedPath(`/category/${slug}`));
  };

  const handleRetry = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setFetchError(false);
    void executeSearch(trimmed, seq);
  };

  const visibleQuickCategories = quickCategories.filter(
    (c) => showDemoData || !isDemoCategory(c),
  );

  const hasTypedQuery = query.trim().length >= 2;
  const isDropdownVisible =
    isOpen && (hasTypedQuery || visibleQuickCategories.length > 0);
  const isDark = surface === 'dark';

  const hasQuery = query.length > 0;
  const hasSubmitQuery = query.trim().length > 0;
  const rightPaddingClass = hasSubmitQuery
    ? 'pr-[76px]'
    : hasQuery
      ? 'pr-11'
      : 'pr-4';

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!isDropdownVisible || !hasTypedQuery || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      handleSelectProduct(results[activeIndex].slug);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} role="search" className="relative w-full group">
        <Search
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 transition-colors duration-150',
            isDark
              ? 'text-white/75 group-focus-within:text-[#5B6577]'
              : 'text-[#64748B] group-focus-within:text-[#17263E]',
          )}
        />

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isDropdownVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `${listboxId}-opt-${results[activeIndex].id}`
              : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            loadQuickCategories();
            setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
          autoComplete="off"
          className={cn(
            'w-full rounded-full border pl-10 py-2 text-[14px] leading-[1.5] overflow-visible [text-overflow:clip] placeholder:opacity-100 placeholder:leading-[1.5] focus:outline-none transition-[background-color,border-color,box-shadow,color] duration-150 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            isDark
              ? 'border-white/20 bg-white/12 text-white placeholder:text-white/80 hover:bg-white/18 focus:border-[#F47125] focus:bg-white focus:text-[#0F1A2C] focus:placeholder:text-[#5B6577] focus:ring-2 focus:ring-[#F47125]/35 focus:shadow-sm'
              : 'border-[#17263E]/15 bg-[#F4F6F9] text-[#0F1A2C] placeholder:text-[#5B6577] hover:bg-[#EDF1F6] focus:border-[#F47125] focus:bg-white focus:ring-2 focus:ring-[#F47125]/30 focus:shadow-sm',
            isMobile ? 'h-[44px] min-h-[44px]' : 'h-[42px] min-h-[42px]',
            rightPaddingClass,
          )}
        />

        {(hasQuery || hasSubmitQuery) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {hasQuery && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setActiveIndex(-1);
                  setFetchError(false);
                  inputRef.current?.focus();
                }}
                aria-label={lang === 'bn' ? 'সার্চ মুছুন' : 'Clear search'}
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-100 cursor-pointer',
                  isDark
                    ? 'text-white/80 group-focus-within:text-[#5B6577] hover:bg-black/10'
                    : 'text-[#5B6577] hover:bg-[#17263E]/10 hover:text-[#0F1A2C]',
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {hasSubmitQuery && (
              <button
                type="submit"
                aria-label={t('nav.searchButton')}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F47125] text-white hover:bg-[#D95F18] transition-colors duration-100 active:scale-95 cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </form>

      {/* Instant Dropdown: Quick Categories OR Debounced Supabase Product Suggestions */}
      {isDropdownVisible && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={
            hasTypedQuery
              ? lang === 'bn'
                ? 'সার্চ সাজেশন'
                : 'Search suggestions'
              : t('nav.quickCategories')
          }
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(420px,62dvh)] overflow-y-auto rounded-2xl border border-[#17263E]/12 bg-white text-[#0F1A2C] shadow-[0_18px_40px_-12px_rgba(15,26,44,0.25)]"
        >
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
            <div className="divide-y divide-[#17263E]/6 p-1" aria-busy="true">
              {[0, 1, 2].map((skeleton) => (
                <div key={skeleton} className="flex items-center gap-3 p-2.5 animate-pulse">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-[#EEF2F6]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-[#EEF2F6]" />
                    <div className="h-2.5 w-1/3 rounded bg-[#F1F5F9]" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="p-4 text-center">
              <p className="text-xs text-[#5B6577]">{t('common.errorDesc')}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 inline-flex items-center rounded-lg border border-[#17263E]/15 px-3 py-1 text-xs font-semibold text-[#17263E] hover:border-[#F47125] hover:text-[#F47125] transition-colors cursor-pointer"
              >
                {t('common.retry')}
              </button>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-[#17263E]/6">
              {results.map((product, index) => {
                const hasSale =
                  product.sale_price !== null &&
                  product.sale_price > 0 &&
                  product.sale_price < product.price;
                const price = hasSale ? product.sale_price! : product.price;
                const isActive = index === activeIndex;
                const productTitle = tField(product, 'name');
                const inStock = !product.track_stock || product.stock > 0;

                return (
                  <button
                    key={product.id}
                    id={`${listboxId}-opt-${product.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectProduct(product.slug)}
                    className={cn(
                      'flex w-full items-center gap-3 p-3 text-left transition-colors duration-100 cursor-pointer',
                      isActive ? 'bg-[#FFF7F0]' : 'hover:bg-[#F7F9FC]',
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#17263E]/8 bg-[#F5F7FA]">
                      <ProductImage
                        src={product.image_url}
                        alt={productTitle}
                        aspectClassName="aspect-square"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#0F1A2C]">
                        {renderHighlightedMatch(productTitle, query)}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#F47125] tabular-nums">
                          {formatPrice(Number(price))}
                        </span>
                        {hasSale && (
                          <span className="text-[11px] text-[#94A3B8] line-through tabular-nums">
                            {formatPrice(Number(product.price))}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-[10.5px] font-medium',
                            inStock ? 'text-emerald-700' : 'text-rose-600',
                          )}
                        >
                          · {inStock ? t('product.inStock') : t('product.outOfStock')}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      aria-hidden="true"
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-opacity',
                        isActive ? 'text-[#F47125] opacity-100' : 'text-[#94A3B8] opacity-50',
                      )}
                    />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full bg-[#F8FAFC] p-2.5 text-center text-xs font-semibold text-[#17263E] hover:text-[#F47125] transition-colors duration-100 cursor-pointer"
              >
                {t('home.viewAll')} &ldquo;{query.trim()}&rdquo; →
              </button>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#5B6577]">
              <p>{t('nav.noSearchResults')}</p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSearchSubmit?.();
                  navigate(localizedPath('/shop'));
                }}
                className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#F47125] hover:underline cursor-pointer"
              >
                {t('nav.browseShop')} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

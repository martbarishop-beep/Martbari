import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../lib/supabase';
import type { ProductImage as DbProductImage, PublicProduct } from '../types';
import { ProductImage } from './ProductImage';

interface SearchResultItem extends PublicProduct {
  image_url?: string | null;
}

export interface SearchAutocompleteProps {
  onSearchSubmit?: () => void;
  className?: string;
  isMobile?: boolean;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  onSearchSubmit,
  className,
  isMobile = false,
}) => {
  const { t } = useTranslation();
  const { localizedPath, tField, formatPrice } = useLanguage();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
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
          .select('id, name_bn, name_en, slug, price, sale_price')
          .or(`name_bn.ilike.%${trimmed}%,name_en.ilike.%${trimmed}%`)
          .limit(5);

        if (!error && data) {
          const prods = data as PublicProduct[];
          if (prods.length > 0) {
            const ids = prods.map((p) => p.id);
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
              prods.map((p) => ({
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
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

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

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={handleSubmit} role="search" className="relative w-full">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
          className={
            isMobile
              ? 'min-h-[44px] w-full rounded-xl border border-[#17263E]/12 bg-[#F5F7FA] pl-4 pr-16 text-sm text-[#0F1A2C] placeholder:text-[#64748B] focus:border-[#F47125] focus:bg-white focus:outline-none transition-colors'
              : 'h-10 w-full rounded-xl border border-[#17263E]/10 bg-[#F4F6F9] pl-4 pr-16 text-sm text-[#0F1A2C] placeholder:text-[#64748B] focus:border-[#F47125] focus:bg-white focus:outline-none transition-colors'
          }
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              aria-label="Clear search"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:text-[#0F1A2C] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="submit"
            aria-label={t('nav.searchButton')}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#17263E] text-white hover:bg-[#F47125] transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[12px] border border-[#17263E]/10 bg-white shadow-card">
          {loading ? (
            <div className="p-4 text-center text-xs text-[#5B6577]">
              {t('common.loading')}
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-[#17263E]/5">
              {results.map((product) => {
                const price =
                  product.sale_price !== null && product.sale_price < product.price
                    ? product.sale_price
                    : product.price;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.slug)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-[#F5F7FA] transition-colors cursor-pointer"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-[#17263E]/10 bg-[#F5F7FA]">
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
                      <p className="mt-0.5 text-xs font-bold text-[#F47125] tabular-nums">
                        {formatPrice(Number(price))}
                      </p>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-[#F5F7FA] p-2.5 text-center text-xs font-semibold text-[#F47125] hover:text-[#D95F18] cursor-pointer"
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

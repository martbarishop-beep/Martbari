import React, { useEffect, useMemo, useState } from 'react';
import { Filter, RotateCcw, SlidersHorizontal, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import type { ProductReviewStats, StorefrontProduct } from '../components/QuickViewModal';
import { Breadcrumb, Button, Drawer, EmptyState, ErrorState, Pagination, Skeleton } from '../components/ui';
import { isDemoBrand, isDemoCategory, isDemoProduct } from '../config/demoCatalog';
import { EDITORIAL_DEMO_IMAGES, PRODUCT_DEMO_IMAGES_BY_SLUG } from '../config/demoImages';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { formatNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { Brand, Category, ProductImage as DbProductImage, PublicProduct } from '../types';

const PAGE_SIZE = 20;

export const ShopPage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();
  const { settings } = useSettings();
  const { slug: categorySlugParam } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const showDemoData = settings.show_demo_data !== false;

  // URL state
  const searchQuery = searchParams.get('q') || '';
  const selectedCategorySlug = categorySlugParam || searchParams.get('category') || '';
  const selectedBrandId = searchParams.get('brand') || '';
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const inStockOnly = searchParams.get('in_stock') === 'true';
  const onSaleOnly = searchParams.get('on_sale') === 'true';
  const minRating = Number(searchParams.get('rating') || '0');
  const sort = searchParams.get('sort') || 'newest';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));

  // Local filter form state for price inputs
  const [priceMinInput, setPriceMinInput] = useState(minPriceParam);
  const [priceMaxInput, setPriceMaxInput] = useState(maxPriceParam);

  // Metadata
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsMap, setBrandsMap] = useState<Map<string, Brand>>(new Map());

  // Products and Pagination state
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [reviewsStatsMap, setReviewsStatsMap] = useState<Map<string, ProductReviewStats>>(new Map());
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Mobile Filter Drawer
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Sync price inputs when searchParams change
  useEffect(() => {
    setPriceMinInput(minPriceParam);
    setPriceMaxInput(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  // Load categories and brands on mount
  useEffect(() => {
    async function loadMeta() {
      if (!supabase) return;
      try {
        const [{ data: cats }, { data: brs }] = await Promise.all([
          supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
          supabase.from('brands').select('*').eq('is_active', true),
        ]);
        if (cats) {
          setCategories(
            (cats as Category[]).filter((c) => showDemoData || !isDemoCategory(c)),
          );
        }
        if (brs) {
          const filteredBrands = (brs as Brand[]).filter(
            (b) => showDemoData || !isDemoBrand(b),
          );
          setBrands(filteredBrands);
          const map = new Map<string, Brand>();
          filteredBrands.forEach((b) => map.set(b.id, b));
          setBrandsMap(map);
        }
      } catch {
        // Ignore
      }
    }
    void loadMeta();
  }, [showDemoData]);

  // Update URL params helper
  const updateQueryParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    // Reset page to 1 when filters change (unless page is what changed)
    if (!('page' in updates)) {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
    setPriceMinInput('');
    setPriceMaxInput('');
    setIsFilterDrawerOpen(false);
  };

  // Fetch products matching all active filters
  const fetchProducts = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    try {
      let query = supabase
        .from('public_products')
        .select('*', { count: 'exact' });

      // Search query (Bangla or English)
      if (searchQuery.trim()) {
        const term = searchQuery.trim();
        query = query.or(`name_bn.ilike.%${term}%,name_en.ilike.%${term}%`);
      }

      // Category filter (match slug by category_id)
      if (selectedCategorySlug) {
        const cat = categories.find((c) => c.slug === selectedCategorySlug);
        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      }

      // Brand filter
      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId);
      }

      // In Stock filter
      if (inStockOnly) {
        query = query.gt('stock', 0);
      }

      // On Sale filter
      if (onSaleOnly) {
        query = query.not('sale_price', 'is', null);
      }

      // Price range
      if (minPriceParam && !isNaN(Number(minPriceParam))) {
        query = query.gte('price', Number(minPriceParam));
      }
      if (maxPriceParam && !isNaN(Number(maxPriceParam))) {
        query = query.lte('price', Number(maxPriceParam));
      }

      // Sorting
      if (sort === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else if (sort === 'popular') {
        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
      } else {
        // default newest
        query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        setHasError(true);
        setProducts([]);
        return;
      }

      const rawProds = (data ?? []) as PublicProduct[];
      const prods = rawProds.filter((p) => showDemoData || !isDemoProduct(p));
      setTotalCount(showDemoData ? (count ?? prods.length) : prods.length);

      if (prods.length > 0) {
        const ids = prods.map((p) => p.id);
        const catSlugById = new Map<string, string>();
        categories.forEach((c) => catSlugById.set(c.id, c.slug));

        const [{ data: imgData }, { data: revData }] = await Promise.all([
          supabase
            .from('product_images')
            .select('product_id, image_url, sort_order')
            .in('product_id', ids)
            .order('sort_order', { ascending: true }),
          supabase
            .from('reviews')
            .select('product_id, rating')
            .in('product_id', ids)
            .eq('is_approved', true),
        ]);

        const imgListMap = new Map<string, string[]>();
        (imgData as DbProductImage[] | null)?.forEach((img) => {
          if (img.image_url.startsWith('http://') || img.image_url.startsWith('https://')) {
            const existing = imgListMap.get(img.product_id) ?? [];
            existing.push(img.image_url);
            imgListMap.set(img.product_id, existing);
          }
        });

        const rawStats = new Map<string, { sum: number; count: number }>();
        (revData as Array<{ product_id: string; rating: number }> | null)?.forEach((r) => {
          const prev = rawStats.get(r.product_id) ?? { sum: 0, count: 0 };
          rawStats.set(r.product_id, {
            sum: prev.sum + Number(r.rating || 5),
            count: prev.count + 1,
          });
        });
        const nextStats = new Map<string, ProductReviewStats>();
        rawStats.forEach((v, k) => {
          nextStats.set(k, { avg: Number((v.sum / v.count).toFixed(1)), count: v.count });
        });
        setReviewsStatsMap(nextStats);

        setProducts(
          prods.map((p) => {
            const dbUrls = imgListMap.get(p.id) ?? [];
            const fallbackUrls = showDemoData ? PRODUCT_DEMO_IMAGES_BY_SLUG[p.slug] ?? [] : [];
            const combined = dbUrls.length > 0 ? dbUrls : fallbackUrls;
            return {
              ...p,
              category_slug: p.category_id ? catSlugById.get(p.category_id) ?? null : null,
              image_url: combined[0] ?? null,
              image_urls: combined,
            };
          }),
        );
      } else {
        setProducts([]);
      }
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, [
    searchQuery,
    selectedCategorySlug,
    selectedBrandId,
    minPriceParam,
    maxPriceParam,
    inStockOnly,
    onSaleOnly,
    sort,
    page,
    categories,
    showDemoData,
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Active Category Name for page title and breadcrumbs
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.slug === selectedCategorySlug);
  }, [categories, selectedCategorySlug]);

  const pageTitle = currentCategory
    ? tField(currentCategory, 'name')
    : searchQuery
    ? `"${searchQuery}" - ${t('shop.title')}`
    : t('shop.title');

  const activeFilterCount = [
    selectedCategorySlug,
    selectedBrandId,
    minPriceParam,
    maxPriceParam,
    inStockOnly ? '1' : '',
    onSaleOnly ? '1' : '',
    searchQuery,
  ].filter(Boolean).length;

  // Filter Sidebar Content (used in desktop and mobile drawer)
  const FilterContent = (
    <div className="space-y-6">
      {/* Category filter */}
      <div>
        <h3 className="text-sm font-bold text-[#0F1A2C]">{t('shop.categories')}</h3>
        <div className="mt-3 space-y-1">
          <button
            type="button"
            onClick={() => updateQueryParam({ category: null })}
            className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
              !selectedCategorySlug
                ? 'bg-[#F47125]/10 font-bold text-[#D95F18]'
                : 'text-[#0F1A2C] hover:bg-[#F5F7FA]'
            }`}
          >
            <span>{t('shop.allCategories')}</span>
          </button>
          {categories.map((cat) => {
            const active = selectedCategorySlug === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateQueryParam({ category: cat.slug })}
                className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#F47125]/10 font-bold text-[#D95F18]'
                    : 'text-[#0F1A2C] hover:bg-[#F5F7FA]'
                }`}
              >
                <span>{tField(cat, 'name')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <div className="border-t border-[#17263E]/10 pt-5">
          <h3 className="text-sm font-bold text-[#0F1A2C]">{t('shop.brands')}</h3>
          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => updateQueryParam({ brand: null })}
              className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                !selectedBrandId
                  ? 'bg-[#F47125]/10 font-bold text-[#D95F18]'
                  : 'text-[#0F1A2C] hover:bg-[#F5F7FA]'
              }`}
            >
              <span>{t('shop.allBrands')}</span>
            </button>
            {brands.map((b) => {
              const active = selectedBrandId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateQueryParam({ brand: b.id })}
                  className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F47125]/10 font-bold text-[#D95F18]'
                      : 'text-[#0F1A2C] hover:bg-[#F5F7FA]'
                  }`}
                >
                  <span>{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range Filter */}
      <div className="border-t border-[#17263E]/10 pt-5">
        <h3 className="text-sm font-bold text-[#0F1A2C]">{t('shop.priceRange')}</h3>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={priceMinInput}
            onChange={(e) => setPriceMinInput(e.target.value)}
            placeholder={t('shop.minPrice')}
            className="w-full rounded-[8px] border border-[#17263E]/15 px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
          />
          <span className="text-[#5B6577]">-</span>
          <input
            type="number"
            min="0"
            value={priceMaxInput}
            onChange={(e) => setPriceMaxInput(e.target.value)}
            placeholder={t('shop.maxPrice')}
            className="w-full rounded-[8px] border border-[#17263E]/15 px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 w-full text-xs"
          onClick={() => {
            updateQueryParam({
              min_price: priceMinInput.trim() || null,
              max_price: priceMaxInput.trim() || null,
            });
            setIsFilterDrawerOpen(false);
          }}
        >
          {t('shop.applyPrice')}
        </Button>
      </div>

      {/* Toggle Checkboxes: In Stock & On Sale */}
      <div className="border-t border-[#17263E]/10 pt-5 space-y-3">
        <label className="flex items-center gap-2.5 text-sm font-medium text-[#0F1A2C] cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) =>
              updateQueryParam({ in_stock: e.target.checked ? 'true' : null })
            }
            className="h-4 w-4 rounded border-[#17263E]/20 text-[#F47125] focus:ring-[#F47125]"
          />
          <span>{t('shop.inStockOnly')}</span>
        </label>

        <label className="flex items-center gap-2.5 text-sm font-medium text-[#0F1A2C] cursor-pointer">
          <input
            type="checkbox"
            checked={onSaleOnly}
            onChange={(e) =>
              updateQueryParam({ on_sale: e.target.checked ? 'true' : null })
            }
            className="h-4 w-4 rounded border-[#17263E]/20 text-[#F47125] focus:ring-[#F47125]"
          />
          <span>{t('shop.onSaleOnly')}</span>
        </label>
      </div>

      {/* Clear Filters Button */}
      <div className="border-t border-[#17263E]/10 pt-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="w-full text-xs text-[#DC2626] hover:bg-[#DC2626]/10"
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          {t('shop.clearFilters')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {pageTitle} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-20 sm:px-6 sm:py-8 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: localizedPath('/') },
            { label: t('shop.title'), to: localizedPath('/shop') },
            ...(currentCategory ? [{ label: tField(currentCategory, 'name') }] : []),
          ]}
        />

        {/* Header Strip with Title, Filter count, Sort selector */}
        <div className="mt-5 flex flex-col gap-3.5 border-b border-[#17263E]/8 pb-5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C] sm:text-3xl">{pageTitle}</h1>
            <p className="mt-1 text-xs text-[#64748B] tabular-nums">
              {t('shop.showingResults', { total: formatNumber(totalCount, lang) })}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2.5 sm:justify-end sm:gap-3">
            {/* Mobile Filter Trigger Button (44px touch target) */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#17263E]/15 bg-white px-3.5 text-xs sm:text-sm font-semibold text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-[#F8FAFC] transition-colors cursor-pointer lg:hidden"
            >
              <Filter className="h-4 w-4 text-[#17263E]" aria-hidden="true" />
              <span>{t('shop.filterTitle')}</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F47125] px-1.5 text-[11px] font-bold text-white tabular-nums">
                  {formatNumber(activeFilterCount, lang)}
                </span>
              )}
            </button>

            {/* Sort Selector */}
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
              <span className="hidden sm:inline text-xs font-medium text-[#64748B] whitespace-nowrap">
                {t('shop.sortLabel')}:
              </span>
              <select
                value={sort}
                onChange={(e) => updateQueryParam({ sort: e.target.value })}
                aria-label={t('shop.sortLabel')}
                className="min-h-[44px] w-full sm:w-auto rounded-xl border border-[#17263E]/15 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-[#0F1A2C] focus:border-[#F47125] focus:outline-none cursor-pointer"
              >
                <option value="newest">{t('shop.sortNewest')}</option>
                <option value="price_asc">{t('shop.sortPriceAsc')}</option>
                <option value="price_desc">{t('shop.sortPriceDesc')}</option>
                <option value="popular">{t('shop.sortPopular')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Quick Category & Quick-Filter Strip (great for mobile one-thumb browsing) */}
        <div className="-mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scroll-px-4 no-scrollbar touch-pan-x sm:-mx-6 sm:px-6 sm:scroll-px-6 lg:mx-0 lg:px-0">
          <button
            type="button"
            onClick={() => updateQueryParam({ category: null })}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-xs sm:text-sm font-semibold leading-[1.4] whitespace-nowrap transition-colors cursor-pointer',
              !selectedCategorySlug
                ? 'border-[#17263E] bg-[#17263E] text-white'
                : 'border-[#17263E]/12 bg-white text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-[#F8FAFC]',
            )}
          >
            {t('shop.allCategories')}
          </button>

          {categories.map((cat) => {
            const active = selectedCategorySlug === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateQueryParam({ category: active ? null : cat.slug })}
                className={cn(
                  'inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-xs sm:text-sm font-semibold leading-[1.4] whitespace-nowrap transition-colors cursor-pointer',
                  active
                    ? 'border-[#17263E] bg-[#17263E] text-white'
                    : 'border-[#17263E]/12 bg-white text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-[#F8FAFC]',
                )}
              >
                {tField(cat, 'name')}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => updateQueryParam({ on_sale: onSaleOnly ? null : 'true' })}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-xs sm:text-sm font-semibold leading-[1.4] whitespace-nowrap transition-colors cursor-pointer lg:hidden',
              onSaleOnly
                ? 'border-[#F47125] bg-[#F47125] text-white'
                : 'border-[#17263E]/12 bg-[#FFF8F3] text-[#D95F18] hover:border-[#F47125]/40',
            )}
          >
            {t('shop.onSaleOnly')}
          </button>

          <button
            type="button"
            onClick={() => updateQueryParam({ in_stock: inStockOnly ? null : 'true' })}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-xs sm:text-sm font-semibold leading-[1.4] whitespace-nowrap transition-colors cursor-pointer lg:hidden',
              inStockOnly
                ? 'border-[#17263E] bg-[#17263E] text-white'
                : 'border-[#17263E]/12 bg-white text-[#0F1A2C] hover:border-[#17263E]/30',
            )}
          >
            {t('shop.inStockOnly')}
          </button>
        </div>

        {/* Active Filter Quick Clear Bar */}
        {(selectedCategorySlug ||
          selectedBrandId ||
          minPriceParam ||
          maxPriceParam ||
          inStockOnly ||
          onSaleOnly ||
          searchQuery) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateQueryParam({ q: null })}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#F4F6F9] px-2.5 py-1.5 font-medium text-[#0F1A2C] hover:bg-[#E9EEF5] cursor-pointer"
              >
                <span>"{searchQuery}"</span>
                <span aria-hidden="true">×</span>
              </button>
            )}
            {selectedBrandId && brandsMap.get(selectedBrandId) && (
              <button
                type="button"
                onClick={() => updateQueryParam({ brand: null })}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#F4F6F9] px-2.5 py-1.5 font-medium text-[#0F1A2C] hover:bg-[#E9EEF5] cursor-pointer"
              >
                <span>{brandsMap.get(selectedBrandId)?.name}</span>
                <span aria-hidden="true">×</span>
              </button>
            )}
            {inStockOnly && (
              <button
                type="button"
                onClick={() => updateQueryParam({ in_stock: null })}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#F4F6F9] px-2.5 py-1.5 font-medium text-[#0F1A2C] hover:bg-[#E9EEF5] cursor-pointer"
              >
                <span>{t('shop.inStockOnly')}</span>
                <span aria-hidden="true">×</span>
              </button>
            )}
            {onSaleOnly && (
              <button
                type="button"
                onClick={() => updateQueryParam({ on_sale: null })}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#F4F6F9] px-2.5 py-1.5 font-medium text-[#0F1A2C] hover:bg-[#E9EEF5] cursor-pointer"
              >
                <span>{t('shop.onSaleOnly')}</span>
                <span aria-hidden="true">×</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex min-h-[36px] items-center text-xs font-semibold text-[#F47125] hover:underline px-1.5 cursor-pointer"
            >
              {t('shop.clearFilters')}
            </button>
          </div>
        )}

        {/* Main Grid: Filters Sidebar (Desktop) + Products Area */}
        <div className="mt-5 grid grid-cols-1 items-start gap-7 sm:mt-6 lg:grid-cols-12">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 rounded-2xl border border-[#17263E]/8 bg-white p-5 sticky top-24">
            <div className="flex items-center gap-2 pb-4 border-b border-[#17263E]/8 text-sm font-bold text-[#0F1A2C]">
              <SlidersHorizontal className="h-4 w-4 text-[#F47125]" />
              <span>{t('shop.filterTitle')}</span>
            </div>
            <div className="pt-4">{FilterContent}</div>
          </aside>

          {/* Products Content Area */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Skeleton key={idx} variant="card" />
                ))}
              </div>
            ) : hasError ? (
              <ErrorState onRetry={() => void fetchProducts()} />
            ) : products.length === 0 ? (
              <EmptyState
                imageUrl={showDemoData ? EDITORIAL_DEMO_IMAGES.emptyShowcase : undefined}
                title={t('shop.noProductsFound')}
                description={t('shop.tryAdjusting')}
                actionLabel={t('shop.clearFilters')}
                onAction={handleClearFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      brandsMap={brandsMap}
                      reviewStats={reviewsStatsMap.get(product.id) ?? null}
                      compactOnMobile
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={(p) => updateQueryParam({ page: String(p) })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        position="right"
        title={t('shop.filterDrawerTitle')}
      >
        <div className="pb-6">{FilterContent}</div>
      </Drawer>
    </>
  );
};

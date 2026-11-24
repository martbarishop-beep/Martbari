import { supabase } from './supabase';
import type { Brand, Category } from '../types';

export const PRODUCT_CARD_COLUMNS =
  'id, name_bn, name_en, slug, short_desc_bn, short_desc_en, price, sale_price, sale_starts_at, sale_ends_at, stock, low_stock_threshold, sku, brand_id, category_id, warranty_bn, warranty_en, is_active, is_featured, is_new, track_stock, estimated_delivery_days, created_at';

export const CATEGORY_SELECT_COLUMNS =
  'id, parent_id, name_bn, name_en, slug, image_url, sort_order, is_active';

export const BRAND_SELECT_COLUMNS =
  'id, name, slug, logo_url, is_active';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CATEGORIES_STORAGE_KEY = 'martbari_categories_cache_v1';
const BRANDS_STORAGE_KEY = 'martbari_brands_cache_v1';

interface CacheEnvelope<T> {
  timestamp: number;
  data: T[];
}

let cachedCategories: Category[] | null = null;
let categoriesTimestamp = 0;
let categoriesInFlight: Promise<Category[]> | null = null;

let cachedBrands: Brand[] | null = null;
let brandsTimestamp = 0;
let brandsInFlight: Promise<Brand[]> | null = null;

function readSessionCache<T>(key: string): T[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CacheEnvelope<T> = { timestamp: Date.now(), data };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export async function getCachedActiveCategories(limit = 20): Promise<Category[]> {
  const now = Date.now();
  if (cachedCategories && now - categoriesTimestamp < CACHE_TTL_MS) {
    return cachedCategories.slice(0, limit);
  }

  const sessionData = readSessionCache<Category>(CATEGORIES_STORAGE_KEY);
  if (sessionData) {
    cachedCategories = sessionData;
    categoriesTimestamp = now;
    return sessionData.slice(0, limit);
  }

  if (!supabase) return [];

  if (!categoriesInFlight) {
    categoriesInFlight = Promise.resolve(
      supabase
        .from('categories')
        .select(CATEGORY_SELECT_COLUMNS)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(24)
        .then(({ data, error }) => {
          categoriesInFlight = null;
          if (!error && data) {
            cachedCategories = data as unknown as Category[];
            categoriesTimestamp = Date.now();
            writeSessionCache(CATEGORIES_STORAGE_KEY, cachedCategories);
            return cachedCategories;
          }
          return [];
        }),
    ).catch(() => {
      categoriesInFlight = null;
      return [];
    });
  }

  const all = await categoriesInFlight;
  return all.slice(0, limit);
}

export async function getCachedActiveBrands(): Promise<Brand[]> {
  const now = Date.now();
  if (cachedBrands && now - brandsTimestamp < CACHE_TTL_MS) {
    return cachedBrands;
  }

  const sessionData = readSessionCache<Brand>(BRANDS_STORAGE_KEY);
  if (sessionData) {
    cachedBrands = sessionData;
    brandsTimestamp = now;
    return sessionData;
  }

  if (!supabase) return [];

  if (!brandsInFlight) {
    brandsInFlight = Promise.resolve(
      supabase
        .from('brands')
        .select(BRAND_SELECT_COLUMNS)
        .eq('is_active', true)
        .then(({ data, error }) => {
          brandsInFlight = null;
          if (!error && data) {
            cachedBrands = data as unknown as Brand[];
            brandsTimestamp = Date.now();
            writeSessionCache(BRANDS_STORAGE_KEY, cachedBrands);
            return cachedBrands;
          }
          return [];
        }),
    ).catch(() => {
      brandsInFlight = null;
      return [];
    });
  }

  return brandsInFlight;
}

export function invalidateCategoryCache(): void {
  cachedCategories = null;
  categoriesTimestamp = 0;
  categoriesInFlight = null;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(CATEGORIES_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

export function invalidateBrandCache(): void {
  cachedBrands = null;
  brandsTimestamp = 0;
  brandsInFlight = null;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(BRANDS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

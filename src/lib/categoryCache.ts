import { supabase } from './supabase';
import type { Category } from '../types';

let cachedCategories: Category[] | null = null;
let inFlightPromise: Promise<Category[]> | null = null;

export async function getCachedActiveCategories(limit = 12): Promise<Category[]> {
  if (cachedCategories) {
    return cachedCategories.slice(0, limit);
  }
  if (!supabase) return [];
  if (!inFlightPromise) {
    inFlightPromise = Promise.resolve(
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(20)
        .then(({ data, error }) => {
          inFlightPromise = null;
          if (!error && data) {
            cachedCategories = data as Category[];
            return cachedCategories;
          }
          return [];
        }),
    ).catch(() => {
      inFlightPromise = null;
      return [];
    });
  }
  const all = await inFlightPromise;
  return all.slice(0, limit);
}

export function invalidateCategoryCache(): void {
  cachedCategories = null;
  inFlightPromise = null;
}

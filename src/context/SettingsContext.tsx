import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORE_DEFAULTS } from '../config/constants';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { StoreSettings } from '../types';

interface SettingsContextValue {
  settings: StoreSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  store_name_bn: 'মার্টবাড়ি',
  store_name_en: STORE_DEFAULTS.brandName,
  logo_url: null,
  favicon_url: null,
  phone: STORE_DEFAULTS.phone,
  whatsapp: STORE_DEFAULTS.whatsapp,
  email: STORE_DEFAULTS.email,
  address_bn: 'ঢাকা, বাংলাদেশ',
  address_en: 'Dhaka, Bangladesh',
  facebook_url: 'https://facebook.com/martbari',
  instagram_url: 'https://instagram.com/martbari',
  tiktok_url: 'https://tiktok.com/@martbari',
  youtube_url: 'https://youtube.com/@martbari',
  delivery_charge_dhaka: STORE_DEFAULTS.deliveryDhaka,
  delivery_charge_outside: STORE_DEFAULTS.deliveryOutside,
  free_delivery_above: STORE_DEFAULTS.freeDeliveryAbove,
  bkash_number: null,
  nagad_number: null,
  payment_note_bn: null,
  payment_note_en: null,
  announcement_bn: '৳৩,০০০+ অর্ডারে ফ্রি ডেলিভারি! সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা।',
  announcement_en: 'Free delivery on orders above ৳3,000! Cash on Delivery all over Bangladesh.',
  facebook_pixel_id: null,
  google_analytics_id: null,
  min_order_amount: 300,
  maintenance_mode: false,
  show_demo_data: true,
  updated_at: '',
};

const SETTINGS_CACHE_KEY = 'martbari_settings_cache_v1';

function loadCachedSettings(): StoreSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreSettings;
    return parsed && typeof parsed.id === 'number' ? { ...DEFAULT_SETTINGS, ...parsed } : null;
  } catch {
    return null;
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialCached = useMemo(() => loadCachedSettings(), []);
  const [settings, setSettings] = useState<StoreSettings>(initialCached ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured && !initialCached);

  const refreshSettings = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        const s = data as StoreSettings;
        setSettings(s);
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(s));
          } catch {
            // Ignore storage quota errors
          }
          if (s.number_style) {
            localStorage.setItem('martbari_number_style', s.number_style);
          }
        }
      }
    } catch {
      // Keep cached/default settings if DB table is unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, refreshSettings }),
    [settings, loading, refreshSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettingsContext must be used inside SettingsProvider');
  }
  return ctx;
}

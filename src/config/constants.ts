export const STORE_DEFAULTS = {
  brandName: 'MartBari',
  taglineEn: 'Your One-Stop Online Shop',
  taglineBn: 'আপনার এক ঠিকানার অনলাইন শপ',
  phone: '+880 1770-501652',
  whatsapp: '8801770501652',
  email: 'martbari.shop@gmail.com',
  deliveryDhaka: 70,
  deliveryOutside: 130,
  freeDeliveryAbove: 3000,
  storageKeyLang: 'martbari_lang',
  storageKeyCart: 'martbari_cart',
} as const;

export const SUPPORTED_LANGUAGES = ['bn', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'bn';

import {
  CATEGORY_DEMO_IMAGES,
  HERO_BANNER_IMAGES,
} from './demoImages';

export const DEMO_IMAGES = {
  hero: HERO_BANNER_IMAGES['smart-watches'],
  smartwatch: CATEGORY_DEMO_IMAGES['smart-watches'],
  earbuds: CATEGORY_DEMO_IMAGES.earbuds,
  headphones: CATEGORY_DEMO_IMAGES.headphones,
  appliance: CATEGORY_DEMO_IMAGES['home-appliances'],
  lighting: CATEGORY_DEMO_IMAGES.lighting,
  accessories: CATEGORY_DEMO_IMAGES['mobile-accessories'],
} as const;

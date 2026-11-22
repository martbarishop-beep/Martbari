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

export const DEMO_IMAGES = {
  hero: '/src/assets/images/hero_martbari_electronics_1795324259609.jpg',
  smartwatch: '/src/assets/images/product_smartwatch_amoled_1795324259497.jpg',
  earbuds: '/src/assets/images/product_wireless_earbuds_1795324259716.jpg',
  appliance: '/src/assets/images/product_home_appliance_1795324259653.jpg',
} as const;

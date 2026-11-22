import {
  BRAND_DEMO_LOGOS,
  CATEGORY_DEMO_IMAGES,
  HERO_SLIDE_PRESETS,
  PRODUCT_DEMO_IMAGES_BY_SLUG,
} from './demoImages';

export interface DemoProductSeedItem {
  name_bn: string;
  name_en: string;
  slug: string;
  short_desc_bn: string;
  short_desc_en: string;
  description_bn: string;
  description_en: string;
  price: number;
  sale_price: number | null;
  cost_price: number;
  stock: number;
  sku: string;
  brandSlug: string;
  catSlug: string;
  warranty_bn: string;
  warranty_en: string;
  weight_grams: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  estimated_delivery_days: number;
}

export const DEMO_CATEGORIES = [
  {
    name_bn: 'স্মার্ট ওয়াচ',
    name_en: 'Smart Watches',
    slug: 'smart-watches',
    image_url: CATEGORY_DEMO_IMAGES['smart-watches'],
    sort_order: 1,
    is_active: true,
  },
  {
    name_bn: 'হেডফোন',
    name_en: 'Headphones',
    slug: 'headphones',
    image_url: CATEGORY_DEMO_IMAGES.headphones,
    sort_order: 2,
    is_active: true,
  },
  {
    name_bn: 'ইয়ারবাডস',
    name_en: 'Earbuds',
    slug: 'earbuds',
    image_url: CATEGORY_DEMO_IMAGES.earbuds,
    sort_order: 3,
    is_active: true,
  },
  {
    name_bn: 'হোম অ্যাপ্লায়েন্স',
    name_en: 'Home Appliances',
    slug: 'home-appliances',
    image_url: CATEGORY_DEMO_IMAGES['home-appliances'],
    sort_order: 4,
    is_active: true,
  },
  {
    name_bn: 'লাইটিং',
    name_en: 'Lighting',
    slug: 'lighting',
    image_url: CATEGORY_DEMO_IMAGES.lighting,
    sort_order: 5,
    is_active: true,
  },
  {
    name_bn: 'মোবাইল এক্সেসরিজ',
    name_en: 'Mobile Accessories',
    slug: 'mobile-accessories',
    image_url: CATEGORY_DEMO_IMAGES['mobile-accessories'],
    sort_order: 6,
    is_active: true,
  },
];

export const DEMO_BRANDS = [
  { name: 'ApexTime', slug: 'apextime', logo_url: BRAND_DEMO_LOGOS.apextime, is_active: true },
  { name: 'SoundWave', slug: 'soundwave', logo_url: BRAND_DEMO_LOGOS.soundwave, is_active: true },
  { name: 'LuminaHome', slug: 'luminahome', logo_url: BRAND_DEMO_LOGOS.luminahome, is_active: true },
];

export const DEMO_SUPPLIERS = [
  {
    name: 'Dhaka Gadget Wholesale',
    phone: '+8801711000101',
    whatsapp: '8801711000101',
    email: 'wholesale@dhakagadget.example',
    address: 'Gulistan Tech Market, Dhaka',
    notes: 'Primary smartwatch and earbuds supplier',
    is_active: true,
  },
  {
    name: 'Chattogram Home Tech Hub',
    phone: '+8801811000202',
    whatsapp: '8801811000202',
    email: 'orders@ctghometech.example',
    address: 'Agrabad Commercial Area, Chattogram',
    notes: 'Home appliances and smart lighting supplier',
    is_active: true,
  },
];

export const DEMO_PRODUCTS: DemoProductSeedItem[] = [
  {
    name_bn: 'এপেক্সটাইম প্রো অ্যামোলেড স্মার্ট ওয়াচ',
    name_en: 'ApexTime Pro AMOLED Smart Watch',
    slug: 'apextime-pro-amoled-watch',
    short_desc_bn: '১.৪৩" অ্যামোলেড ডিসপ্লে ও ব্লুটুথ কলিং সুবিধা',
    short_desc_en: '1.43" AMOLED display with Bluetooth calling & 7-day battery',
    description_bn:
      'দৈনন্দিন ফিটনেস ট্র্যাকিং, হার্ট রেট মনিটর, IP68 ওয়াটার রেজিস্ট্যান্স এবং স্পষ্ট অ্যামোলেড স্ক্রিন সহ স্মার্টওয়াচ।',
    description_en:
      'Built with a vibrant 1.43-inch AMOLED display, Bluetooth calling, SpO2 & heart-rate monitoring, and IP68 water resistance.',
    price: 3490,
    sale_price: 2990,
    cost_price: 2050,
    stock: 4,
    sku: 'MB-SW-001',
    brandSlug: 'apextime',
    catSlug: 'smart-watches',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 160,
    is_active: true,
    is_featured: true,
    is_new: true,
    estimated_delivery_days: 2,
  },
  {
    name_bn: 'এপেক্সটাইম আল্ট্রা ফিটনেস ওয়াচ',
    name_en: 'ApexTime Ultra Fitness Watch',
    slug: 'apextime-ultra-fitness-watch',
    short_desc_bn: 'স্পোর্টস মোড ও দীর্ঘস্থায়ী ব্যাটারি ব্যাকআপ',
    short_desc_en: 'Rugged titanium-style bezel with 100+ sports modes',
    description_bn:
      'অ্যাক্টিভ লাইফস্টাইলের জন্য উপযোগী মাল্টি-স্পোর্টস স্মার্টওয়াচ, স্লিপ ট্র্যাকিং ও ফাস্ট চার্জিং সাপোর্ট।',
    description_en:
      'Designed for active users with 100+ workout modes, sleep analytics, and magnetic fast charging.',
    price: 2850,
    sale_price: 2490,
    cost_price: 1680,
    stock: 30,
    sku: 'MB-SW-002',
    brandSlug: 'apextime',
    catSlug: 'smart-watches',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 180,
    is_active: true,
    is_featured: false,
    is_new: true,
    estimated_delivery_days: 2,
  },
  {
    name_bn: 'এপেক্সটাইম লাইট স্লিম স্মার্ট ওয়াচ',
    name_en: 'ApexTime Lite Slim Watch',
    slug: 'apextime-lite-slim-watch',
    short_desc_bn: 'হালকা ওজন ও সহজ বাংলা নোটিফিকেশন সাপোর্ট',
    short_desc_en: 'Featherweight everyday watch with clear notifications',
    description_bn:
      'হালকা ডিজাইন, সারাদিনের স্টেপ কাউন্টার ও স্মার্টফোন নোটিফিকেশন এলার্ট সহ নির্ভরযোগ্য ঘড়ি।',
    description_en:
      'Lightweight daily smartwatch featuring step tracking, call alerts, and up to 10 days standby.',
    price: 1890,
    sale_price: null,
    cost_price: 1150,
    stock: 40,
    sku: 'MB-SW-003',
    brandSlug: 'apextime',
    catSlug: 'smart-watches',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 120,
    is_active: true,
    is_featured: false,
    is_new: false,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'সাউন্ডওয়েভ এএনসি স্টুডিও হেডফোন',
    name_en: 'SoundWave ANC Studio Headphones',
    slug: 'soundwave-anc-studio-headphones',
    short_desc_bn: 'অ্যাক্টিভ নয়েজ ক্যান্সেলেশন ও ৪০ ঘণ্টা প্লেটাইম',
    short_desc_en: 'Hybrid Active Noise Cancellation with 40H battery life',
    description_bn:
      'ডিপ বেস, সফট মেমোরি-ফোম ইয়ারকাপ এবং ইউএসবি-সি ফাস্ট চার্জিং সহ প্রিমিয়াম ওয়্যারলেস হেডফোন।',
    description_en:
      'Over-ear wireless headphones with hybrid ANC, plush memory foam earcups, and USB-C fast charging.',
    price: 4490,
    sale_price: 3890,
    cost_price: 2650,
    stock: 18,
    sku: 'MB-HP-001',
    brandSlug: 'soundwave',
    catSlug: 'headphones',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 320,
    is_active: true,
    is_featured: true,
    is_new: true,
    estimated_delivery_days: 2,
  },
  {
    name_bn: 'সাউন্ডওয়েভ বেস প্রো ওয়্যারলেস হেডফোন',
    name_en: 'SoundWave Bass Pro Wireless',
    slug: 'soundwave-bass-pro-wireless',
    short_desc_bn: 'ফোল্ডেবল ডিজাইন ও ক্লিয়ার কল মাইক্রোফোন',
    short_desc_en: 'Foldable wireless headset with dual-device pairing',
    description_bn:
      'ক্লাস, মিটিং ও মিউজিকের জন্য আরামদায়ক হেডফোন। তারযুক্ত ও ওয়্যারলেস দুই মোডেই ব্যবহারযোগ্য।',
    description_en:
      'Dual-mode wired and Bluetooth headset ideal for online classes, work calls, and daily travel.',
    price: 2250,
    sale_price: 1950,
    cost_price: 1320,
    stock: 28,
    sku: 'MB-HP-002',
    brandSlug: 'soundwave',
    catSlug: 'headphones',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 260,
    is_active: true,
    is_featured: false,
    is_new: false,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'সাউন্ডওয়েভ পডস প্রো ইয়ারবাডস',
    name_en: 'SoundWave Pods Pro Earbuds',
    slug: 'soundwave-pods-pro-earbuds',
    short_desc_bn: 'ইএনসি কোয়াড মাইক ও ৩০ ঘণ্টা কেস ব্যাকআপ',
    short_desc_en: 'Quad-mic ENC call clarity & 30-hour charging case',
    description_bn:
      'পরিষ্কার ভয়েস কল, লো-ল্যাটেন্সি গেমিং মোড এবং IPX5 স্প্ল্যাশ রেজিস্ট্যান্স সহ ট্রু ওয়্যারলেস ইয়ারবাডস।',
    description_en:
      'True wireless earbuds delivering crisp ENC calls, low-latency gaming mode, and IPX5 sweat protection.',
    price: 1790,
    sale_price: 1490,
    cost_price: 920,
    stock: 3,
    sku: 'MB-EB-001',
    brandSlug: 'soundwave',
    catSlug: 'earbuds',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 95,
    is_active: true,
    is_featured: true,
    is_new: true,
    estimated_delivery_days: 2,
  },
  {
    name_bn: 'সাউন্ডওয়েভ মিনি এয়ার বাডস',
    name_en: 'SoundWave Mini Air Buds',
    slug: 'soundwave-mini-air-buds',
    short_desc_bn: 'কম্প্যাক্ট পকেট কেস ও টাচ কন্ট্রোল',
    short_desc_en: 'Pocket-friendly case with instant auto-pairing',
    description_bn:
      'দৈনন্দিন যাতায়াতের জন্য ছোট ও আরামদায়ক ইয়ারবাডস, টাচ সেন্সর ও ফাস্ট পেয়ারিং সহ।',
    description_en:
      'Ultra-compact earbuds with tactile touch controls and reliable Bluetooth 5.3 connection.',
    price: 1150,
    sale_price: 990,
    cost_price: 620,
    stock: 65,
    sku: 'MB-EB-002',
    brandSlug: 'soundwave',
    catSlug: 'earbuds',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 80,
    is_active: true,
    is_featured: false,
    is_new: false,
    estimated_delivery_days: 2,
  },
  {
    name_bn: 'সাউন্ডওয়েভ গেমিং লো-ল্যাটেন্সি বাডস',
    name_en: 'SoundWave Gaming Buds X',
    slug: 'soundwave-gaming-buds-x',
    short_desc_bn: '৪৫ms আল্ট্রা লো-ল্যাটেন্সি গেমিং মোড',
    short_desc_en: '45ms ultra-low latency mode for mobile gaming',
    description_bn: 'মোবাইল গেমারদের জন্য নিখুঁত সাউন্ড সিঙ্ক ও ডুয়াল মোড ইয়ারবাডস।',
    description_en:
      'Tuned for mobile esports with 45ms low-latency audio sync and crisp spatial footsteps.',
    price: 1550,
    sale_price: null,
    cost_price: 940,
    stock: 35,
    sku: 'MB-EB-003',
    brandSlug: 'soundwave',
    catSlug: 'earbuds',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 105,
    is_active: true,
    is_featured: false,
    is_new: true,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'লুমিনাহোম ডিজিটাল ইলেকট্রিক কেটলি',
    name_en: 'LuminaHome Digital Smart Kettle',
    slug: 'luminahome-digital-smart-kettle',
    short_desc_bn: 'টেম্পারেচার কন্ট্রোল ও ফুড-গ্রেড স্টেইনলেস স্টিল',
    short_desc_en: 'Precision temperature control & 304 stainless steel body',
    description_bn:
      '১.৫ লিটার ক্যাপাসিটি, ডিজিটাল এলইডি ডিসপ্লে ও অটো শাট-অফ নিরাপত্তা সহ আধুনিক ইলেকট্রিক কেটলি।',
    description_en:
      '1.5L electric kettle with real-time LED temperature readout, keep-warm mode, and boil-dry protection.',
    price: 2950,
    sale_price: 2590,
    cost_price: 1780,
    stock: 22,
    sku: 'MB-HA-001',
    brandSlug: 'luminahome',
    catSlug: 'home-appliances',
    warranty_bn: '১ বছরের ওয়ারেন্টি',
    warranty_en: '1 Year Warranty',
    weight_grams: 1150,
    is_active: true,
    is_featured: true,
    is_new: true,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'লুমিনাহোম পোর্টেবল রিচার্জেবল ব্লেন্ডার',
    name_en: 'LuminaHome Portable USB Blender',
    slug: 'luminahome-portable-usb-blender',
    short_desc_bn: '৬ ব্লেড ও টাইপ-সি চার্জিং জুসার',
    short_desc_en: '6-blade stainless cutter for smoothies anywhere',
    description_bn:
      'ফ্রেশ জুস ও স্মুদি তৈরির জন্য ৩৮০ মিলি পোর্টেবল রিচার্জেবল ব্লেন্ডার।',
    description_en:
      '380ml BPA-free travel blender powered by USB-C rechargeable battery for instant shakes.',
    price: 1390,
    sale_price: 1190,
    cost_price: 740,
    stock: 42,
    sku: 'MB-HA-002',
    brandSlug: 'luminahome',
    catSlug: 'home-appliances',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 480,
    is_active: true,
    is_featured: false,
    is_new: false,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'লুমিনাহোম মিনি ডেস্ক এয়ার কুলার ফ্যান',
    name_en: 'LuminaHome Mist Desk Fan',
    slug: 'luminahome-mist-desk-fan',
    short_desc_bn: 'রিচার্জেবল মিস্ট কুলিং ও ৩ স্পিড মোড',
    short_desc_en: '3-speed quiet desk fan with cooling mist tank',
    description_bn:
      'গরমে আরামদায়ক বাতাস ও হালকা মিস্ট কুলিং সুবিধা, লো-নয়েজ মোটর সহ।',
    description_en:
      'Whisper-quiet personal cooling fan with 3 airflow levels and built-in rechargeable battery.',
    price: 1650,
    sale_price: null,
    cost_price: 980,
    stock: 27,
    sku: 'MB-HA-003',
    brandSlug: 'luminahome',
    catSlug: 'home-appliances',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 650,
    is_active: true,
    is_featured: false,
    is_new: false,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'লুমিনাহোম আই-কেয়ার এলইডি ডেস্ক ল্যাম্প',
    name_en: 'LuminaHome Eye-Care Desk Lamp',
    slug: 'luminahome-eyecare-desk-lamp',
    short_desc_bn: 'টাচ ডিমিং ও ৩টি কালার টেম্পারেচার মোড',
    short_desc_en: 'Flicker-free reading lamp with stepless touch dimming',
    description_bn:
      'পড়াশোনা ও অফিস ডেস্কের জন্য চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি টেবিল ল্যাম্প, রিচার্জেবল ব্যাকআপ সহ।',
    description_en:
      'Architect-style foldable LED desk lamp offering warm, neutral, and daylight modes with USB backup.',
    price: 1490,
    sale_price: 1290,
    cost_price: 810,
    stock: 33,
    sku: 'MB-LT-001',
    brandSlug: 'luminahome',
    catSlug: 'lighting',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 520,
    is_active: true,
    is_featured: true,
    is_new: false,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'লুমিনাহোম মোশন সেন্সর ওয়্যারলেস লাইট',
    name_en: 'LuminaHome Motion Sensor Bar Light',
    slug: 'luminahome-motion-sensor-light',
    short_desc_bn: 'ম্যাগনেটিক মাউন্ট ও অটো মোশন ডিটেকশন',
    short_desc_en: 'Magnetic under-cabinet USB rechargeable sensor light',
    description_bn:
      'ওয়ার্ডরোব, রান্নাঘর বা সিঁড়ির জন্য অটো মোশন সেন্সর রিচার্জেবল এলইডি লাইট।',
    description_en:
      'Installs in seconds with magnetic adhesive strips and lights up automatically on motion detection.',
    price: 750,
    sale_price: 650,
    cost_price: 380,
    stock: 60,
    sku: 'MB-LT-002',
    brandSlug: 'luminahome',
    catSlug: 'lighting',
    warranty_bn: '৩ মাসের ওয়ারেন্টি',
    warranty_en: '3 Months Warranty',
    weight_grams: 190,
    is_active: true,
    is_featured: false,
    is_new: true,
    estimated_delivery_days: 3,
  },
  {
    name_bn: 'এপেক্সটাইম ১০,০০০ এমএএইচ ফাস্ট পাওয়ার ব্যাংক',
    name_en: 'ApexTime 10000mAh 22.5W Power Bank',
    slug: 'apextime-10000mah-power-bank',
    short_desc_bn: '২২.৫ ওয়াট পিডি ফাস্ট চার্জিং ও ডিজিটাল ডিসপ্লে',
    short_desc_en: '22.5W PD fast charging with LED percentage readout',
    description_bn: 'স্লিম পকেট-সাইজ পাওয়ার ব্যাংক, টাইপ-সি ও ডুয়াল ইউএসবি আউটপুট সহ।',
    description_en:
      'Compact 10000mAh power bank supporting 22.5W PD/QC fast charging for phones and accessories.',
    price: 1590,
    sale_price: 1390,
    cost_price: 910,
    stock: 45,
    sku: 'MB-MA-001',
    brandSlug: 'apextime',
    catSlug: 'mobile-accessories',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 240,
    is_active: true,
    is_featured: true,
    is_new: false,
    estimated_delivery_days: 2,
  },
  {
    name_bn: 'এপেক্সটাইম ৩৩ ওয়াট গাণ ফাস্ট চার্জার ও কেবল',
    name_en: 'ApexTime 33W GaN Fast Charger Kit',
    slug: 'apextime-33w-gan-charger-kit',
    short_desc_bn: 'ইউএসবি-সি + ইউএসবি-এ ডুয়াল পোর্ট ও ব্রেইডেড কেবল',
    short_desc_en: 'Dual-port 33W GaN adapter with 1.5m braided USB-C cable',
    description_bn:
      'স্মার্টফোন, ট্যাবলেট ও ইয়ারবাডসের নিরাপদ ও দ্রুত চার্জিংয়ের জন্য কমপ্যাক্ট GaN চার্জার।',
    description_en:
      'Cool-running 33W GaN wall charger with dual USB-C & USB-A outputs plus durable braided cable.',
    price: 890,
    sale_price: 790,
    cost_price: 470,
    stock: 55,
    sku: 'MB-MA-002',
    brandSlug: 'apextime',
    catSlug: 'mobile-accessories',
    warranty_bn: '৬ মাসের ওয়ারেন্টি',
    warranty_en: '6 Months Warranty',
    weight_grams: 130,
    is_active: true,
    is_featured: false,
    is_new: true,
    estimated_delivery_days: 2,
  },
];

export const DEMO_CATEGORY_SLUGS = DEMO_CATEGORIES.map((c) => c.slug);
export const DEMO_BRAND_SLUGS = DEMO_BRANDS.map((b) => b.slug);
export const DEMO_SUPPLIER_NAMES = DEMO_SUPPLIERS.map((s) => s.name);
export const DEMO_PRODUCT_SLUGS = Array.from(
  new Set([...DEMO_PRODUCTS.map((p) => p.slug), ...Object.keys(PRODUCT_DEMO_IMAGES_BY_SLUG)]),
);
export const DEMO_PRODUCT_SKUS = DEMO_PRODUCTS.map((p) => p.sku);
export const DEMO_BANNER_LINKS = Array.from(
  new Set([...HERO_SLIDE_PRESETS.map((b) => b.linkUrl), '/category/lighting']),
);

const DEMO_CAT_SET = new Set(DEMO_CATEGORY_SLUGS);
const DEMO_BRAND_SET = new Set(DEMO_BRAND_SLUGS);
const DEMO_PROD_SLUG_SET = new Set(DEMO_PRODUCT_SLUGS);
const DEMO_PROD_SKU_SET = new Set(DEMO_PRODUCT_SKUS);
const DEMO_BANNER_LINK_SET = new Set(DEMO_BANNER_LINKS);
const DEMO_BANNER_IMG_SET = new Set(HERO_SLIDE_PRESETS.map((b) => b.imageUrl));

export function isDemoProduct(item: { id?: string; slug?: string; sku?: string | null }): boolean {
  if (item.id && item.id.startsWith('demo-')) return true;
  if (item.slug && DEMO_PROD_SLUG_SET.has(item.slug)) return true;
  if (item.sku && (DEMO_PROD_SKU_SET.has(item.sku) || item.sku.startsWith('DEMO-'))) return true;
  return false;
}

export function isDemoCategory(item: { id?: string; slug?: string }): boolean {
  if (item.id && /^c\d+$/.test(item.id)) return true;
  return Boolean(item.slug && DEMO_CAT_SET.has(item.slug));
}

export function isDemoBrand(item: { slug?: string }): boolean {
  return Boolean(item.slug && DEMO_BRAND_SET.has(item.slug));
}

export function isDemoBanner(item: {
  id?: string;
  link_url?: string | null;
  image_url?: string | null;
}): boolean {
  if (item.id && item.id.startsWith('slide-')) return true;
  if (item.link_url && DEMO_BANNER_LINK_SET.has(item.link_url)) return true;
  if (item.image_url && DEMO_BANNER_IMG_SET.has(item.image_url)) return true;
  return false;
}

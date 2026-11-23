import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BatteryCharging,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Lightbulb,
  Package,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Star,
  Truck,
  Watch,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import type { ProductReviewStats, StorefrontProduct } from '../components/QuickViewModal';
import { Button, EmptyState, ErrorState, Skeleton } from '../components/ui';
import {
  isDemoBanner,
  isDemoCategory,
  isDemoProduct,
} from '../config/demoCatalog';
import {
  CATEGORY_DEMO_IMAGES,
  EDITORIAL_DEMO_IMAGES,
  HERO_PROMO_IMAGES,
  HERO_SLIDE_PRESETS,
  PRODUCT_DEMO_IMAGES_BY_SLUG,
  type DemoCategoryKey,
  type HeroSlidePreset,
} from '../config/demoImages';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { formatNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type {
  Banner,
  Brand,
  Category,
  ProductImage as DbProductImage,
  PublicProduct,
  Review,
} from '../types';

type CuratedTab = 'featured' | 'new' | 'best_sellers';

interface EnrichedHeroSlide {
  id: string;
  imageUrl: string;
  labelBn: string;
  labelEn: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  priceBadgeBn: string;
  priceBadgeEn: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  secondaryCtaBn: string;
  secondaryCtaEn: string;
  linkUrl: string;
  secondaryLinkUrl: string;
  categoryKey: DemoCategoryKey;
}

function getCategoryShortcutIcon(slug: string) {
  const s = slug.toLowerCase();
  if (s.includes('watch')) return Watch;
  if (s.includes('headphone') || s.includes('earbud') || s.includes('audio')) return Headphones;
  if (s.includes('light')) return Lightbulb;
  if (s.includes('appliance') || s.includes('home')) return Zap;
  if (s.includes('power') || s.includes('charger')) return BatteryCharging;
  if (s.includes('mobile') || s.includes('accessor')) return Smartphone;
  return Package;
}

function formatTwoDigit(value: number, lang: 'bn' | 'en'): string {
  const padded = String(value).padStart(2, '0');
  if (lang === 'en') return padded;
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return padded.replace(/\d/g, (d) => bnDigits[Number(d)] ?? d);
}

interface HeroMediaImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  eager?: boolean;
  categoryKey: DemoCategoryKey;
  className?: string;
}

const HeroMediaImage: React.FC<HeroMediaImageProps> = ({
  src,
  alt,
  width,
  height,
  eager = false,
  categoryKey,
  className,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const FallbackIcon = getCategoryShortcutIcon(categoryKey);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0F1B30] via-[#17263E] to-[#273B5E] relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#F47125]/18 blur-2xl"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-[#FF9D5C] backdrop-blur-sm">
          <FallbackIcon className="h-9 w-9" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

function matchHeroPreset(banner: Banner, idx: number): HeroSlidePreset | null {
  const link = (banner.link_url || '').toLowerCase();
  return (
    HERO_SLIDE_PRESETS.find((preset) =>
      link.includes(preset.category) || link === preset.linkUrl,
    ) ?? (idx < HERO_SLIDE_PRESETS.length ? HERO_SLIDE_PRESETS[idx] : null)
  );
}

function isRemoteOrStaticImage(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('data:')
  );
}

function buildFallbackDemoProducts(): StorefrontProduct[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-1',
      name_bn: 'এপেক্সটাইম প্রো অ্যামোলেড স্মার্ট ওয়াচ',
      name_en: 'ApexTime Pro AMOLED Smart Watch',
      slug: 'apextime-pro-amoled-watch',
      short_desc_bn: '১.৪৩" অ্যামোলেড ডিসপ্লে ও ব্লুটুথ কলিং সুবিধা',
      short_desc_en: '1.43" AMOLED display with Bluetooth calling & 7-day battery',
      description_bn:
        'দৈনন্দিন ফিটনেস ট্র্যাকিং, হার্ট রেট মনিটর এবং IP68 ওয়াটার রেজিস্ট্যান্স সহ প্রিমিয়াম স্মার্টওয়াচ।',
      description_en:
        'Built with a vibrant 1.43-inch AMOLED display, Bluetooth calling, SpO2 monitoring, and IP68 water resistance.',
      specifications: [],
      price: 3490,
      sale_price: 2990,
      sale_starts_at: null,
      sale_ends_at: null,
      stock: 4,
      low_stock_threshold: 5,
      sku: 'MB-SW-001',
      barcode: null,
      brand_id: null,
      brand_name: 'ApexTime',
      category_id: null,
      category_slug: 'smart-watches',
      warranty_bn: '৬ মাসের ওয়ারেন্টি',
      warranty_en: '6 Months Warranty',
      weight_grams: 160,
      is_active: true,
      is_featured: true,
      is_new: true,
      track_stock: true,
      seo_title_bn: null,
      seo_title_en: null,
      seo_desc_bn: null,
      seo_desc_en: null,
      estimated_delivery_days: 2,
      created_at: now,
      updated_at: now,
      image_url: PRODUCT_DEMO_IMAGES_BY_SLUG['apextime-pro-amoled-watch'][0],
      image_urls: PRODUCT_DEMO_IMAGES_BY_SLUG['apextime-pro-amoled-watch'],
    },
    {
      id: 'demo-2',
      name_bn: 'সাউন্ডওয়েভ এএনসি স্টুডিও হেডফোন',
      name_en: 'SoundWave ANC Studio Headphones',
      slug: 'soundwave-anc-studio-headphones',
      short_desc_bn: 'অ্যাক্টিভ নয়েজ ক্যান্সেলেশন ও ৪০ ঘণ্টা প্লেটাইম',
      short_desc_en: 'Hybrid Active Noise Cancellation with 40H battery life',
      description_bn:
        'ডিপ বেস, সফট মেমোরি-ফোম ইয়ারকাপ এবং ইউএসবি-সি ফাস্ট চার্জিং সহ ওয়্যারলেস হেডফোন।',
      description_en:
        'Over-ear wireless headphones with hybrid ANC, plush memory foam earcups, and USB-C fast charging.',
      specifications: [],
      price: 4490,
      sale_price: 3890,
      sale_starts_at: null,
      sale_ends_at: null,
      stock: 18,
      low_stock_threshold: 5,
      sku: 'MB-HP-001',
      barcode: null,
      brand_id: null,
      brand_name: 'SoundWave',
      category_id: null,
      category_slug: 'headphones',
      warranty_bn: '৬ মাসের ওয়ারেন্টি',
      warranty_en: '6 Months Warranty',
      weight_grams: 320,
      is_active: true,
      is_featured: true,
      is_new: true,
      track_stock: true,
      seo_title_bn: null,
      seo_title_en: null,
      seo_desc_bn: null,
      seo_desc_en: null,
      estimated_delivery_days: 2,
      created_at: now,
      updated_at: now,
      image_url: PRODUCT_DEMO_IMAGES_BY_SLUG['soundwave-anc-studio-headphones'][0],
      image_urls: PRODUCT_DEMO_IMAGES_BY_SLUG['soundwave-anc-studio-headphones'],
    },
    {
      id: 'demo-3',
      name_bn: 'সাউন্ডওয়েভ পডস প্রো ইয়ারবাডস',
      name_en: 'SoundWave Pods Pro Earbuds',
      slug: 'soundwave-pods-pro-earbuds',
      short_desc_bn: 'ইএনসি কোয়াড মাইক ও ৩০ ঘণ্টা কেস ব্যাকআপ',
      short_desc_en: 'Quad-mic ENC call clarity & 30-hour charging case',
      description_bn:
        'পরিষ্কার ভয়েস কল, লো-ল্যাটেন্সি গেমিং মোড এবং IPX5 স্প্ল্যাশ রেজিস্ট্যান্স সহ ট্রু ওয়্যারলেস ইয়ারবাডস।',
      description_en:
        'True wireless earbuds delivering crisp ENC calls, low-latency gaming mode, and IPX5 sweat protection.',
      specifications: [],
      price: 1790,
      sale_price: 1490,
      sale_starts_at: null,
      sale_ends_at: null,
      stock: 3,
      low_stock_threshold: 5,
      sku: 'MB-EB-001',
      barcode: null,
      brand_id: null,
      brand_name: 'SoundWave',
      category_id: null,
      category_slug: 'earbuds',
      warranty_bn: '৬ মাসের ওয়ারেন্টি',
      warranty_en: '6 Months Warranty',
      weight_grams: 95,
      is_active: true,
      is_featured: true,
      is_new: true,
      track_stock: true,
      seo_title_bn: null,
      seo_title_en: null,
      seo_desc_bn: null,
      seo_desc_en: null,
      estimated_delivery_days: 2,
      created_at: now,
      updated_at: now,
      image_url: PRODUCT_DEMO_IMAGES_BY_SLUG['soundwave-pods-pro-earbuds'][0],
      image_urls: PRODUCT_DEMO_IMAGES_BY_SLUG['soundwave-pods-pro-earbuds'],
    },
    {
      id: 'demo-4',
      name_bn: 'লুমিনাহোম ডিজিটাল ইলেকট্রিক কেটলি',
      name_en: 'LuminaHome Digital Smart Kettle',
      slug: 'luminahome-digital-smart-kettle',
      short_desc_bn: 'টেম্পারেচার কন্ট্রোল ও ফুড-গ্রেড স্টেইনলেস স্টিল',
      short_desc_en: 'Precision temperature control & 304 stainless steel body',
      description_bn:
        '১.৫ লিটার ক্যাপাসিটি, ডিজিটাল এলইডি ডিসপ্লে ও অটো শাট-অফ নিরাপত্তা সহ আধুনিক ইলেকট্রিক কেটলি।',
      description_en:
        '1.5L electric kettle with real-time LED temperature readout, keep-warm mode, and boil-dry protection.',
      specifications: [],
      price: 2950,
      sale_price: 2590,
      sale_starts_at: null,
      sale_ends_at: null,
      stock: 22,
      low_stock_threshold: 5,
      sku: 'MB-HA-001',
      barcode: null,
      brand_id: null,
      brand_name: 'LuminaHome',
      category_id: null,
      category_slug: 'home-appliances',
      warranty_bn: '১ বছরের ওয়ারেন্টি',
      warranty_en: '1 Year Warranty',
      weight_grams: 1150,
      is_active: true,
      is_featured: true,
      is_new: true,
      track_stock: true,
      seo_title_bn: null,
      seo_title_en: null,
      seo_desc_bn: null,
      seo_desc_en: null,
      estimated_delivery_days: 3,
      created_at: now,
      updated_at: now,
      image_url: PRODUCT_DEMO_IMAGES_BY_SLUG['luminahome-digital-smart-kettle'][0],
      image_urls: PRODUCT_DEMO_IMAGES_BY_SLUG['luminahome-digital-smart-kettle'],
    },
    {
      id: 'demo-5',
      name_bn: 'লুমিনাহোম আই-কেয়ার এলইডি ডেস্ক ল্যাম্প',
      name_en: 'LuminaHome Eye-Care Desk Lamp',
      slug: 'luminahome-eyecare-desk-lamp',
      short_desc_bn: 'টাচ ডিমিং ও ৩টি কালার টেম্পারেচার মোড',
      short_desc_en: 'Flicker-free reading lamp with stepless touch dimming',
      description_bn:
        'পড়াশোনা ও অফিস ডেস্কের জন্য চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি টেবিল ল্যাম্প, রিচার্জেবল ব্যাকআপ সহ।',
      description_en:
        'Foldable LED desk lamp offering warm, neutral, and daylight modes with USB backup.',
      specifications: [],
      price: 1490,
      sale_price: 1290,
      sale_starts_at: null,
      sale_ends_at: null,
      stock: 33,
      low_stock_threshold: 5,
      sku: 'MB-LT-001',
      barcode: null,
      brand_id: null,
      brand_name: 'LuminaHome',
      category_id: null,
      category_slug: 'lighting',
      warranty_bn: '৬ মাসের ওয়ারেন্টি',
      warranty_en: '6 Months Warranty',
      weight_grams: 520,
      is_active: true,
      is_featured: true,
      is_new: false,
      track_stock: true,
      seo_title_bn: null,
      seo_title_en: null,
      seo_desc_bn: null,
      seo_desc_en: null,
      estimated_delivery_days: 3,
      created_at: now,
      updated_at: now,
      image_url: PRODUCT_DEMO_IMAGES_BY_SLUG['luminahome-eyecare-desk-lamp'][0],
      image_urls: PRODUCT_DEMO_IMAGES_BY_SLUG['luminahome-eyecare-desk-lamp'],
    },
  ];
}

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const showDemoData = settings.show_demo_data !== false;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandsMap, setBrandsMap] = useState<Map<string, Brand>>(new Map());
  const [reviewsStatsMap, setReviewsStatsMap] = useState<Map<string, ProductReviewStats>>(new Map());
  const [flashSaleProducts, setFlashSaleProducts] = useState<StorefrontProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<StorefrontProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<StorefrontProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<StorefrontProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [activeCollectionTab, setActiveCollectionTab] = useState<CuratedTab>('featured');

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isTouchingHero, setIsTouchingHero] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  const [openFaq, setOpenFaq] = useState<string | null>('q1');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadHomeData = useCallback(async () => {
    if (!supabase) {
      if (showDemoData) {
        const demo = buildFallbackDemoProducts();
        setFlashSaleProducts(demo.filter((p) => p.sale_price !== null));
        setFeaturedProducts(demo);
        setNewArrivals(demo.filter((p) => p.is_new));
        setBestSellers(demo);
      } else {
        setFlashSaleProducts([]);
        setFeaturedProducts([]);
        setNewArrivals([]);
        setBestSellers([]);
      }
      setBanners([]);
      setCategories([]);
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);
    try {
      const [
        { data: bannerData, error: bannerErr },
        { data: catData, error: catErr },
        { data: brandData },
        { data: allProductsData, error: prodErr },
        { data: reviewsData },
      ] = await Promise.all([
        supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.from('brands').select('*').eq('is_active', true),
        supabase
          .from('public_products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(36),
        supabase
          .from('reviews')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(60),
      ]);

      if (prodErr && catErr && bannerErr) {
        setHasError(true);
        return;
      }

      const filteredBanners = ((bannerData ?? []) as Banner[]).filter(
        (b) => showDemoData || !isDemoBanner(b),
      );
      setBanners(filteredBanners);

      const catList = ((catData ?? []) as Category[]).filter(
        (c) => showDemoData || !isDemoCategory(c),
      );
      setCategories(catList);
      const catSlugById = new Map<string, string>();
      catList.forEach((c) => catSlugById.set(c.id, c.slug));

      const bMap = new Map<string, Brand>();
      if (brandData) {
        (brandData as Brand[]).forEach((b) => bMap.set(b.id, b));
        setBrandsMap(bMap);
      }

      const rawProds = (allProductsData ?? []) as PublicProduct[];
      const prods = rawProds.filter((p) => showDemoData || !isDemoProduct(p));
      const allowedProdIds = new Set(prods.map((p) => p.id));

      if (reviewsData) {
        const allRevs = (reviewsData as Review[]).filter(
          (rev) => showDemoData || allowedProdIds.has(rev.product_id),
        );
        setReviews(allRevs.slice(0, 6));

        const statsMap = new Map<string, { sum: number; count: number }>();
        allRevs.forEach((rev) => {
          const prev = statsMap.get(rev.product_id) ?? { sum: 0, count: 0 };
          statsMap.set(rev.product_id, {
            sum: prev.sum + Number(rev.rating || 5),
            count: prev.count + 1,
          });
        });

        const finalStats = new Map<string, ProductReviewStats>();
        statsMap.forEach((val, key) => {
          finalStats.set(key, {
            avg: Number((val.sum / val.count).toFixed(1)),
            count: val.count,
          });
        });
        setReviewsStatsMap(finalStats);
      } else {
        setReviews([]);
      }

      if (prods.length > 0) {
        const ids = prods.map((p) => p.id);
        const { data: imgData } = await supabase
          .from('product_images')
          .select('product_id, image_url, sort_order')
          .in('product_id', ids)
          .order('sort_order', { ascending: true });

        const imageListMap = new Map<string, string[]>();
        (imgData as DbProductImage[] | null)?.forEach((img) => {
          const existing = imageListMap.get(img.product_id) ?? [];
          if (isRemoteOrStaticImage(img.image_url)) {
            existing.push(img.image_url);
            imageListMap.set(img.product_id, existing);
          }
        });

        const withImages: StorefrontProduct[] = prods.map((p) => {
          const slugUrls = showDemoData ? PRODUCT_DEMO_IMAGES_BY_SLUG[p.slug] ?? [] : [];
          const dbUrls = imageListMap.get(p.id) ?? [];
          const combined = dbUrls.length > 0 ? dbUrls : slugUrls;
          return {
            ...p,
            category_slug: p.category_id ? catSlugById.get(p.category_id) ?? null : null,
            image_url: combined[0] ?? null,
            image_urls: combined,
          };
        });

        setFlashSaleProducts(
          withImages.filter((p) => p.sale_price !== null && p.sale_price < p.price).slice(0, 5),
        );
        const featured = withImages.filter((p) => p.is_featured);
        const newer = withImages.filter((p) => p.is_new);
        setFeaturedProducts((featured.length > 0 ? featured : withImages).slice(0, 5));
        setNewArrivals((newer.length > 0 ? newer : withImages).slice(0, 5));
        setBestSellers(withImages.slice(0, 5));
      } else if (showDemoData) {
        const demo = buildFallbackDemoProducts();
        setFlashSaleProducts(demo.filter((p) => p.sale_price !== null));
        setFeaturedProducts(demo);
        setNewArrivals(demo.filter((p) => p.is_new));
        setBestSellers(demo);
      } else {
        setFlashSaleProducts([]);
        setFeaturedProducts([]);
        setNewArrivals([]);
        setBestSellers([]);
      }
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, [showDemoData]);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const heroSlides: EnrichedHeroSlide[] = useMemo(() => {
    if (banners.length === 0) {
      if (!showDemoData) return [];
      return HERO_SLIDE_PRESETS.map((p) => ({
        ...p,
        categoryKey: p.category,
      }));
    }

    const activeBanners =
      banners.length > 4 &&
      banners.some((b) => b.link_url === '/category/mobile-accessories') &&
      banners.some((b) => b.link_url === '/category/lighting')
        ? banners.filter((b) => b.link_url !== '/category/lighting')
        : banners;

    return activeBanners.slice(0, 4).map((b, idx) => {
      const preset = showDemoData ? matchHeroPreset(b, idx) : null;
      const imageUrl = isRemoteOrStaticImage(b.image_url)
        ? b.image_url
        : preset?.imageUrl || '';
      return {
        id: b.id,
        imageUrl,
        labelBn: b.label_bn || preset?.labelBn || t('brand.name'),
        labelEn: b.label_en || preset?.labelEn || t('brand.name'),
        titleBn: b.title_bn || preset?.titleBn || settings.store_name_bn,
        titleEn: b.title_en || preset?.titleEn || settings.store_name_en,
        subtitleBn: b.subtitle_bn || preset?.subtitleBn || t('hero.subtitle'),
        subtitleEn: b.subtitle_en || preset?.subtitleEn || t('hero.subtitle'),
        priceBadgeBn: b.price_badge_bn || preset?.priceBadgeBn || t('hero.defaultPriceBadge'),
        priceBadgeEn: b.price_badge_en || preset?.priceBadgeEn || t('hero.defaultPriceBadge'),
        primaryCtaBn: b.button_text_bn || preset?.primaryCtaBn || t('hero.shopNow'),
        primaryCtaEn: b.button_text_en || preset?.primaryCtaEn || t('hero.shopNow'),
        secondaryCtaBn: b.secondary_button_text_bn || preset?.secondaryCtaBn || t('hero.viewOffers'),
        secondaryCtaEn: b.secondary_button_text_en || preset?.secondaryCtaEn || t('hero.viewOffers'),
        linkUrl: b.link_url || preset?.linkUrl || '/shop',
        secondaryLinkUrl: b.secondary_link_url || preset?.secondaryLinkUrl || '/shop?on_sale=true',
        categoryKey: preset?.category || 'smart-watches',
      };
    });
  }, [banners, showDemoData, settings.store_name_bn, settings.store_name_en, t]);

  useEffect(() => {
    if (activeBannerIndex >= heroSlides.length) {
      setActiveBannerIndex(0);
    }
  }, [activeBannerIndex, heroSlides.length]);

  useEffect(() => {
    if (
      heroSlides.length <= 1 ||
      isHeroHovered ||
      isHeroPaused ||
      isTouchingHero ||
      prefersReducedMotion
    ) {
      return;
    }
    const interval = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroSlides.length, isHeroHovered, isHeroPaused, isTouchingHero, prefersReducedMotion]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouchingHero(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && heroSlides.length > 1) {
      const diff = touchStartXRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length);
        } else {
          setActiveBannerIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
        }
      }
    }
    touchStartXRef.current = null;
    setIsTouchingHero(false);
  };

  const handleHeroKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (heroSlides.length <= 1) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveBannerIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    }
  };

  const displayCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((cat) => {
        const key = cat.slug as DemoCategoryKey;
        const verifiedImg = isRemoteOrStaticImage(cat.image_url)
          ? cat.image_url
          : showDemoData
          ? CATEGORY_DEMO_IMAGES[key] ?? null
          : null;
        return { ...cat, image_url: verifiedImg };
      });
    }
    if (!showDemoData) return [];
    return [
      { id: 'c1', name_bn: 'স্মার্ট ওয়াচ', name_en: 'Smart Watches', slug: 'smart-watches', image_url: CATEGORY_DEMO_IMAGES['smart-watches'] },
      { id: 'c2', name_bn: 'হেডফোন', name_en: 'Headphones', slug: 'headphones', image_url: CATEGORY_DEMO_IMAGES.headphones },
      { id: 'c3', name_bn: 'ইয়ারবাডস', name_en: 'Earbuds', slug: 'earbuds', image_url: CATEGORY_DEMO_IMAGES.earbuds },
      { id: 'c4', name_bn: 'হোম অ্যাপ্লায়েন্স', name_en: 'Home Appliances', slug: 'home-appliances', image_url: CATEGORY_DEMO_IMAGES['home-appliances'] },
      { id: 'c5', name_bn: 'লাইটিং', name_en: 'Lighting', slug: 'lighting', image_url: CATEGORY_DEMO_IMAGES.lighting },
      { id: 'c6', name_bn: 'মোবাইল এক্সেসরিজ', name_en: 'Mobile Accessories', slug: 'mobile-accessories', image_url: CATEGORY_DEMO_IMAGES['mobile-accessories'] },
    ] as Pick<Category, 'id' | 'name_bn' | 'name_en' | 'slug' | 'image_url'>[];
  }, [categories, showDemoData]);

  const slimTrustItems = [
    { icon: Truck, label: t('home.trustCodShort') },
    { icon: Clock, label: t('home.trustFastShort') },
    { icon: RotateCcw, label: t('home.trustReturnShort') },
    { icon: ShieldCheck, label: t('home.trustAuthenticShort') },
  ];

  const activeCollectionProducts =
    activeCollectionTab === 'featured'
      ? featuredProducts
      : activeCollectionTab === 'new'
      ? newArrivals
      : bestSellers;

  const activeCollectionViewAllUrl =
    activeCollectionTab === 'new'
      ? localizedPath('/shop?sort=newest')
      : activeCollectionTab === 'best_sellers'
      ? localizedPath('/shop?sort=popular')
      : localizedPath('/shop');

  const storeDisplayName =
    (lang === 'bn' ? settings.store_name_bn : settings.store_name_en) || t('brand.name');

  const demoFallbackReviews = [
    {
      name: 'তানভীর আহমেদ',
      nameEn: 'Tanvir Ahmed',
      comment:
        'স্মার্টওয়াচটি অর্ডার করার পরদিনই ঢাকায় ডেলিভারি পেয়েছি। কোয়ালিটি চমৎকার এবং ব্যাটারি ব্যাকআপ এক সপ্তাহ থাকে!',
      commentEn:
        'Received my smartwatch the very next day in Dhaka. Premium build and the battery easily lasts a full week!',
    },
    {
      name: 'ফারহানা ইসলাম',
      nameEn: 'Farhana Islam',
      comment:
        'ইয়ারবাডসের সাউন্ড এবং কলিং কোয়ালিটি খুব পরিষ্কার। ডেলিভারি ম্যানের সামনে চেক করে টাকা দেওয়ার সুবিধা পেয়ে খুব নিশ্চিন্ত লেগেছে।',
      commentEn:
        'Sound and ENC call clarity are superb. Loved the ability to inspect the package before paying the rider.',
    },
    {
      name: 'আরিফুল হক',
      nameEn: 'Ariful Haque',
      comment:
        'মার্টবাড়ি থেকে ইলেকট্রিক কেটলি অর্ডার করেছিলাম। একদম অরিজিনাল ও দ্রুত গরম হয়। ১০০% সুপারিশ করছি।',
      commentEn:
        'Ordered the smart kettle from MartBari. Authentic quality and heats rapidly. Highly recommended store!',
    },
  ];

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {storeDisplayName} — {t('brand.tagline')}
        </title>
      </Helmet>

      {/* 1. BENTO GRID HERO SECTION (2/3 Slideshow + 1/3 Stacked Promo Tiles) */}
      <section aria-label={t('hero.kicker')} className="border-b border-[#17263E]/8 bg-[#F5F7FA] pt-3 pb-4 sm:pt-4 sm:pb-5">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 space-y-3">
          {/* Bento Grid: 12px (gap-3) rounded-corner cards */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
            {/* LEFT (2/3 Desktop Width): Large Image Slideshow or Fallback Editorial Card */}
            <div className="lg:col-span-8">
              {heroSlides.length > 0 ? (
                <div
                  role="region"
                  aria-roledescription="carousel"
                  aria-label={t('hero.kicker')}
                  tabIndex={0}
                  onKeyDown={handleHeroKeyDown}
                  onMouseEnter={() => setIsHeroHovered(true)}
                  onMouseLeave={() => setIsHeroHovered(false)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="relative w-full aspect-[4/5] min-h-[430px] sm:aspect-[16/10] sm:min-h-[380px] lg:aspect-[16/9] lg:h-full rounded-2xl overflow-hidden bg-[#17263E] text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F47125] select-none"
                >
                  {heroSlides.map((slide, index) => {
                    const isActive = index === activeBannerIndex;
                    const isEager = index === 0;
                    const altText = lang === 'bn' ? slide.titleBn : slide.titleEn;
                    const labelText = lang === 'bn' ? slide.labelBn : slide.labelEn;
                    const subtitleText = lang === 'bn' ? slide.subtitleBn : slide.subtitleEn;
                    const priceBadgeText = lang === 'bn' ? slide.priceBadgeBn : slide.priceBadgeEn;
                    const primaryCtaText = lang === 'bn' ? slide.primaryCtaBn : slide.primaryCtaEn;
                    const secondaryCtaText = lang === 'bn' ? slide.secondaryCtaBn : slide.secondaryCtaEn;

                    return (
                      <div
                        key={slide.id}
                        aria-hidden={!isActive}
                        className={cn(
                          'absolute inset-0 transition-opacity duration-500 ease-out',
                          isActive ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
                        )}
                      >
                        {/* Full-Bleed Product Photography with Smooth Ken-Burns Zoom */}
                        <HeroMediaImage
                          src={slide.imageUrl}
                          alt={altText}
                          width={1600}
                          height={900}
                          eager={isEager}
                          categoryKey={slide.categoryKey}
                          className={cn(
                            'h-full w-full object-cover object-center',
                            isActive && !prefersReducedMotion ? 'animate-hero-ken-burns' : '',
                          )}
                        />

                        {/* Soft Navy Gradients: Bottom-heavy on mobile, Left-side on desktop */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-[#0E192B]/96 via-[#17263E]/72 to-[#17263E]/15 lg:hidden"
                        />
                        <div
                          aria-hidden="true"
                          className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#0E192B]/95 via-[#17263E]/78 to-transparent"
                        />
                        <div
                          aria-hidden="true"
                          className="hidden lg:block absolute inset-0 bg-gradient-to-t from-[#0E192B]/65 via-transparent to-transparent"
                        />

                        {/* Animated Slide Overlay Text & Buttons */}
                        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-16 pt-6 sm:px-7 sm:pb-16 lg:justify-center lg:px-9 lg:py-8 lg:pb-14">
                          <div
                            key={isActive ? `slide-copy-${index}` : `slide-idle-${index}`}
                            className={cn(
                              'max-w-lg',
                              isActive && !prefersReducedMotion ? 'animate-hero-text-in' : '',
                            )}
                          >
                            {/* Small Orange Label */}
                            <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#FF8C47]">
                              <span className="h-[2px] w-4 bg-[#F47125]" aria-hidden="true" />
                              <span>{labelText}</span>
                            </p>

                            {/* Big Heading */}
                            <h1 className="mt-1.5 text-[22px] font-bold leading-[1.16] tracking-tight text-white sm:text-3xl lg:text-[34px] [text-wrap:balance]">
                              {altText}
                            </h1>

                            {/* One-Line Subtitle */}
                            <p className="mt-1.5 max-w-md text-xs sm:text-sm text-white/85 line-clamp-1">
                              {subtitleText}
                            </p>

                            {/* Price Badge */}
                            <div className="mt-2.5">
                              <span className="inline-flex items-center rounded-lg border border-white/25 bg-[#17263E]/85 px-2.5 py-1 text-xs sm:text-sm font-bold text-[#FFA366] tabular-nums backdrop-blur-sm">
                                {priceBadgeText}
                              </span>
                            </div>

                            {/* Primary Orange & Secondary Outline Buttons (Full-Width >=44px on Mobile) */}
                            <div className="mt-3.5 sm:mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                              <Link
                                to={localizedPath(slide.linkUrl || '/shop')}
                                tabIndex={isActive ? 0 : -1}
                                className="w-full sm:w-auto"
                              >
                                <Button
                                  size="lg"
                                  className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#F47125] px-5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#D95F18]"
                                  rightIcon={<ArrowRight className="h-4 w-4" />}
                                >
                                  {primaryCtaText}
                                </Button>
                              </Link>
                              <Link
                                to={localizedPath(slide.secondaryLinkUrl || '/shop?on_sale=true')}
                                tabIndex={isActive ? 0 : -1}
                                className="w-full sm:w-auto"
                              >
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="min-h-[44px] w-full sm:w-auto rounded-xl border-white/35 bg-white/10 px-5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20"
                                >
                                  {secondaryCtaText}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bottom Slideshow Bar: 01 / 04 + Progress Bars + Pause + Small Arrows (hidden on phones) */}
                  {heroSlides.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-4 pb-2.5 pt-2 sm:px-7 sm:pb-3.5 lg:px-9">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="shrink-0 text-xs font-bold tracking-wide text-white tabular-nums">
                          {formatTwoDigit(activeBannerIndex + 1, lang)} / {formatTwoDigit(heroSlides.length, lang)}
                        </span>

                        {/* Thin Animated Progress Indicators */}
                        <div
                          className="flex flex-1 max-w-[220px] items-center gap-1.5"
                          role="tablist"
                          aria-label={t('hero.kicker')}
                        >
                          {heroSlides.map((slide, idx) => {
                            const isActive = idx === activeBannerIndex;
                            return (
                              <button
                                key={slide.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-label={t('hero.slideLabel', { number: idx + 1 })}
                                onClick={() => setActiveBannerIndex(idx)}
                                className="group flex flex-1 min-h-[44px] items-center cursor-pointer focus-visible:outline-none"
                              >
                                <span
                                  className={cn(
                                    'relative block h-1 w-full overflow-hidden rounded-full transition-colors',
                                    isActive ? 'bg-white/30' : 'bg-white/25 group-hover:bg-white/50',
                                  )}
                                >
                                  {isActive && (
                                    <span
                                      key={`${activeBannerIndex}-${isHeroHovered || isHeroPaused || isTouchingHero ? 'paused' : 'run'}`}
                                      className={cn(
                                        'absolute inset-0 rounded-full bg-[#F47125]',
                                        !isHeroHovered && !isHeroPaused && !isTouchingHero && !prefersReducedMotion
                                          ? 'animate-hero-progress'
                                          : 'w-full',
                                      )}
                                    />
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Controls Cluster */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsHeroPaused((prev) => !prev)}
                          aria-label={isHeroPaused ? t('hero.play') : t('hero.pause')}
                          title={isHeroPaused ? t('hero.play') : t('hero.pause')}
                          className="inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/25 bg-[#17263E]/70 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                        >
                          {isHeroPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>

                        {/* Small Prev/Next Arrows (Hidden on Phones) */}
                        <button
                          type="button"
                          onClick={() =>
                            setActiveBannerIndex(
                              (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
                            )
                          }
                          aria-label={t('hero.prevSlide')}
                          className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-[#17263E]/70 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length)
                          }
                          aria-label={t('hero.nextSlide')}
                          className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-[#17263E]/70 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Clean Editorial Fallback when Demo Data is OFF and no custom banners exist */
                <div className="flex h-full min-h-[340px] flex-col justify-center rounded-2xl bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#1E3252] p-6 text-white sm:p-9">
                  <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#FF8C47]">
                    <span className="h-[2px] w-4 bg-[#F47125]" aria-hidden="true" />
                    <span>{storeDisplayName}</span>
                  </p>
                  <h1 className="mt-2.5 max-w-xl text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl [text-wrap:balance]">
                    {t('hero.title')}
                  </h1>
                  <p className="mt-2.5 max-w-lg text-xs sm:text-sm leading-relaxed text-white/80 line-clamp-2">
                    {t('hero.subtitle')}
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <Link to={localizedPath('/shop')} className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#F47125] px-6 font-semibold text-white hover:bg-[#D95F18]"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        {t('hero.shopNow')}
                      </Button>
                    </Link>
                    <Link to={localizedPath('/track-order')} className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="lg"
                        className="min-h-[44px] w-full sm:w-auto rounded-xl border-white/30 bg-white/10 px-6 font-semibold text-white hover:bg-white/20"
                      >
                        {t('hero.secondaryCta')}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT (1/3 Desktop Width, 2-Column Side-by-Side on Mobile): Two Stacked Promo Tiles */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-1 lg:grid-rows-2">
              {/* Promo Tile 1: Flash Sale + Live Countdown */}
              <Link
                to={localizedPath('/shop?on_sale=true')}
                className="group relative flex min-h-[172px] sm:min-h-[190px] lg:min-h-0 flex-col justify-between overflow-hidden rounded-2xl bg-[#17263E] p-3.5 sm:p-5 text-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#F47125]"
              >
                <div aria-hidden="true" className="absolute inset-0">
                  {showDemoData ? (
                    <HeroMediaImage
                      src={HERO_PROMO_IMAGES.flashSale}
                      alt={t('hero.flashSaleTitle')}
                      width={900}
                      height={560}
                      eager
                      categoryKey="smart-watches"
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#17263E] to-[#283E63]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1729]/95 via-[#17263E]/72 to-[#17263E]/30" />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#FF8C47]">
                      <Zap className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
                      <span className="truncate">{t('hero.flashSaleBadge')}</span>
                    </span>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/12 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums backdrop-blur-sm">
                      <Clock className="h-3 w-3 shrink-0 text-[#FF8C47]" aria-hidden="true" />
                      <span>
                        {formatTwoDigit(timeLeft.hours, lang)}:{formatTwoDigit(timeLeft.minutes, lang)}:
                        {formatTwoDigit(timeLeft.seconds, lang)}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-sm transition-colors group-hover:border-[#F47125] group-hover:bg-[#F47125]">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>

                <div className="relative z-10 mt-3">
                  <h2 className="text-sm sm:text-base lg:text-lg font-bold leading-snug text-white line-clamp-2">
                    {t('hero.flashSaleTitle')}
                  </h2>
                  <p className="hidden sm:block mt-0.5 text-xs text-white/80 line-clamp-1">
                    {t('hero.flashSaleSubtitle')}
                  </p>
                </div>
              </Link>

              {/* Promo Tile 2: New Arrivals */}
              <Link
                to={localizedPath('/shop?sort=newest')}
                className="group relative flex min-h-[172px] sm:min-h-[190px] lg:min-h-0 flex-col justify-between overflow-hidden rounded-2xl bg-[#17263E] p-3.5 sm:p-5 text-white shadow-sm focus-visible:ring-2 focus-visible:ring-[#F47125]"
              >
                <div aria-hidden="true" className="absolute inset-0">
                  {showDemoData ? (
                    <HeroMediaImage
                      src={HERO_PROMO_IMAGES.newArrivals}
                      alt={t('hero.newArrivalsTitle')}
                      width={900}
                      height={560}
                      eager
                      categoryKey="earbuds"
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#1B2C49] to-[#132035]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1729]/95 via-[#17263E]/72 to-[#17263E]/30" />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#FF8C47]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F47125]" aria-hidden="true" />
                      <span className="truncate">{t('hero.newArrivalsBadge')}</span>
                    </span>
                    <div className="mt-1 hidden sm:block text-[11px] font-medium text-white/80 truncate">
                      {t('home.trustCodShort')}
                    </div>
                  </div>
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur-sm transition-colors group-hover:border-[#F47125] group-hover:bg-[#F47125]">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>

                <div className="relative z-10 mt-3">
                  <h2 className="text-sm sm:text-base lg:text-lg font-bold leading-snug text-white line-clamp-2">
                    {t('hero.newArrivalsTitle')}
                  </h2>
                  <p className="hidden sm:block mt-0.5 text-xs text-white/80 line-clamp-1">
                    {t('hero.newArrivalsSubtitle')}
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* BELOW BENTO GRID: Ultra-Premium Deep Navy Luxury Feature Bar */}
          <div className="rounded-2xl bg-gradient-to-r from-[#111D31] via-[#17263E] to-[#1E304F] p-4 sm:p-6 border border-[#F47125]/25 shadow-xl space-y-4 text-white">
            {displayCategories.length > 0 && (
              <div
                aria-label={t('home.categoryShortcutsLabel')}
                className="flex items-center gap-2.5 overflow-x-auto pb-0.5 snap-x no-scrollbar lg:grid lg:grid-cols-6 lg:gap-3 lg:overflow-visible lg:pb-0"
              >
                {displayCategories.slice(0, 6).map((cat) => {
                  const Icon = getCategoryShortcutIcon(cat.slug);
                  return (
                    <Link
                      key={cat.id}
                      to={localizedPath(`/category/${cat.slug}`)}
                      className="group flex min-h-[46px] shrink-0 snap-start items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:border-[#F47125] hover:bg-[#F47125] hover:shadow-md lg:w-full lg:justify-center backdrop-blur-md"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#FF9D5C] transition-colors group-hover:bg-white group-hover:text-[#F47125]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="whitespace-nowrap truncate">{tField(cat, 'name')}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Premium Trust Strip inside Navy Bar */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl border border-white/12 bg-white/5 px-4 py-3 shadow-inner lg:grid-cols-4 backdrop-blur-md">
              {slimTrustItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-start lg:justify-center gap-2.5 text-xs font-bold text-white/90"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F47125]/25 text-[#FF9D5C]">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </span>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FLASH SALE SECTION */}
      {(loading || hasError || flashSaleProducts.length > 0) && (
        <section className="bg-[#17263E] py-12 sm:py-14 text-white">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF9D5C]">
                  <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Flash Sale</span>
                </div>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl text-white">
                  {t('home.flashSaleTitle')}
                </h2>
                <p className="mt-1 text-sm text-white/72">{t('home.flashSaleSubtitle')}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-white/75">
                    <Clock className="h-4 w-4 text-[#F47125]" aria-hidden="true" />
                    {t('product.saleEndsIn')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/12 bg-white/8">
                      <span className="text-sm font-bold tabular-nums">
                        {formatNumber(timeLeft.hours, lang)}
                      </span>
                      <span className="text-[9px] uppercase text-white/65">
                        {t('product.countdownHours')}
                      </span>
                    </div>
                    <span className="font-bold text-white/50">:</span>
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-white/12 bg-white/8">
                      <span className="text-sm font-bold tabular-nums">
                        {formatNumber(timeLeft.minutes, lang)}
                      </span>
                      <span className="text-[9px] uppercase text-white/65">
                        {t('product.countdownMinutes')}
                      </span>
                    </div>
                    <span className="font-bold text-white/50">:</span>
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-[#F47125] text-white">
                      <span className="text-sm font-bold tabular-nums">
                        {formatNumber(timeLeft.seconds, lang)}
                      </span>
                      <span className="text-[9px] uppercase text-white/90">
                        {t('product.countdownSeconds')}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={localizedPath('/shop?on_sale=true')}
                  className="text-sm font-semibold text-[#FF9D5C] hover:text-white whitespace-nowrap transition-colors"
                >
                  {t('home.viewAll')} →
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={idx} variant="card" />
                ))}
              </div>
            ) : hasError ? (
              <div className="mt-8">
                <ErrorState className="bg-white" onRetry={() => void loadHomeData()} />
              </div>
            ) : (
              <div className="mt-8 flex gap-4 overflow-x-auto pb-3 snap-x no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 md:overflow-visible md:pb-0">
                {flashSaleProducts.map((product) => (
                  <div
                    key={product.id}
                    className="min-w-[205px] w-[205px] shrink-0 snap-start md:w-auto md:min-w-0"
                  >
                    <ProductCard
                      product={product}
                      brandsMap={brandsMap}
                      reviewStats={reviewsStatsMap.get(product.id) ?? null}
                      showFlashProgress
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. CURATED PRODUCT COLLECTIONS */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-[#17263E]/6 pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1A2C]">
              {t('home.curatedTitle')}
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">{t('home.curatedSubtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label={t('home.curatedTitle')}
              className="inline-flex rounded-full border border-[#17263E]/8 bg-[#F6F7F9] p-1"
            >
              {(
                [
                  { id: 'featured', label: t('home.tabFeatured') },
                  { id: 'new', label: t('home.tabNew') },
                  { id: 'best_sellers', label: t('home.tabBestSellers') },
                ] as const
              ).map((tab) => {
                const isSelected = activeCollectionTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveCollectionTab(tab.id)}
                    className={cn(
                      'min-h-[38px] rounded-full px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap',
                      isSelected
                        ? 'bg-[#17263E] text-white shadow-2xs'
                        : 'text-[#5B6577] hover:text-[#0F1A2C]',
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <Link
              to={activeCollectionViewAllUrl}
              className="text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap"
            >
              {t('home.viewAll')} →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-7 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} variant="card" />
            ))}
          </div>
        ) : hasError ? (
          <div className="mt-7">
            <ErrorState onRetry={() => void loadHomeData()} />
          </div>
        ) : activeCollectionProducts.length === 0 ? (
          <div className="mt-7">
            <EmptyState
              imageUrl={showDemoData ? EDITORIAL_DEMO_IMAGES.emptyShowcase : undefined}
              description={t('home.noSectionProducts')}
              actionLabel={t('hero.primaryCta')}
              onAction={() => navigate(localizedPath('/shop'))}
            />
          </div>
        ) : (
          <div className="mt-7 flex gap-4 overflow-x-auto pb-3 snap-x no-scrollbar md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 md:overflow-visible md:pb-0">
            {activeCollectionProducts.map((product) => (
              <div
                key={product.id}
                className="min-w-[205px] w-[205px] shrink-0 snap-start md:w-auto md:min-w-0"
              >
                <ProductCard
                  product={product}
                  brandsMap={brandsMap}
                  reviewStats={reviewsStatsMap.get(product.id) ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. POPULAR CATEGORIES SHOWCASE */}
      {(loading || displayCategories.length > 0) && (
        <section className="border-y border-[#17263E]/6 bg-[#FAFBFC] py-12 sm:py-14">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1A2C]">
                  {t('home.categoriesTitle')}
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">{t('home.categoriesSubtitle')}</p>
              </div>
              <Link
                to={localizedPath('/shop')}
                className="text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap"
              >
                {t('home.viewAll')} →
              </Link>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 sm:gap-5">
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-44 w-full rounded-2xl" />
                  ))
                : displayCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={localizedPath(`/category/${cat.slug}`)}
                      className="group overflow-hidden rounded-2xl border border-[#17263E]/7 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#17263E]/16 hover:shadow-[0_12px_24px_-12px_rgba(15,26,44,0.12)]"
                    >
                      <ProductImage
                        src={cat.image_url}
                        alt={tField(cat, 'name')}
                        aspectClassName="aspect-square"
                        width={800}
                        height={800}
                        categoryKey={cat.slug}
                        className="transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="p-3.5 text-center">
                        <p className="truncate text-xs sm:text-sm font-semibold text-[#0F1A2C] group-hover:text-[#F47125] transition-colors">
                          {tField(cat, 'name')}
                        </p>
                      </div>
                    </Link>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. DETAILED TRUST HIGHLIGHTS */}
      <section className="bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Truck, title: t('home.trustCodTitle'), desc: t('home.trustCodDesc') },
              { icon: RotateCcw, title: t('home.trustReturnTitle'), desc: t('home.trustReturnDesc') },
              { icon: ShieldCheck, title: t('home.trustAuthenticTitle'), desc: t('home.trustAuthenticDesc') },
              { icon: Headphones, title: t('home.trustFastTitle'), desc: t('home.trustFastDesc') },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3.5 rounded-2xl border border-[#17263E]/7 bg-[#FAFBFC] p-5"
              >
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F47125]/10 text-[#F47125]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#0F1A2C]">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. APPROVED CUSTOMER REVIEWS (Only real DB reviews when Demo Data is OFF) */}
      {(reviews.length > 0 || showDemoData) && (
        <section className="border-t border-[#17263E]/6 bg-[#FAFBFC] py-12 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
                {t('home.reviewsTitle')}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">{t('home.reviewsSubtitle')}</p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.length > 0
                ? reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-[#17263E]/7 bg-white p-5"
                    >
                      <div className="flex items-center gap-1 text-[#F47125]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rev.rating ? 'fill-current' : 'text-[#E5E9F0]'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-[#0F1A2C]">"{rev.comment}"</p>
                      <div className="mt-4 flex items-center justify-between border-t border-[#17263E]/6 pt-3 text-xs text-[#64748B]">
                        <span className="font-semibold text-[#0F1A2C]">{rev.customer_name}</span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#16A34A]">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified Buyer
                        </span>
                      </div>
                    </div>
                  ))
                : demoFallbackReviews.map((rev, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#17263E]/7 bg-white p-5"
                    >
                      <div className="flex items-center gap-1 text-[#F47125]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-[#0F1A2C]">
                        "{lang === 'bn' ? rev.comment : rev.commentEn}"
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-[#17263E]/6 pt-3 text-xs text-[#64748B]">
                        <span className="font-semibold text-[#0F1A2C]">
                          {lang === 'bn' ? rev.name : rev.nameEn}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#16A34A]">
                          <ShieldCheck className="h-3.5 w-3.5" /> Verified Buyer
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. SHORT FAQ SECTION */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{t('home.faqTitle')}</h2>
          <p className="mt-1 text-sm text-[#64748B]">{t('home.faqSubtitle')}</p>
        </div>

        <div className="mt-8 space-y-3">
          {(['q1', 'q2', 'q3', 'q4'] as const).map((key) => {
            const isOpen = openFaq === key;
            return (
              <div
                key={key}
                className="overflow-hidden rounded-2xl border border-[#17263E]/8 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : key)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-4 px-5 py-3.5 text-left font-semibold text-[#0F1A2C] transition-colors hover:text-[#F47125] cursor-pointer"
                >
                  <span>{t(`faq.${key}`)}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#F47125]' : 'text-[#5B6577]'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#17263E]/6 bg-[#FAFBFC] px-5 py-4 text-sm leading-relaxed text-[#5B6577]">
                    {t(`faq.a${key.slice(1)}`)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};

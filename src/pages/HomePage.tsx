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
  badgeBn: string;
  badgeEn: string;
  primaryCtaBn: string;
  primaryCtaEn: string;
  secondaryCtaBn: string;
  secondaryCtaEn: string;
  linkUrl: string;
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

    return banners.map((b, idx) => {
      const preset = showDemoData ? matchHeroPreset(b, idx) : null;
      const useLocalDemoBackdrop = isDemoBanner(b) && Boolean(preset?.imageUrl);
      const imageUrl = useLocalDemoBackdrop
        ? preset!.imageUrl
        : isRemoteOrStaticImage(b.image_url)
        ? b.image_url
        : preset?.imageUrl || '';
      return {
        id: b.id,
        imageUrl,
        labelBn: preset?.labelBn || t('brand.name'),
        labelEn: preset?.labelEn || t('brand.name'),
        titleBn: b.title_bn || preset?.titleBn || settings.store_name_bn,
        titleEn: b.title_en || preset?.titleEn || settings.store_name_en,
        subtitleBn: preset?.subtitleBn || t('hero.subtitle'),
        subtitleEn: preset?.subtitleEn || t('hero.subtitle'),
        badgeBn: preset?.badgeBn || t('home.trustCodShort'),
        badgeEn: preset?.badgeEn || t('home.trustCodShort'),
        primaryCtaBn: preset?.primaryCtaBn || t('hero.shopNow'),
        primaryCtaEn: preset?.primaryCtaEn || t('hero.shopNow'),
        secondaryCtaBn: preset?.secondaryCtaBn || t('hero.viewOffers'),
        secondaryCtaEn: preset?.secondaryCtaEn || t('hero.viewOffers'),
        linkUrl: b.link_url || preset?.linkUrl || '/shop',
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

      {/* 1. FULL-SCREEN EDGE-TO-EDGE CINEMATIC HERO SLIDESHOW */}
      {heroSlides.length > 0 ? (
        <section
          aria-roledescription="carousel"
          aria-label={t('hero.kicker')}
          tabIndex={0}
          onKeyDown={handleHeroKeyDown}
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-[calc(100svh-96px)] min-h-[540px] max-h-[820px] overflow-hidden bg-[#09111F] text-white focus:outline-none select-none"
        >
          {/* Full-Bleed Slideshow Canvas */}
          {heroSlides.map((slide, index) => {
            const isActive = index === activeBannerIndex;
            const isEager = index === 0;
            return (
              <div
                key={slide.id}
                aria-hidden={!isActive}
                className={cn(
                  'absolute inset-0 transition-opacity duration-300 ease-out',
                  isActive ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none',
                )}
              >
                {/* Edge-to-Edge Fullscreen Image */}
                {slide.imageUrl && (
                  <img
                    src={slide.imageUrl}
                    alt={lang === 'bn' ? slide.titleBn : slide.titleEn}
                    width={1920}
                    height={1080}
                    loading={isEager ? 'eager' : 'lazy'}
                    fetchPriority={isEager ? 'high' : undefined}
                    referrerPolicy="no-referrer"
                    className={cn(
                      'h-full w-full object-cover object-center',
                      isActive && !prefersReducedMotion ? 'animate-hero-ken-burns' : '',
                    )}
                  />
                )}

                {/* Measured Directional Contrast Scrims (Readable Typography + Vibrant Photography) */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#070E1A]/92 via-[#0B1526]/68 to-[#0B1526]/20"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#070E1A]/90 via-transparent to-[#070E1A]/30"
                />

                {/* Editorial Overlay Content */}
                <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end sm:justify-center px-5 pb-24 pt-12 sm:px-8 sm:pb-24 lg:px-12">
                  <div className="max-w-2xl">
                    {/* Restrained Editorial Metadata (No Pill Clutter) */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wide text-[#FFA366]">
                      <span className="h-[2px] w-6 bg-[#F47125]" aria-hidden="true" />
                      <span>{lang === 'bn' ? slide.labelBn : slide.labelEn}</span>
                      <span className="text-white/35" aria-hidden="true">·</span>
                      <span className="text-white/85">{lang === 'bn' ? slide.badgeBn : slide.badgeEn}</span>
                    </div>

                    <h1 className="mt-3.5 text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[54px] [text-wrap:balance]">
                      {lang === 'bn' ? slide.titleBn : slide.titleEn}
                    </h1>

                    <p className="mt-4 max-w-xl text-sm sm:text-base lg:text-[17px] leading-relaxed text-white/80 line-clamp-2">
                      {lang === 'bn' ? slide.subtitleBn : slide.subtitleEn}
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Link
                        to={localizedPath(slide.linkUrl || '/shop')}
                        tabIndex={isActive ? 0 : -1}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          size="lg"
                          className="min-h-[48px] w-full sm:w-auto rounded-full bg-[#F47125] px-8 text-sm font-semibold text-white shadow-[0_12px_28px_-8px_rgba(244,113,37,0.65)] hover:bg-[#D95F18]"
                          rightIcon={<ArrowRight className="h-4 w-4" />}
                        >
                          {t('hero.shopNow')}
                        </Button>
                      </Link>
                      <Link
                        to={localizedPath('/shop?on_sale=true')}
                        tabIndex={isActive ? 0 : -1}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          variant="outline"
                          size="lg"
                          className="min-h-[48px] w-full sm:w-auto rounded-full border-white/30 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/20"
                        >
                          {t('hero.viewOffers')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Side Desktop Arrows for Intuitive Fullscreen Browsing */}
          {heroSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex(
                    (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
                  )
                }
                aria-label="Previous slide"
                className="hidden xl:inline-flex absolute left-5 top-1/2 z-20 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition-all hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length)
                }
                aria-label="Next slide"
                className="hidden xl:inline-flex absolute right-5 top-1/2 z-20 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition-all hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Bottom Docked Slideshow Controls */}
          {heroSlides.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 z-20">
              <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-t border-white/12 px-5 py-4 sm:px-8 lg:px-12 backdrop-blur-[2px]">
                {/* Slide Dots & Titles */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar" role="tablist" aria-label="Hero slides">
                  {heroSlides.map((slide, idx) => {
                    const isActive = idx === activeBannerIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Slide ${idx + 1}`}
                        onClick={() => setActiveBannerIndex(idx)}
                        className="group flex flex-col items-start gap-1.5 py-1 text-left cursor-pointer shrink-0"
                      >
                        <span
                          className={cn(
                            'hidden md:block text-[11px] font-medium transition-colors max-w-[150px] truncate',
                            isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80',
                          )}
                        >
                          {String(idx + 1).padStart(2, '0')} · {lang === 'bn' ? slide.labelBn : slide.labelEn}
                        </span>
                        <span
                          className={cn(
                            'relative block h-1 overflow-hidden rounded-full transition-all duration-300',
                            isActive ? 'w-12 md:w-28 bg-white/25' : 'w-4 md:w-16 bg-white/25 group-hover:bg-white/50',
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

                {/* Counter + Pause + Mobile/Tablet Prev/Next Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-white/75 tabular-nums mr-1">
                    {formatNumber(activeBannerIndex + 1, lang)} / {formatNumber(heroSlides.length, lang)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsHeroPaused((prev) => !prev)}
                    aria-label={isHeroPaused ? t('hero.play') : t('hero.pause')}
                    title={isHeroPaused ? t('hero.play') : t('hero.pause')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 cursor-pointer"
                  >
                    {isHeroPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </button>

                  <div className="flex items-center gap-1.5 xl:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveBannerIndex(
                          (prev) => (prev - 1 + heroSlides.length) % heroSlides.length,
                        )
                      }
                      aria-label="Previous slide"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveBannerIndex((prev) => (prev + 1) % heroSlides.length)
                      }
                      aria-label="Next slide"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:border-[#F47125] hover:bg-[#F47125] cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        /* Clean Editorial Fallback Hero when Demo Data is OFF and no real banners are uploaded yet */
        <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#0F1A2C] via-[#17263E] to-[#1D3152] text-white">
          <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF9D5C]">
                <span className="h-[2px] w-5 bg-[#F47125]" aria-hidden="true" />
                <span>{storeDisplayName}</span>
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl [text-wrap:balance]">
                {t('hero.title')}
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/78">
                {t('hero.subtitle')}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to={localizedPath('/shop')}>
                  <Button
                    size="lg"
                    className="min-h-[46px] rounded-full bg-[#F47125] px-7 font-semibold text-white hover:bg-[#D95F18]"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t('hero.shopNow')}
                  </Button>
                </Link>
                <Link to={localizedPath('/track-order')}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="min-h-[46px] rounded-full border-white/25 bg-white/6 px-6 font-semibold text-white hover:bg-white/14"
                  >
                    {t('hero.secondaryCta')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. COMPACT CATEGORY SHORTCUTS + MINIMAL SLIM TRUST STRIP */}
      <section className="border-b border-[#17263E]/6 bg-white">
        {displayCategories.length > 0 && (
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8">
            <div
              aria-label={t('home.categoryShortcutsLabel')}
              className="flex items-stretch gap-2.5 overflow-x-auto pb-1 snap-x no-scrollbar md:grid md:grid-cols-6 md:gap-3 md:overflow-visible md:pb-0"
            >
              {displayCategories.slice(0, 6).map((cat) => {
                const Icon = getCategoryShortcutIcon(cat.slug);
                return (
                  <Link
                    key={cat.id}
                    to={localizedPath(`/category/${cat.slug}`)}
                    className="group flex min-w-[132px] shrink-0 snap-start items-center gap-2.5 rounded-xl border border-[#17263E]/8 bg-[#FAFBFC] px-3.5 py-2.5 transition-all hover:border-[#F47125]/45 hover:bg-[#FFF8F3] md:min-w-0"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#17263E] shadow-2xs transition-colors group-hover:bg-[#F47125] group-hover:text-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate text-xs font-semibold text-[#0F1A2C] group-hover:text-[#D95F18]">
                      {tField(cat, 'name')}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-[#17263E]/6 bg-[#FAFBFC]">
          <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4">
              {slimTrustItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-start lg:justify-center gap-2 text-xs font-medium text-[#17263E]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#F47125]" aria-hidden="true" />
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

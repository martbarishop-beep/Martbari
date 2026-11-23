import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Clock,
  Headphones,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { ProductShelf } from '../components/ProductShelf';
import type { ProductReviewStats, StorefrontProduct } from '../components/QuickViewModal';
import { ShoppableHero, type ShoppableHeroSlide } from '../components/ShoppableHero';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
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

function matchProductForHeroSlide(
  products: StorefrontProduct[],
  linkUrl: string | null | undefined,
  categoryKey: DemoCategoryKey,
  index: number,
): StorefrontProduct | null {
  if (products.length === 0) return null;
  const normalizedLink = (linkUrl || '').toLowerCase();

  // 1. Direct /product/<slug> match
  const productMatch = normalizedLink.match(/\/product\/([^/?#]+)/);
  if (productMatch?.[1]) {
    const bySlug = products.find((p) => p.slug.toLowerCase() === productMatch[1]);
    if (bySlug) return bySlug;
  }

  // 2. Category /category/<slug> or preset category match (prefer in-stock + featured/discounted)
  const categoryMatch = normalizedLink.match(/\/category\/([^/?#]+)/);
  const targetCat = categoryMatch?.[1] || categoryKey;
  const inCat = products.filter(
    (p) =>
      (p.category_slug && p.category_slug.toLowerCase() === targetCat) ||
      p.slug.toLowerCase().includes(targetCat.replace(/s$/, '')),
  );
  if (inCat.length > 0) {
    return (
      inCat.find((p) => (!p.track_stock || p.stock > 0) && p.sale_price !== null) ||
      inCat.find((p) => !p.track_stock || p.stock > 0) ||
      inCat[0]
    );
  }

  // 3. Fallback to featured/in-stock product cycling by index
  const activePool = products.filter((p) => !p.track_stock || p.stock > 0);
  const pool = activePool.length > 0 ? activePool : products;
  return pool[index % pool.length] ?? null;
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
  if (url.startsWith('/src/')) return false;
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
  const [catalogProducts, setCatalogProducts] = useState<StorefrontProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [activeCollectionTab, setActiveCollectionTab] = useState<CuratedTab>('featured');

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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
        setCatalogProducts(demo);
        setFlashSaleProducts(demo.filter((p) => p.sale_price !== null));
        setFeaturedProducts(demo);
        setNewArrivals(demo.filter((p) => p.is_new));
        setBestSellers(demo);
      } else {
        setCatalogProducts([]);
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

        setCatalogProducts(withImages);
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
        setCatalogProducts(demo);
        setFlashSaleProducts(demo.filter((p) => p.sale_price !== null));
        setFeaturedProducts(demo);
        setNewArrivals(demo.filter((p) => p.is_new));
        setBestSellers(demo);
      } else {
        setCatalogProducts([]);
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

  const heroSlides: ShoppableHeroSlide[] = useMemo(() => {
    const productPool =
      catalogProducts.length > 0
        ? catalogProducts
        : showDemoData
        ? buildFallbackDemoProducts()
        : [];

    if (banners.length === 0) {
      if (!showDemoData) return [];
      return HERO_SLIDE_PRESETS.map((p, idx) => {
        const matchedProduct = matchProductForHeroSlide(
          productPool,
          p.linkUrl,
          p.category,
          idx,
        );
        return {
          ...p,
          categoryKey: p.category,
          product: matchedProduct,
          reviewStats: matchedProduct ? reviewsStatsMap.get(matchedProduct.id) ?? null : null,
        };
      });
    }

    const activeBanners =
      banners.length > 4 &&
      banners.some((b) => b.link_url === '/category/mobile-accessories') &&
      banners.some((b) => b.link_url === '/category/lighting')
        ? banners.filter((b) => b.link_url !== '/category/lighting')
        : banners;

    return activeBanners.slice(0, 4).map((b, idx) => {
      const fallbackPreset = matchHeroPreset(b, idx);
      const preset = showDemoData ? fallbackPreset : null;
      const imageUrl = isRemoteOrStaticImage(b.image_url)
        ? b.image_url
        : preset?.imageUrl || fallbackPreset?.imageUrl || '';
      const categoryKey = fallbackPreset?.category || 'smart-watches';
      const linkUrl = b.link_url || preset?.linkUrl || '/shop';
      const matchedProduct = matchProductForHeroSlide(
        productPool,
        linkUrl,
        categoryKey,
        idx,
      );

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
        linkUrl,
        secondaryLinkUrl: b.secondary_link_url || preset?.secondaryLinkUrl || '/shop?on_sale=true',
        categoryKey,
        product: matchedProduct,
        reviewStats: matchedProduct ? reviewsStatsMap.get(matchedProduct.id) ?? null : null,
      };
    });
  }, [
    banners,
    catalogProducts,
    reviewsStatsMap,
    showDemoData,
    settings.store_name_bn,
    settings.store_name_en,
    t,
  ]);

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

      {/* 1. PREMIUM SHOPPABLE HERO SECTION */}
      <ShoppableHero
        slides={heroSlides}
        storeDisplayName={storeDisplayName}
        prefersReducedMotion={prefersReducedMotion}
      />

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

              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
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
                  className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#FF9D5C] hover:text-white whitespace-nowrap transition-colors"
                >
                  {t('home.viewAll')} →
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="-mx-4 mt-7 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:gap-4 sm:px-6 md:mx-0 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-[58vw] min-w-[186px] max-w-[232px] shrink-0 md:w-auto md:min-w-0 md:max-w-none"
                  >
                    <Skeleton variant="card" />
                  </div>
                ))}
              </div>
            ) : hasError ? (
              <div className="mt-8">
                <ErrorState className="bg-white" onRetry={() => void loadHomeData()} />
              </div>
            ) : (
              <div className="mt-7">
                <ProductShelf
                  products={flashSaleProducts}
                  brandsMap={brandsMap}
                  reviewsStatsMap={reviewsStatsMap}
                  showFlashProgress
                  tone="dark"
                  viewAllTo={localizedPath('/shop?on_sale=true')}
                  viewAllLabel={t('home.viewAll')}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. CURATED PRODUCT COLLECTIONS */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#17263E]/6 pb-5 lg:flex-row lg:items-end">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1A2C]">
                {t('home.curatedTitle')}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">{t('home.curatedSubtitle')}</p>
            </div>
            <Link
              to={activeCollectionViewAllUrl}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap shrink-0 lg:hidden"
            >
              {t('home.viewAll')} →
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="-mx-4 flex-1 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0 lg:flex-initial">
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
                        'min-h-[40px] rounded-full px-4 text-xs sm:text-sm font-semibold leading-[1.4] transition-all cursor-pointer whitespace-nowrap shrink-0',
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
            </div>

            <Link
              to={activeCollectionViewAllUrl}
              className="hidden lg:inline-flex min-h-[44px] items-center text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap shrink-0"
            >
              {t('home.viewAll')} →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="-mx-4 mt-7 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:-mx-6 sm:gap-4 sm:px-6 md:mx-0 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 md:overflow-visible md:px-0 md:pb-0">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="w-[58vw] min-w-[186px] max-w-[232px] shrink-0 md:w-auto md:min-w-0 md:max-w-none"
              >
                <Skeleton variant="card" />
              </div>
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
          <div className="mt-7">
            <ProductShelf
              products={activeCollectionProducts}
              brandsMap={brandsMap}
              reviewsStatsMap={reviewsStatsMap}
              tone="light"
              viewAllTo={activeCollectionViewAllUrl}
              viewAllLabel={t('home.viewAll')}
            />
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

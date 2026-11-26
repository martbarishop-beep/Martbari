import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Headphones,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { HeroTrustAndCategories, HomeTrustStrip } from '../components/HeroTrustAndCategories';
import { HomeSectionHeader } from '../components/HomeSectionHeader';
import { LazySection } from '../components/LazySection';
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
  HERO_PROMO_IMAGES,
  HERO_SLIDE_PRESETS,
  PRODUCT_DEMO_IMAGES_BY_SLUG,
  type DemoCategoryKey,
  type HeroSlidePreset,
} from '../config/demoImages';
import { theme } from '../config/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import {
  PRODUCT_CARD_COLUMNS,
  getCachedActiveBrands,
  getCachedActiveCategories,
} from '../lib/categoryCache';
import { buildResponsiveCardSources } from '../lib/imageUrls';
import {
  buildOrganizationAndWebsiteGraph,
  cleanMetaDescription,
  resolveCanonicalOrigin,
} from '../lib/seo';
import { supabase } from '../lib/supabase';
import { cn, sanitizeExternalUrl } from '../lib/utils';
import type {
  Banner,
  Brand,
  Category,
  ProductImage as DbProductImage,
  PublicProduct,
  Review,
} from '../types';

const LazyHomeReviewsSection = lazy(() =>
  import('../components/HomeReviewsSection').then((m) => ({
    default: m.HomeReviewsSection,
  })),
);

const HOME_CACHE_KEY_PREFIX = 'martbari_home_payload_v3';
const HOME_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedHomePayload {
  timestamp: number;
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  reviews: Review[];
  reviewStatsEntries: Array<[string, ProductReviewStats]>;
  catalogProducts: StorefrontProduct[];
}

const memoryHomeCache = new Map<string, CachedHomePayload>();

function readHomeCache(showDemo: boolean): CachedHomePayload | null {
  const key = `${HOME_CACHE_KEY_PREFIX}_${showDemo ? '1' : '0'}`;
  const mem = memoryHomeCache.get(key);
  if (mem && Date.now() - mem.timestamp <= HOME_CACHE_TTL_MS) {
    return mem;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedHomePayload;
    if (!parsed || Date.now() - parsed.timestamp > HOME_CACHE_TTL_MS) return null;
    memoryHomeCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeHomeCache(showDemo: boolean, payload: Omit<CachedHomePayload, 'timestamp'>): void {
  const key = `${HOME_CACHE_KEY_PREFIX}_${showDemo ? '1' : '0'}`;
  const full: CachedHomePayload = { timestamp: Date.now(), ...payload };
  memoryHomeCache.set(key, full);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(full));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearHomeCache(): void {
  memoryHomeCache.clear();
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(`${HOME_CACHE_KEY_PREFIX}_1`);
    window.sessionStorage.removeItem(`${HOME_CACHE_KEY_PREFIX}_0`);
  } catch {
    // Ignore storage errors
  }
}

function matchProductForHeroSlide(
  products: StorefrontProduct[],
  bannerProductId: string | null | undefined,
  linkUrl: string | null | undefined,
  categoryKey: DemoCategoryKey,
  index: number,
): StorefrontProduct | null {
  if (products.length === 0) return null;

  if (bannerProductId) {
    const byId = products.find((p) => p.id === bannerProductId);
    if (byId) return byId;
  }

  const normalizedLink = (linkUrl || '').toLowerCase();
  const productMatch = normalizedLink.match(/\/product\/([^/?#]+)/);
  if (productMatch?.[1]) {
    const bySlug = products.find((p) => p.slug.toLowerCase() === productMatch[1]);
    if (bySlug) return bySlug;
  }

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

function takeEightProducts(primary: StorefrontProduct[], fallback: StorefrontProduct[]): StorefrontProduct[] {
  if (primary.length >= 8) return primary.slice(0, 8);
  const seen = new Set(primary.map((p) => p.id));
  const combined = [...primary];
  for (const item of fallback) {
    if (combined.length >= 8) break;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      combined.push(item);
    }
  }
  return combined.slice(0, 8);
}

const ProductGridSkeleton: React.FC = () => (
  <div className="mt-5 md:mt-7 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
    {Array.from({ length: 8 }).map((_, idx) => (
      <div key={idx} className={cn(idx >= 4 && 'hidden lg:block')}>
        <Skeleton variant="card" />
      </div>
    ))}
  </div>
);

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const showDemoData = settings.show_demo_data !== false;

  const [initialCache] = useState<CachedHomePayload | null>(() => readHomeCache(showDemoData));
  const [banners, setBanners] = useState<Banner[]>(() => initialCache?.banners ?? []);
  const [categories, setCategories] = useState<Category[]>(() => initialCache?.categories ?? []);
  const [brandsMap, setBrandsMap] = useState<Map<string, Brand>>(() => {
    const map = new Map<string, Brand>();
    initialCache?.brands.forEach((b) => map.set(b.id, b));
    return map;
  });
  const [reviewsStatsMap, setReviewsStatsMap] = useState<Map<string, ProductReviewStats>>(
    () => new Map(initialCache?.reviewStatsEntries ?? []),
  );
  const [catalogProducts, setCatalogProducts] = useState<StorefrontProduct[]>(
    () => initialCache?.catalogProducts ?? [],
  );
  const [reviews, setReviews] = useState<Review[]>(() => initialCache?.reviews ?? []);

  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [hasError, setHasError] = useState(false);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>('q1');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const featuredProducts = useMemo(
    () =>
      takeEightProducts(
        catalogProducts.filter((p) => p.is_featured),
        catalogProducts,
      ),
    [catalogProducts],
  );

  const newArrivals = useMemo(
    () =>
      takeEightProducts(
        catalogProducts.filter((p) => p.is_new),
        catalogProducts,
      ),
    [catalogProducts],
  );

  const bestSellers = useMemo(() => {
    const sorted = [...catalogProducts].sort((a, b) => {
      const aScore = (reviewsStatsMap.get(a.id)?.count ?? 0) * 10 + (a.is_featured ? 3 : 0);
      const bScore = (reviewsStatsMap.get(b.id)?.count ?? 0) * 10 + (b.is_featured ? 3 : 0);
      return bScore - aScore;
    });
    return sorted.slice(0, 8);
  }, [catalogProducts, reviewsStatsMap]);

  const loadHomeData = useCallback(
    async (forceRefresh = false) => {
      if (!supabase) {
        if (showDemoData) {
          const { buildFallbackDemoProducts } = await import('../config/demoFallbackProducts');
          setCatalogProducts(buildFallbackDemoProducts());
        } else {
          setCatalogProducts([]);
        }
        setBanners([]);
        setCategories([]);
        setReviews([]);
        setLoading(false);
        return;
      }

      if (!forceRefresh) {
        const cached = readHomeCache(showDemoData);
        if (cached) {
          setBanners(cached.banners);
          setCategories(cached.categories);
          const cachedBMap = new Map<string, Brand>();
          cached.brands.forEach((b) => cachedBMap.set(b.id, b));
          setBrandsMap(cachedBMap);
          setReviews(cached.reviews);
          setReviewsStatsMap(new Map(cached.reviewStatsEntries));
          setCatalogProducts(cached.catalogProducts);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setHasError(false);
      try {
        const [
          { data: bannerData, error: bannerErr },
          catData,
          brandData,
          { data: allProductsData, error: prodErr },
          { data: reviewsData },
        ] = await Promise.all([
          supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          getCachedActiveCategories(12),
          getCachedActiveBrands(),
          supabase
            .from('public_products')
            .select(PRODUCT_CARD_COLUMNS)
            .order('created_at', { ascending: false })
            .limit(32),
          supabase
            .from('reviews')
            .select('id, product_id, customer_name, rating, comment, is_approved, created_at')
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(36),
        ]);

        if (prodErr && bannerErr) {
          setHasError(true);
          return;
        }

        const filteredBanners = ((bannerData ?? []) as Banner[]).filter(
          (b) => showDemoData || !isDemoBanner(b),
        );
        setBanners(filteredBanners);

        const catList = catData.filter((c) => showDemoData || !isDemoCategory(c));
        setCategories(catList);
        const catSlugById = new Map<string, string>();
        catList.forEach((c) => catSlugById.set(c.id, c.slug));

        const bMap = new Map<string, Brand>();
        brandData.forEach((b) => bMap.set(b.id, b));
        setBrandsMap(bMap);

        const rawProds = (allProductsData ?? []) as unknown as PublicProduct[];
        const prods = rawProds.filter((p) => showDemoData || !isDemoProduct(p));

        // Fetch any hero-linked products via banners.product_id missing from the initial 32 rows
        const existingIds = new Set(prods.map((p) => p.id));
        const missingBannerProductIds = filteredBanners
          .map((b) => b.product_id)
          .filter((pid): pid is string => Boolean(pid && !existingIds.has(pid)));

        if (missingBannerProductIds.length > 0) {
          const { data: extraProds } = await supabase
            .from('public_products')
            .select(PRODUCT_CARD_COLUMNS)
            .in('id', missingBannerProductIds);
          if (extraProds) {
            (extraProds as unknown as PublicProduct[]).forEach((ep) => {
              if (showDemoData || !isDemoProduct(ep)) {
                prods.push(ep);
              }
            });
          }
        }

        const allowedProdIds = new Set(prods.map((p) => p.id));

        let nextReviews: Review[] = [];
        let nextStats = new Map<string, ProductReviewStats>();

        if (reviewsData) {
          const allRevs = (reviewsData as Review[]).filter(
            (rev) => showDemoData || allowedProdIds.has(rev.product_id),
          );
          nextReviews = allRevs.slice(0, 6);

          const statsMap = new Map<string, { sum: number; count: number }>();
          allRevs.forEach((rev) => {
            const prev = statsMap.get(rev.product_id) ?? { sum: 0, count: 0 };
            statsMap.set(rev.product_id, {
              sum: prev.sum + Number(rev.rating || 5),
              count: prev.count + 1,
            });
          });

          nextStats = new Map<string, ProductReviewStats>();
          statsMap.forEach((val, key) => {
            nextStats.set(key, {
              avg: Number((val.sum / val.count).toFixed(1)),
              count: val.count,
            });
          });
        }
        setReviews(nextReviews);
        setReviewsStatsMap(nextStats);

        let finalCatalog: StorefrontProduct[] = [];
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

          finalCatalog = prods.map((p) => {
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
        } else if (showDemoData) {
          const { buildFallbackDemoProducts } = await import('../config/demoFallbackProducts');
          finalCatalog = buildFallbackDemoProducts();
        }

        setCatalogProducts(finalCatalog);
        writeHomeCache(showDemoData, {
          banners: filteredBanners,
          categories: catList,
          brands: brandData,
          reviews: nextReviews,
          reviewStatsEntries: Array.from(nextStats.entries()),
          catalogProducts: finalCatalog,
        });
      } catch {
        setHasError(true);
      } finally {
        setLoading(false);
      }
    },
    [showDemoData],
  );

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const heroSlides: ShoppableHeroSlide[] = useMemo(() => {
    const productPool = catalogProducts;

    if (banners.length === 0) {
      if (!showDemoData) return [];
      return HERO_SLIDE_PRESETS.map((p, idx) => {
        const matchedProduct = matchProductForHeroSlide(
          productPool,
          null,
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

    const demoOnlyDeduplicated =
      banners.every((b) => isDemoBanner(b)) &&
      banners.length > 4 &&
      banners.some((b) => b.link_url === '/category/mobile-accessories') &&
      banners.some((b) => b.link_url === '/category/lighting')
        ? banners.filter((b) => b.link_url !== '/category/lighting')
        : banners;

    // Show custom admin-uploaded slides first (ordered by sort_order), followed by active demo slides
    const orderedBanners = [...demoOnlyDeduplicated].sort((a, b) => {
      const aCustom = !isDemoBanner(a) ? 0 : 1;
      const bCustom = !isDemoBanner(b) ? 0 : 1;
      if (aCustom !== bCustom) return aCustom - bCustom;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    return orderedBanners.slice(0, 12).map((b, idx) => {
      const isDemo = isDemoBanner(b);
      const fallbackPreset = isDemo ? matchHeroPreset(b, idx) : null;
      const preset = showDemoData && isDemo ? fallbackPreset : null;

      const imageUrl = isRemoteOrStaticImage(b.image_url)
        ? b.image_url
        : preset?.imageUrl || fallbackPreset?.imageUrl || '';
      const categoryKey = fallbackPreset?.category || 'smart-watches';
      const linkUrl = b.link_url || preset?.linkUrl || '';

      let matchedProduct: StorefrontProduct | null = null;
      if (isDemo) {
        matchedProduct = matchProductForHeroSlide(
          productPool,
          b.product_id,
          linkUrl,
          categoryKey,
          idx,
        );
      } else if (b.product_id) {
        matchedProduct = productPool.find((p) => p.id === b.product_id) ?? null;
      } else if (linkUrl.toLowerCase().includes('/product/')) {
        const productMatch = linkUrl.toLowerCase().match(/\/product\/([^/?#]+)/);
        if (productMatch?.[1]) {
          matchedProduct =
            productPool.find((p) => p.slug.toLowerCase() === productMatch[1]) ?? null;
        }
      }

      return {
        id: b.id,
        imageUrl,
        labelBn: b.label_bn || preset?.labelBn || '',
        labelEn: b.label_en || preset?.labelEn || '',
        titleBn: b.title_bn || preset?.titleBn || '',
        titleEn: b.title_en || preset?.titleEn || '',
        subtitleBn: b.subtitle_bn || preset?.subtitleBn || '',
        subtitleEn: b.subtitle_en || preset?.subtitleEn || '',
        priceBadgeBn: b.price_badge_bn || preset?.priceBadgeBn || '',
        priceBadgeEn: b.price_badge_en || preset?.priceBadgeEn || '',
        primaryCtaBn: b.button_text_bn || preset?.primaryCtaBn || '',
        primaryCtaEn: b.button_text_en || preset?.primaryCtaEn || '',
        secondaryCtaBn: b.secondary_button_text_bn || preset?.secondaryCtaBn || '',
        secondaryCtaEn: b.secondary_button_text_en || preset?.secondaryCtaEn || '',
        linkUrl,
        secondaryLinkUrl: b.secondary_link_url || preset?.secondaryLinkUrl || '',
        categoryKey,
        product: matchedProduct,
        reviewStats: matchedProduct ? reviewsStatsMap.get(matchedProduct.id) ?? null : null,
      };
    });
  }, [banners, catalogProducts, reviewsStatsMap, showDemoData]);

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

  const promoSources = useMemo(
    () =>
      buildResponsiveCardSources(
        HERO_PROMO_IMAGES.flashSale,
        '(max-width: 767px) 92vw, 520px',
      ),
    [],
  );

  const whyCards = [
    {
      key: 'check',
      icon: PackageCheck,
      title: t('home.whyCard1Title'),
      desc: t('home.whyCard1Desc'),
    },
    {
      key: 'fast',
      icon: Truck,
      title: t('home.whyCard2Title'),
      desc: t('home.whyCard2Desc'),
    },
    {
      key: 'warranty',
      icon: ShieldCheck,
      title: t('home.whyCard3Title'),
      desc: t('home.whyCard3Desc'),
    },
    {
      key: 'support',
      icon: Headphones,
      title: t('home.whyCard4Title'),
      desc: t('home.whyCard4Desc'),
    },
  ];

  const storeDisplayName =
    (lang === 'bn' ? settings.store_name_bn : settings.store_name_en) || t('brand.name');

  const siteOrigin = resolveCanonicalOrigin();
  const homeUrl = `${siteOrigin}/${lang}`;
  const homeTitle =
    lang === 'bn'
      ? `${storeDisplayName} — ${t('brand.tagline')} | MartBari`
      : `${storeDisplayName} — ${t('brand.tagline')} in Bangladesh`;
  const homeDescription = cleanMetaDescription(
    lang === 'bn'
      ? `${storeDisplayName} — বাংলাদেশের বিশ্বস্ত অনলাইন ইলেকট্রনিক্স, স্মার্ট ওয়াচ, ইয়ারবাডস, হেডফোন ও হোম অ্যাপ্লায়েন্স স্টোর। সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারি ও ৭ দিনের সহজ রিটার্ন।`
      : `${storeDisplayName} — Bangladesh's trusted online store for smart watches, ANC headphones, earbuds, lighting, and home appliances with fast nationwide Cash on Delivery.`,
  );
  const ogImageUrl =
    heroSlides[0]?.imageUrl && /^https?:\/\//i.test(heroSlides[0].imageUrl)
      ? heroSlides[0].imageUrl
      : `${siteOrigin}/pwa-512x512.png`;

  const socialUrls = useMemo(
    () =>
      [
        sanitizeExternalUrl(settings.facebook_url),
        sanitizeExternalUrl(settings.instagram_url),
        sanitizeExternalUrl(settings.youtube_url),
        sanitizeExternalUrl(settings.tiktok_url),
      ].filter((u): u is string => Boolean(u)),
    [settings.facebook_url, settings.instagram_url, settings.youtube_url, settings.tiktok_url],
  );

  const homeOrgGraphJsonLd = useMemo(
    () =>
      buildOrganizationAndWebsiteGraph({
        origin: siteOrigin,
        lang,
        storeName: storeDisplayName,
        description: homeDescription,
        phone: settings.phone || undefined,
        email: settings.email || undefined,
        socialUrls,
      }),
    [siteOrigin, lang, storeDisplayName, homeDescription, settings.phone, settings.email, socialUrls],
  );

  const featuredListJsonLd = useMemo(
    () =>
      featuredProducts.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: t('home.featuredTitle'),
            numberOfItems: featuredProducts.length,
            itemListElement: featuredProducts.map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              url: `${siteOrigin}/${lang}/product/${p.slug}`,
              name: lang === 'bn' ? p.name_bn : p.name_en,
            })),
          }
        : null,
    [featuredProducts, lang, siteOrigin, t],
  );

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: (['1', '2', '3', '4', '5'] as const).map((num) => ({
        '@type': 'Question',
        name: t(`faq.q${num}`),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t(`faq.a${num}`),
        },
      })),
    }),
    [t],
  );

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{homeTitle}</title>
        <meta name="description" content={homeDescription} />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <link rel="canonical" href={homeUrl} />
        <link rel="alternate" hrefLang="bn" href={`${siteOrigin}/bn`} />
        <link rel="alternate" hrefLang="en" href={`${siteOrigin}/en`} />
        <link rel="alternate" hrefLang="x-default" href={`${siteOrigin}/bn`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={storeDisplayName} />
        <meta property="og:locale" content={lang === 'bn' ? 'bn_BD' : 'en_US'} />
        <meta property="og:url" content={homeUrl} />
        <meta property="og:title" content={homeTitle} />
        <meta property="og:description" content={homeDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={homeTitle} />
        <meta name="twitter:description" content={homeDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
        <script type="application/ld+json">{JSON.stringify(homeOrgGraphJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        {featuredListJsonLd && (
          <script type="application/ld+json">{JSON.stringify(featuredListJsonLd)}</script>
        )}
      </Helmet>

      <div className="w-full overflow-x-clip bg-[#FAF8F5] pt-3 pb-8 md:pt-5 md:pb-12 space-y-4 sm:space-y-5 md:space-y-6">
        {/* HERO: SLIM-FIT SLIDESHOW COVER */}
        <ShoppableHero
          slides={heroSlides}
          storeDisplayName={storeDisplayName}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* 1. TRUST STRIP (4 COMPACT ITEMS) */}
        <HomeTrustStrip />

        {/* 2. SHOP BY CATEGORY (6 DESKTOP / 3x2 MOBILE) */}
        <HeroTrustAndCategories categories={displayCategories} loading={loading} />

        {/* 3. FEATURED PRODUCTS (8 ITEMS) */}
        <section className="w-full">
          <div className={theme.layout.containerClass}>
            <div className={cn(theme.layout.homeSectionBoxClass, 'bg-[#FAF8F5]')}>
              <HomeSectionHeader
                eyebrow={t('home.featuredEyebrow')}
                title={t('home.featuredTitle')}
                subtitle={t('home.featuredSubtitle')}
                viewAllTo={localizedPath('/shop')}
                viewAllLabel={t('home.viewAll')}
              />

              {loading ? (
                <ProductGridSkeleton />
              ) : hasError ? (
                <div className="mt-5 md:mt-7">
                  <ErrorState onRetry={() => void loadHomeData(true)} />
                </div>
              ) : featuredProducts.length === 0 ? (
                <div className="mt-5 md:mt-7">
                  <EmptyState
                    imageUrl={showDemoData ? EDITORIAL_DEMO_IMAGES.emptyShowcase : undefined}
                    description={t('home.noSectionProducts')}
                    actionLabel={t('hero.primaryCta')}
                    onAction={() => navigate(localizedPath('/shop'))}
                  />
                </div>
              ) : (
                <div className="mt-5 md:mt-7">
                  <ProductShelf
                    products={featuredProducts}
                    brandsMap={brandsMap}
                    reviewsStatsMap={reviewsStatsMap}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. ONE WIDE PROMO BANNER (1 IMAGE, TITLE, 1 BUTTON) */}
        <LazySection
          minHeightClassName="min-h-[280px]"
          fallback={
            <section className="w-full">
              <div className={theme.layout.containerClass}>
                <div
                  style={{ backgroundColor: theme.colors.sectionNavyTint }}
                  className={theme.layout.homeSectionBoxClass}
                >
                  <Skeleton className="h-[220px] w-full rounded-[16px]" />
                </div>
              </div>
            </section>
          }
        >
          <section className="w-full">
            <div className={theme.layout.containerClass}>
              <div
                style={{ backgroundColor: theme.colors.sectionNavyTint }}
                className={theme.layout.homeSectionBoxClass}
              >
                <div
                  style={{ boxShadow: theme.shadows.card }}
                  className="grid grid-cols-1 items-center gap-5 overflow-hidden rounded-[16px] border border-[#17263E]/10 bg-white p-4 md:grid-cols-12 md:gap-8 md:p-7"
                >
                  <div className="md:col-span-5 overflow-hidden rounded-[12px] bg-[#EEF3FA] aspect-[16/10]">
                    {promoSources.src ? (
                      <picture className="block h-full w-full">
                        {promoSources.avifSrcSet && (
                          <source
                            type="image/avif"
                            srcSet={promoSources.avifSrcSet}
                            sizes={promoSources.sizes}
                          />
                        )}
                        {promoSources.webpSrcSet && (
                          <source
                            type="image/webp"
                            srcSet={promoSources.webpSrcSet}
                            sizes={promoSources.sizes}
                          />
                        )}
                        <img
                          src={promoSources.src}
                          alt={t('home.promoTitle')}
                          width={520}
                          height={325}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </picture>
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#17263E] to-[#243B61]" />
                    )}
                  </div>

                  <div className="md:col-span-7 flex flex-col items-start min-w-0">
                    <p className="text-xs font-bold tracking-wide text-[#D95F18]">
                      {t('home.promoEyebrow')}
                    </p>
                    <h2 className="mt-1.5 py-0.5 text-[22px] md:text-[28px] font-bold leading-[1.42] text-[#0F1A2C]">
                      {t('home.promoTitle')}
                    </h2>
                    <p className="mt-2.5 text-sm md:text-base leading-relaxed text-[#5B6577] max-w-xl">
                      {t('home.promoSubtitle')}
                    </p>
                    <Link
                      to={localizedPath('/shop?on_sale=true')}
                      className={cn(theme.buttons.primary, 'mt-5 min-h-[44px] px-6 text-sm')}
                    >
                      {t('home.promoCta')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* 5. NEW ARRIVALS (8 ITEMS) */}
        <LazySection
          minHeightClassName="min-h-[420px]"
          fallback={
            <section className="w-full">
              <div className={theme.layout.containerClass}>
                <div className={cn(theme.layout.homeSectionBoxClass, 'bg-[#FAF8F5]')}>
                  <Skeleton className="h-8 w-56 rounded" />
                  <ProductGridSkeleton />
                </div>
              </div>
            </section>
          }
        >
          <section className="w-full">
            <div className={theme.layout.containerClass}>
              <div className={cn(theme.layout.homeSectionBoxClass, 'bg-[#FAF8F5]')}>
                <HomeSectionHeader
                  eyebrow={t('home.newArrivalsEyebrow')}
                  title={t('home.newArrivalsTitle')}
                  subtitle={t('home.newArrivalsSubtitle')}
                  viewAllTo={localizedPath('/shop?sort=newest')}
                  viewAllLabel={t('home.viewAll')}
                />

                {loading ? (
                  <ProductGridSkeleton />
                ) : newArrivals.length === 0 ? (
                  <div className="mt-5 md:mt-7">
                    <EmptyState
                      description={t('home.noSectionProducts')}
                      actionLabel={t('hero.primaryCta')}
                      onAction={() => navigate(localizedPath('/shop'))}
                    />
                  </div>
                ) : (
                  <div className="mt-5 md:mt-7">
                    <ProductShelf
                      products={newArrivals}
                      brandsMap={brandsMap}
                      reviewsStatsMap={reviewsStatsMap}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </LazySection>

        {/* 6. BEST SELLERS (8 ITEMS) */}
        <LazySection
          minHeightClassName="min-h-[420px]"
          fallback={
            <section className="w-full">
              <div className={theme.layout.containerClass}>
                <div
                  style={{ backgroundColor: theme.colors.sectionOrangeTint }}
                  className={theme.layout.homeSectionBoxClass}
                >
                  <Skeleton className="h-8 w-56 rounded" />
                  <ProductGridSkeleton />
                </div>
              </div>
            </section>
          }
        >
          <section className="w-full">
            <div className={theme.layout.containerClass}>
              <div
                style={{ backgroundColor: theme.colors.sectionOrangeTint }}
                className={theme.layout.homeSectionBoxClass}
              >
                <HomeSectionHeader
                  eyebrow={t('home.bestSellersEyebrow')}
                  title={t('home.bestSellersTitle')}
                  subtitle={t('home.bestSellersSubtitle')}
                  viewAllTo={localizedPath('/shop?sort=popular')}
                  viewAllLabel={t('home.viewAll')}
                />

                {loading ? (
                  <ProductGridSkeleton />
                ) : bestSellers.length === 0 ? (
                  <div className="mt-5 md:mt-7">
                    <EmptyState
                      description={t('home.noSectionProducts')}
                      actionLabel={t('hero.primaryCta')}
                      onAction={() => navigate(localizedPath('/shop'))}
                    />
                  </div>
                ) : (
                  <div className="mt-5 md:mt-7">
                    <ProductShelf
                      products={bestSellers}
                      brandsMap={brandsMap}
                      reviewsStatsMap={reviewsStatsMap}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </LazySection>

        {/* 7. WHY MARTBARI (4 ICON CARDS) */}
        <LazySection minHeightClassName="min-h-[260px]">
          <section className="w-full">
            <div className={theme.layout.containerClass}>
              <div className={cn(theme.layout.homeSectionBoxClass, 'bg-[#FAF8F5]')}>
                <HomeSectionHeader
                  eyebrow={t('home.whyEyebrow')}
                  title={t('home.whyTitle')}
                  subtitle={t('home.whySubtitle')}
                />

                <div className="mt-5 md:mt-7 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                  {whyCards.map(({ key, icon: Icon, title, desc }) => (
                    <div
                      key={key}
                      style={{
                        borderRadius: theme.radii.card,
                        boxShadow: theme.shadows.card,
                      }}
                      className="desktop-card-lift flex flex-col border border-[#17263E]/10 bg-white p-3.5 sm:p-4"
                    >
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#FFF4EC] text-[#F47125]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-3.5 text-sm sm:text-base font-bold text-[#0F1A2C]">
                        {title}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#5B6577]">
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* 8. CUSTOMER REVIEWS (3 DESKTOP / 1 MOBILE WITH SHOW MORE) */}
        {(reviews.length > 0 || showDemoData) && (
          <LazySection
            minHeightClassName="min-h-[280px]"
            fallback={
              <section className="w-full">
                <div className={theme.layout.containerClass}>
                  <div
                    style={{ backgroundColor: theme.colors.sectionNavyTint }}
                    className={theme.layout.homeSectionBoxClass}
                  >
                    <Skeleton className="h-8 w-56 rounded" />
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Skeleton className="h-36 rounded-[16px]" />
                      <Skeleton className="h-36 rounded-[16px] hidden md:block" />
                      <Skeleton className="h-36 rounded-[16px] hidden md:block" />
                    </div>
                  </div>
                </div>
              </section>
            }
          >
            <Suspense fallback={null}>
              <LazyHomeReviewsSection reviews={reviews} showDemoData={showDemoData} />
            </Suspense>
          </LazySection>
        )}

        {/* 9. FAQ ACCORDION (CENTER-ALIGNED HELP & ANSWERS) */}
        <LazySection minHeightClassName="min-h-[320px]">
          <section aria-labelledby="home-faq-heading" className="w-full">
            <div className={theme.layout.containerClass}>
              <div className={cn(theme.layout.homeSectionBoxClass, 'bg-[#FAF8F5]')}>
                <div className="mx-auto max-w-2xl text-center">
                  <p className="text-xs font-bold tracking-wide text-[#D95F18]">
                    {t('home.faqEyebrow')}
                  </p>
                  <h2
                    id="home-faq-heading"
                    className="mt-1.5 py-0.5 text-[22px] md:text-[28px] font-bold leading-[1.42] tracking-tight text-[#0F1A2C]"
                  >
                    {t('home.faqTitle')}
                  </h2>
                  <div
                    aria-hidden="true"
                    className="mx-auto mt-2.5 h-[3px] w-12 rounded-full bg-[#F47125]"
                  />
                  <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-[#5B6577]">
                    {t('home.faqSubtitle')}
                  </p>
                </div>

                <div className="mx-auto mt-6 md:mt-8 w-full max-w-3xl space-y-3">
                  {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map((key) => {
                    const isOpen = openFaq === key;
                    return (
                      <div
                        key={key}
                        style={{
                          borderRadius: theme.radii.card,
                          boxShadow: theme.shadows.card,
                        }}
                        className={cn(
                          'overflow-hidden border bg-white transition-colors duration-150',
                          isOpen ? 'border-[#F47125]/35' : 'border-[#17263E]/10',
                        )}
                      >
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenFaq(isOpen ? null : key)}
                          className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4 text-left text-sm sm:text-base font-semibold text-[#0F1A2C] hover:text-[#F47125] transition-colors cursor-pointer"
                        >
                          <span className="py-0.5 leading-[1.5]">{t(`faq.${key}`)}</span>
                          <span
                            className={cn(
                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                              isOpen
                                ? 'bg-[#FFF4EC] text-[#F47125]'
                                : 'bg-[#FAF8F5] text-[#5B6577]',
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform duration-150',
                                isOpen && 'rotate-180',
                              )}
                              aria-hidden="true"
                            />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-[#17263E]/8 bg-[#FAF8F5] px-4 py-3.5 sm:px-5 sm:py-4 text-sm leading-[1.65] text-[#5B6577]">
                            {t(`faq.a${key.slice(1)}`)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 md:mt-8 flex justify-center">
                  <Link
                    to={localizedPath('/contact')}
                    className={cn(theme.buttons.secondary, 'min-h-[42px] px-5 text-xs sm:text-sm')}
                  >
                    <span>{t('nav.contact')}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </LazySection>
      </div>
    </>
  );
};

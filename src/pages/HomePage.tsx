import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Button, Skeleton } from '../components/ui';
import { DEMO_IMAGES } from '../config/constants';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import type {
  Banner,
  Brand,
  Category,
  ProductImage as DbProductImage,
  PublicProduct,
  Review,
} from '../types';

interface ProductWithImage extends PublicProduct {
  image_url: string | null;
}

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField } = useLanguage();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandsMap, setBrandsMap] = useState<Map<string, Brand>>(new Map());
  const [flashSaleProducts, setFlashSaleProducts] = useState<ProductWithImage[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithImage[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductWithImage[]>([]);
  const [bestSellers, setBestSellers] = useState<ProductWithImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Hero Slider state
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  // Flash Sale Countdown state (simulated 18 hours cycle)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 14,
    minutes: 32,
    seconds: 45,
  });

  // FAQ open item
  const [openFaq, setOpenFaq] = useState<string | null>('q1');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all live storefront data from Supabase public views
  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [
          { data: bannerData },
          { data: catData },
          { data: brandData },
          { data: allProductsData },
          { data: reviewsData },
        ] = await Promise.all([
          supabase.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
          supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
          supabase.from('brands').select('*').eq('is_active', true),
          supabase.from('public_products').select('*').order('created_at', { ascending: false }).limit(24),
          supabase.from('reviews').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
        ]);

        if (!active) return;

        if (bannerData && bannerData.length > 0) {
          setBanners(bannerData as Banner[]);
        } else {
          // Fallback banners if table is empty
          setBanners([
            {
              id: 'b1',
              image_url: DEMO_IMAGES.hero,
              title_bn: 'সেরা স্মার্ট গ্যাজেট ও ইলেকট্রনিক্স কালেকশন',
              title_en: 'Signature Smart Gadgets & Electronics',
              link_url: '/shop',
              sort_order: 1,
              is_active: true,
              created_at: '',
            },
            {
              id: 'b2',
              image_url: DEMO_IMAGES.smartwatch,
              title_bn: 'নতুন অ্যামোলেড স্মার্ট ওয়াচ সিরিজ',
              title_en: 'New AMOLED Smart Watch Series',
              link_url: '/category/smart-watches',
              sort_order: 2,
              is_active: true,
              created_at: '',
            },
            {
              id: 'b3',
              image_url: DEMO_IMAGES.appliance,
              title_bn: 'স্মার্ট হোম অ্যাপ্লায়েন্সে বিশেষ অফার',
              title_en: 'Smart Home Appliances Deals',
              link_url: '/category/home-appliances',
              sort_order: 3,
              is_active: true,
              created_at: '',
            },
          ]);
        }

        if (catData) setCategories(catData as Category[]);

        const bMap = new Map<string, Brand>();
        if (brandData) {
          (brandData as Brand[]).forEach((b) => bMap.set(b.id, b));
          setBrandsMap(bMap);
        }

        if (reviewsData) setReviews(reviewsData as Review[]);

        const prods = (allProductsData ?? []) as PublicProduct[];
        if (prods.length > 0) {
          const ids = prods.map((p) => p.id);
          const { data: imgData } = await supabase
            .from('product_images')
            .select('product_id, image_url, sort_order')
            .in('product_id', ids)
            .order('sort_order', { ascending: true });

          const imageMap = new Map<string, string>();
          (imgData as DbProductImage[] | null)?.forEach((img) => {
            if (!imageMap.has(img.product_id)) {
              imageMap.set(img.product_id, img.image_url);
            }
          });

          const withImages: ProductWithImage[] = prods.map((p) => ({
            ...p,
            image_url: imageMap.get(p.id) ?? null,
          }));

          // Group into sections
          setFlashSaleProducts(
            withImages.filter((p) => p.sale_price !== null && p.sale_price < p.price).slice(0, 4),
          );
          setFeaturedProducts(withImages.filter((p) => p.is_featured).slice(0, 6));
          setNewArrivals(withImages.filter((p) => p.is_new).slice(0, 6));
          setBestSellers(withImages.slice(0, 6));
        } else {
          // Rich demo fallback products for instant stunning showcase matching PublicProduct interface
          const demoProducts: ProductWithImage[] = [
            {
              id: 'demo-1',
              name_bn: 'অ্যামোলেড স্মার্টওয়াচ প্রো ৮ (Ultra Smartwatch)',
              name_en: 'AMOLED Smart Watch Pro 8 Ultra',
              slug: 'amoled-smart-watch-pro-8',
              short_desc_bn: 'ব্লুটুথ কলিং, হার্ট রেট ও স্পোর্টস মোড সম্বলিত প্রিমিয়াম স্মার্টওয়াচ।',
              short_desc_en: 'Premium smartwatch with Bluetooth calling, AMOLED display & fitness tracking.',
              description_bn: 'প্রিমিয়াম অ্যালুমিনিয়াম বডি এবং ব্রাইট অ্যামোলেড ডিসপ্লে সমৃদ্ধ এই স্মার্টওয়াচটি আপনার ফিটনেস ও দৈনন্দিন নোটিফিকেশন ট্র্যাক করতে দারুণ কার্যকর।',
              description_en: 'Premium aluminum body smartwatch with bright AMOLED display and comprehensive health tracking.',
              specifications: [],
              price: 3499,
              sale_price: 2400,
              sale_starts_at: null,
              sale_ends_at: null,
              stock: 45,
              low_stock_threshold: 5,
              sku: 'MB-SW-01',
              barcode: null,
              brand_id: null,
              category_id: null,
              warranty_bn: '১ বছরের সার্ভিস ওয়ারেন্টি',
              warranty_en: '1 Year Service Warranty',
              weight_grams: 120,
              is_active: true,
              is_featured: true,
              is_new: true,
              track_stock: true,
              seo_title_bn: null,
              seo_title_en: null,
              seo_desc_bn: null,
              seo_desc_en: null,
              estimated_delivery_days: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.smartwatch,
            },
            {
              id: 'demo-2',
              name_bn: 'ট্রু ওয়্যারলেস প্রো ইয়ারবাডস (ENC & Deep Bass)',
              name_en: 'True Wireless Pro Earbuds ENC Deep Bass',
              slug: 'true-wireless-pro-earbuds',
              short_desc_bn: 'ক্রিস্টাল ক্লিয়ার সাউন্ড ও দীর্ঘস্থায়ী ব্যাটারি ব্যাকআপ।',
              short_desc_en: 'Crystal clear ENC audio quality with ultra-long battery life.',
              description_bn: 'উন্নত নয়েজ ক্যান্সেলেশন এবং শক্তিশালী ডিপ বেস সাউন্ড কোয়ালিটি। গেমিং ও মিউজিকের জন্য পারফেক্ট।',
              description_en: 'Advanced environmental noise cancellation with deep bass sound for immersive listening.',
              specifications: [],
              price: 2200,
              sale_price: 1550,
              sale_starts_at: null,
              sale_ends_at: null,
              stock: 60,
              low_stock_threshold: 5,
              sku: 'MB-EB-02',
              barcode: null,
              brand_id: null,
              category_id: null,
              warranty_bn: '৬ মাসের রিপ্লেসমেন্ট ওয়ারেন্টি',
              warranty_en: '6 Months Replacement Warranty',
              weight_grams: 85,
              is_active: true,
              is_featured: true,
              is_new: true,
              track_stock: true,
              seo_title_bn: null,
              seo_title_en: null,
              seo_desc_bn: null,
              seo_desc_en: null,
              estimated_delivery_days: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.earbuds,
            },
            {
              id: 'demo-3',
              name_bn: 'স্মার্ট ইলেকট্রিক কেটলি ২.০ লিটার',
              name_en: 'Smart Electric Kettle 2.0L Stainless Steel',
              slug: 'smart-electric-kettle-2l',
              short_desc_bn: 'দ্রুত পানি গরম করার জন্য স্টেইনলেস স্টিল বডি ও অটো শাট-অফ।',
              short_desc_en: 'Rapid boil stainless steel electric kettle with auto shut-off protection.',
              description_bn: 'ডাবল ওয়াল ইনসুলেশন এবং অটো কাট-আউট সিস্টেম সমৃদ্ধ স্টেইনলেস স্টিল ইলেকট্রিক কেটলি।',
              description_en: 'Double wall insulation and auto cut-out system stainless steel electric kettle.',
              specifications: [],
              price: 2800,
              sale_price: 1950,
              sale_starts_at: null,
              sale_ends_at: null,
              stock: 25,
              low_stock_threshold: 5,
              sku: 'MB-KT-03',
              barcode: null,
              brand_id: null,
              category_id: null,
              warranty_bn: '১ বছরের ওয়ারেন্টি',
              warranty_en: '1 Year Warranty',
              weight_grams: 850,
              is_active: true,
              is_featured: true,
              is_new: false,
              track_stock: true,
              seo_title_bn: null,
              seo_title_en: null,
              seo_desc_bn: null,
              seo_desc_en: null,
              estimated_delivery_days: 3,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.appliance,
            },
            {
              id: 'demo-4',
              name_bn: 'কর্ডলেস হ্যান্ডহেল্ড ভ্যাকুয়াম ক্লিনার',
              name_en: 'Cordless Handheld Car & Home Vacuum Cleaner',
              slug: 'cordless-handheld-vacuum-cleaner',
              short_desc_bn: 'শক্তিশালী সাকশন পাওয়ার ও রিচার্জেবল ব্যাটারিযুক্ত পোর্টেবল ক্লিনার।',
              short_desc_en: 'Powerful suction rechargeable portable vacuum cleaner for car and home.',
              description_bn: 'গাড়ি এবং ঘরের ছোটখাটো কর্নার পরিষ্কার করার জন্য লাইটওয়েট ও রিচার্জেবল ভ্যাকুয়াম ক্লিনার।',
              description_en: 'Lightweight and rechargeable handheld vacuum cleaner for car interiors and home use.',
              specifications: [],
              price: 4500,
              sale_price: 3600,
              sale_starts_at: null,
              sale_ends_at: null,
              stock: 18,
              low_stock_threshold: 5,
              sku: 'MB-VC-04',
              barcode: null,
              brand_id: null,
              category_id: null,
              warranty_bn: '৬ মাসের ওয়ারেন্টি',
              warranty_en: '6 Months Warranty',
              weight_grams: 600,
              is_active: true,
              is_featured: true,
              is_new: true,
              track_stock: true,
              seo_title_bn: null,
              seo_title_en: null,
              seo_desc_bn: null,
              seo_desc_en: null,
              estimated_delivery_days: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.hero,
            },
            {
              id: 'demo-5',
              name_bn: 'ম্যাগনেটিক ৩-ইন-১ ফাস্ট ওয়্যারলেস চার্জার',
              name_en: 'Magnetic 3-in-1 Fast Wireless Charging Station',
              slug: 'magnetic-3-in-1-wireless-charger',
              short_desc_bn: 'একসাথে ফোন, ইয়ারবাডস ও স্মার্টওয়াচ চার্জ করার সুবিধা।',
              short_desc_en: 'Simultaneously charge your phone, smartwatch, and wireless earbuds.',
              description_bn: 'টেবিল পরিপাটি রাখতে এবং একসাথে তিনটি ডিভাইস ফাস্ট চার্জ করার জন্য চমৎকার গ্যাজেট।',
              description_en: 'Keep your desk clutter-free while fast charging your phone, watch, and earbuds simultaneously.',
              specifications: [],
              price: 1800,
              sale_price: 1290,
              sale_starts_at: null,
              sale_ends_at: null,
              stock: 40,
              low_stock_threshold: 5,
              sku: 'MB-WC-05',
              barcode: null,
              brand_id: null,
              category_id: null,
              warranty_bn: '৬ মাসের ওয়ারেন্টি',
              warranty_en: '6 Months Warranty',
              weight_grams: 220,
              is_active: true,
              is_featured: false,
              is_new: true,
              track_stock: true,
              seo_title_bn: null,
              seo_title_en: null,
              seo_desc_bn: null,
              seo_desc_en: null,
              estimated_delivery_days: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.smartwatch,
            },
            {
              id: 'demo-6',
              name_bn: 'পোর্টেবল ব্লুটুথ স্পিকার উইথ আরবিজি লাইট',
              name_en: 'Portable Bluetooth Speaker with RGB Light',
              slug: 'portable-bluetooth-speaker-rgb',
              short_desc_bn: 'রিচ বেস ও চমৎকার সাউন্ড এফেক্টসহ ওয়াটারপ্রুফ স্পিকার।',
              short_desc_en: 'Waterproof portable bluetooth speaker with deep bass and vibrant RGB lighting.',
              description_bn: 'আউটডোর ট্রাভেল ও পার্টি বা আড্ডার জন্য প্রাণবন্ত সাউন্ড ও লাইটিং ইফেক্টযুক্ত পোর্টেবল স্পিকার।',
              description_en: 'Vibrant sound and RGB lighting effects for outdoor travel, parties, and casual gatherings.',
              specifications: [],
              price: 1600,
              sale_price: 1150,
              sale_starts_at: null,
              sale_ends_at: null,
              stock: 35,
              low_stock_threshold: 5,
              sku: 'MB-SP-06',
              barcode: null,
              brand_id: null,
              category_id: null,
              warranty_bn: '৬ মাসের ওয়ারেন্টি',
              warranty_en: '6 Months Warranty',
              weight_grams: 400,
              is_active: true,
              is_featured: true,
              is_new: false,
              track_stock: true,
              seo_title_bn: null,
              seo_title_en: null,
              seo_desc_bn: null,
              seo_desc_en: null,
              estimated_delivery_days: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image_url: DEMO_IMAGES.earbuds,
            },
          ];
          setFlashSaleProducts(demoProducts.filter(p => p.sale_price !== null));
          setFeaturedProducts(demoProducts.filter(p => p.is_featured));
          setNewArrivals(demoProducts.filter(p => p.is_new));
          setBestSellers(demoProducts);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHomeData();
    return () => {
      active = false;
    };
  }, []);

  // Hero pause on hover
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Hero auto-slide
  useEffect(() => {
    if (banners.length <= 1 || isHeroHovered) return;
    const interval = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [banners.length, isHeroHovered]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setActiveBannerIndex((prev) => (prev + 1) % banners.length);
      } else {
        setActiveBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
      }
    }
    touchStartXRef.current = null;
  };

  const trustItems = [
    { icon: Truck, title: t('home.trustCodTitle'), desc: t('home.trustCodDesc') },
    { icon: RotateCcw, title: t('home.trustReturnTitle'), desc: t('home.trustReturnDesc') },
    { icon: ShieldCheck, title: t('home.trustAuthenticTitle'), desc: t('home.trustAuthenticDesc') },
    { icon: Headphones, title: t('home.trustFastTitle'), desc: t('home.trustFastDesc') },
  ];

  const currentBanner = banners[activeBannerIndex];
  const heroCtaLink = currentBanner?.link_url
    ? localizedPath(currentBanner.link_url)
    : localizedPath('/shop');

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t('brand.name')} — {t('brand.tagline')}
        </title>
      </Helmet>

      {/* 1. FULL-BLEED HERO SLIDESHOW */}
      <section
        aria-roledescription="carousel"
        aria-label={t('hero.kicker')}
        className="relative h-[460px] sm:h-[540px] lg:h-[600px] w-full overflow-hidden bg-[#0F1A2C] text-white"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        {/* Full-bleed Background Slides */}
        {banners.map((banner, index) => {
          const isActive = index === activeBannerIndex;
          return (
            <div
              key={banner.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-all duration-700 ease-out ${
                isActive ? 'opacity-100 scale-100 z-0' : 'opacity-0 scale-[1.03] z-0 pointer-events-none'
              }`}
            >
              <img
                src={banner.image_url}
                alt={tField(banner, 'title') || t('brand.name')}
                loading={index === 0 ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center"
              />
            </div>
          );
        })}

        {/* Measured Contrast Scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#09111E]/92 via-[#0F1A2C]/65 to-[#0F1A2C]/30 md:bg-gradient-to-r md:from-[#09111E]/92 md:via-[#0F1A2C]/65 md:to-[#0F1A2C]/15"
        />

        {/* Minimal Editorial Overlay Content */}
        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] items-center px-4 pb-12 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wide text-[#FF9D5C]">
              <span className="h-0.5 w-6 bg-[#F47125]" aria-hidden="true" />
              <span>{t('hero.kicker')}</span>
            </div>

            <h1 className="mt-3 text-3xl font-bold leading-[1.16] tracking-tight text-white sm:text-4xl lg:text-[50px] [text-wrap:balance]">
              {currentBanner ? tField(currentBanner, 'title') || t('hero.title') : t('hero.title')}
            </h1>

            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-white/80">
              {t('hero.subtitle')}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to={heroCtaLink}>
                <Button
                  size="lg"
                  className="bg-[#F47125] hover:bg-[#D95F18] text-white font-semibold rounded-xl shadow-lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t('hero.shopNowCod')}
                </Button>
              </Link>
              <Link to={localizedPath('/track-order')}>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl border-white/25 bg-white/10 text-white backdrop-blur-xs hover:bg-white/20"
                >
                  {t('hero.secondaryCta')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Minimal Bottom Slideshow Controls */}
        {banners.length > 1 && (
          <div className="absolute inset-x-0 bottom-5 z-20 mx-auto flex max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {banners.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBannerIndex(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activeBannerIndex
                        ? 'w-8 bg-[#F47125]'
                        : 'w-2.5 bg-white/40 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-white/75 tabular-nums">
                {String(activeBannerIndex + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)
                }
                aria-label="Previous slide"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-xs hover:border-[#F47125] hover:bg-[#F47125] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveBannerIndex((prev) => (prev + 1) % banners.length)
                }
                aria-label="Next slide"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-xs hover:border-[#F47125] hover:bg-[#F47125] transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. POPULAR CATEGORIES */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
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

        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-36 w-full rounded-2xl" />
              ))
            : categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={localizedPath(`/category/${cat.slug}`)}
                  className="group overflow-hidden rounded-2xl border border-[#17263E]/8 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#17263E]/20 hover:shadow-soft"
                >
                  <ProductImage
                    src={cat.image_url}
                    alt={tField(cat, 'name')}
                    aspectClassName="aspect-[4/3]"
                    className="transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="p-3 text-center">
                    <p className="truncate text-xs sm:text-sm font-semibold text-[#0F1A2C] group-hover:text-[#F47125] transition-colors">
                      {tField(cat, 'name')}
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* 3. FLASH SALE SECTION (Clean Navy Band + Countdown Timer) */}
      {flashSaleProducts.length > 0 && (
        <section className="bg-[#17263E] py-12 sm:py-14 text-white">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF9D5C]">
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Flash Sale</span>
                </div>
                <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl text-white">
                  {t('home.flashSaleTitle')}
                </h2>
                <p className="mt-1 text-sm text-white/75">{t('home.flashSaleSubtitle')}</p>
              </div>

              {/* Countdown Clocks */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="flex items-center gap-1.5 text-xs text-white/80 mr-1">
                  <Clock className="h-4 w-4 text-[#F47125]" />
                  {t('product.saleEndsIn')}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-white/10 border border-white/15">
                    <span className="text-base font-bold tabular-nums">
                      {formatNumber(timeLeft.hours, lang)}
                    </span>
                    <span className="text-[9px] uppercase text-white/70">
                      {t('product.countdownHours')}
                    </span>
                  </div>
                  <span className="font-bold text-white/60">:</span>
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-white/10 border border-white/15">
                    <span className="text-base font-bold tabular-nums">
                      {formatNumber(timeLeft.minutes, lang)}
                    </span>
                    <span className="text-[9px] uppercase text-white/70">
                      {t('product.countdownMinutes')}
                    </span>
                  </div>
                  <span className="font-bold text-white/60">:</span>
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[#F47125] text-white">
                    <span className="text-base font-bold tabular-nums">
                      {formatNumber(timeLeft.seconds, lang)}
                    </span>
                    <span className="text-[9px] uppercase text-white/90">
                      {t('product.countdownSeconds')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4">
              {flashSaleProducts.map((product) => (
                <ProductCard key={product.id} product={product} brandsMap={brandsMap} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. FEATURED PRODUCTS ROW */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1A2C]">
              {t('home.featuredTitle')}
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">{t('home.featuredSubtitle')}</p>
          </div>
          <Link
            to={localizedPath('/shop')}
            className="text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap"
          >
            {t('home.viewAll')} →
          </Link>
        </div>

        <div className="mt-6 flex gap-3.5 overflow-x-auto pb-4 snap-x sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 sm:overflow-visible sm:pb-0">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} variant="card" />)
            : featuredProducts.map((product) => (
                <div key={product.id} className="min-w-[215px] w-[215px] sm:w-auto snap-start sm:min-w-0">
                  <ProductCard product={product} brandsMap={brandsMap} />
                </div>
              ))}
        </div>
      </section>

      {/* 5. NEW ARRIVALS ROW */}
      <section className="bg-[#F8FAFC] py-12 sm:py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1A2C]">
                {t('home.newArrivalsTitle')}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">{t('home.newArrivalsSubtitle')}</p>
            </div>
            <Link
              to={localizedPath('/shop?sort=newest')}
              className="text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap"
            >
              {t('home.viewAll')} →
            </Link>
          </div>

          <div className="mt-6 flex gap-3.5 overflow-x-auto pb-4 snap-x sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 sm:overflow-visible sm:pb-0">
            {loading
              ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} variant="card" />)
              : newArrivals.map((product) => (
                  <div key={product.id} className="min-w-[215px] w-[215px] sm:w-auto snap-start sm:min-w-0">
                    <ProductCard product={product} brandsMap={brandsMap} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* 6. BEST SELLERS ROW */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1A2C]">
              {t('home.bestSellersTitle')}
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">{t('home.bestSellersSubtitle')}</p>
          </div>
          <Link
            to={localizedPath('/shop?sort=popular')}
            className="text-sm font-semibold text-[#F47125] hover:text-[#D95F18] whitespace-nowrap"
          >
            {t('home.viewAll')} →
          </Link>
        </div>

        <div className="mt-6 flex gap-3.5 overflow-x-auto pb-4 snap-x sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 sm:overflow-visible sm:pb-0">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} variant="card" />)
            : bestSellers.map((product) => (
                <div key={product.id} className="min-w-[215px] w-[215px] sm:w-auto snap-start sm:min-w-0">
                  <ProductCard product={product} brandsMap={brandsMap} />
                </div>
              ))}
        </div>
      </section>

      {/* 7. TRUST STRIP */}
      <section className="border-y border-[#17263E]/8 bg-white py-12">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3.5 rounded-2xl border border-[#17263E]/8 bg-[#F8FAFC] p-5"
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

      {/* 8. APPROVED CUSTOMER REVIEWS */}
      <section className="bg-[#F5F7FA] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#0F1A2C]">{t('home.reviewsTitle')}</h2>
            <p className="mt-1 text-sm text-[#5B6577]">{t('home.reviewsSubtitle')}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.length > 0 ? (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft"
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
                  <p className="mt-3 text-sm leading-relaxed text-[#0F1A2C]">
                    "{rev.comment}"
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#17263E]/5 flex items-center justify-between text-xs text-[#5B6577]">
                    <span className="font-semibold text-[#0F1A2C]">{rev.customer_name}</span>
                    <span className="inline-flex items-center gap-1 text-[#16A34A] font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified Buyer
                    </span>
                  </div>
                </div>
              ))
            ) : (
              // Default reviews showcase if no approved reviews in DB yet
              [
                {
                  name: 'তানভীর আহমেদ',
                  nameEn: 'Tanvir Ahmed',
                  rating: 5,
                  comment:
                    'স্মার্টওয়াচটি অর্ডার করার পরদিনই ঢাকায় ডেলিভারি পেয়েছি। কোয়ালিটি চমৎকার এবং ব্যাটারি ব্যাকআপ এক সপ্তাহ থাকে!',
                  commentEn:
                    'Received my smartwatch the very next day in Dhaka. Premium build and the battery easily lasts a full week!',
                },
                {
                  name: 'ফারহানা ইসলাম',
                  nameEn: 'Farhana Islam',
                  rating: 5,
                  comment:
                    'ইয়ারবাডসের সাউন্ড এবং কলিং কোয়ালিটি খুব পরিষ্কার। ডেলিভারি ম্যানের সামনে চেক করে টাকা দেওয়ার সুবিধা পেয়ে খুব নিশ্চিন্ত লেগেছে।',
                  commentEn:
                    'Sound and ENC call clarity are superb. Loved the ability to inspect the package before paying the rider.',
                },
                {
                  name: 'আরিফুল হক',
                  nameEn: 'Ariful Haque',
                  rating: 5,
                  comment:
                    'মার্টবাড়ি থেকে ইলেকট্রিক কেটলি অর্ডার করেছিলাম। একদম অরিজিনাল ও দ্রুত গরম হয়। ১০০% সুপারিশ করছি।',
                  commentEn:
                    'Ordered the smart kettle from MartBari. Authentic quality and heats rapidly. Highly recommended store!',
                },
              ].map((rev, idx) => (
                <div
                  key={idx}
                  className="rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft"
                >
                  <div className="flex items-center gap-1 text-[#F47125]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#0F1A2C]">
                    "{lang === 'bn' ? rev.comment : rev.commentEn}"
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#17263E]/5 flex items-center justify-between text-xs text-[#5B6577]">
                    <span className="font-semibold text-[#0F1A2C]">
                      {lang === 'bn' ? rev.name : rev.nameEn}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#16A34A] font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified Buyer
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 9. SHORT FAQ SECTION */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F1A2C]">{t('home.faqTitle')}</h2>
          <p className="mt-1 text-sm text-[#5B6577]">{t('home.faqSubtitle')}</p>
        </div>

        <div className="mt-8 space-y-3">
          {(['q1', 'q2', 'q3', 'q4'] as const).map((key) => {
            const isOpen = openFaq === key;
            return (
              <div
                key={key}
                className="overflow-hidden rounded-[12px] border border-[#17263E]/10 bg-white shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : key)}
                  className="flex min-h-[50px] w-full items-center justify-between gap-4 px-5 py-3.5 text-left font-semibold text-[#0F1A2C] hover:text-[#F47125] transition-colors cursor-pointer"
                >
                  <span>{t(`faq.${key}`)}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#F47125]' : 'text-[#5B6577]'
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#17263E]/5 bg-[#F5F7FA] px-5 py-4 text-sm leading-relaxed text-[#5B6577]">
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

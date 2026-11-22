import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Facebook,
  Heart,
  MessageCircle,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import type { ProductReviewStats, StorefrontProduct } from '../components/QuickViewModal';
import { Badge, Breadcrumb, Button, ErrorState, Input, Skeleton, Textarea } from '../components/ui';
import { isDemoProduct } from '../config/demoCatalog';
import { PRODUCT_DEMO_IMAGES_BY_SLUG } from '../config/demoImages';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { formatNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import type {
  Brand,
  Category,
  ProductImage as DbProductImage,
  PublicProduct,
  PublicProductVariant,
  Review,
} from '../types';

interface ProductWithMeta extends PublicProduct {
  images: string[];
  variants: PublicProductVariant[];
  brand?: Brand | null;
  category?: Category | null;
}

const RECENTLY_VIEWED_KEY = 'martbari_recently_viewed';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { lang, localizedPath, tField, formatPrice } = useLanguage();
  const navigate = useNavigate();

  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { settings } = useSettings();
  const showDemoData = settings.show_demo_data !== false;

  const [product, setProduct] = useState<ProductWithMeta | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Tabs: 'desc' | 'specs' | 'delivery' | 'reviews'
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'delivery' | 'reviews'>('desc');

  // Related & Recently viewed products
  const [relatedProducts, setRelatedProducts] = useState<StorefrontProduct[]>([]);
  const [recentProducts, setRecentProducts] = useState<StorefrontProduct[]>([]);
  const [extraReviewStats, setExtraReviewStats] = useState<Map<string, ProductReviewStats>>(new Map());

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Desktop Hover Zoom state
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Sale countdown state
  const [saleSecondsLeft, setSaleSecondsLeft] = useState(12 * 3600 + 44 * 60 + 19);

  useEffect(() => {
    const timer = setInterval(() => {
      setSaleSecondsLeft((prev) => (prev > 0 ? prev - 1 : 24 * 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch product by slug
  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!slug || !supabase) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);
      setSelectedVariantId(null);
      setQuantity(1);
      setActiveImageIndex(0);

      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('public_products')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (prodErr || !prodData) {
          if (active) setError(true);
          return;
        }

        const currentProd = prodData as PublicProduct;
        if (!showDemoData && isDemoProduct(currentProd)) {
          if (active) setError(true);
          return;
        }

        // Fetch variants, images, brand, category, reviews in parallel
        const [
          { data: variantsData },
          { data: imagesData },
          { data: brandData },
          { data: categoryData },
          { data: reviewsData },
        ] = await Promise.all([
          supabase
            .from('public_product_variants')
            .select('*')
            .eq('product_id', currentProd.id)
            .eq('is_active', true),
          supabase
            .from('product_images')
            .select('*')
            .eq('product_id', currentProd.id)
            .order('sort_order', { ascending: true }),
          currentProd.brand_id
            ? supabase.from('brands').select('*').eq('id', currentProd.brand_id).maybeSingle()
            : Promise.resolve({ data: null }),
          currentProd.category_id
            ? supabase.from('categories').select('*').eq('id', currentProd.category_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('reviews')
            .select('*')
            .eq('product_id', currentProd.id)
            .eq('is_approved', true)
            .order('created_at', { ascending: false }),
        ]);

        if (!active) return;

        const dbImgList = (imagesData as DbProductImage[] | null)
          ?.map((i) => i.image_url)
          .filter((url) => url.startsWith('http://') || url.startsWith('https://')) ?? [];
        const fallbackImgs = showDemoData ? PRODUCT_DEMO_IMAGES_BY_SLUG[currentProd.slug] ?? [] : [];
        const imgList = dbImgList.length > 0 ? dbImgList : fallbackImgs;
        const variantList = (variantsData as PublicProductVariant[] | null) ?? [];

        const populated: ProductWithMeta = {
          ...currentProd,
          images: imgList,
          variants: variantList,
          brand: (brandData?.data as Brand | null) ?? null,
          category: (categoryData?.data as Category | null) ?? null,
        };

        setProduct(populated);
        if (reviewsData) setReviews(reviewsData as Review[]);

        // Auto-select first variant if available
        if (variantList.length > 0) {
          setSelectedVariantId(variantList[0].id);
        }

        // Save to Recently Viewed in localStorage
        try {
          const stored = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
          let slugs: string[] = stored ? JSON.parse(stored) : [];
          slugs = [currentProd.slug, ...slugs.filter((s) => s !== currentProd.slug)].slice(0, 8);
          window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(slugs));
        } catch {
          // Ignore
        }

        const hydrateExtraProducts = async (rows: PublicProduct[]): Promise<StorefrontProduct[]> => {
          if (rows.length === 0 || !supabase) return [];
          const ids = rows.map((r) => r.id);
          const [{ data: extraImgs }, { data: extraRevs }] = await Promise.all([
            supabase
              .from('product_images')
              .select('product_id, image_url, sort_order')
              .in('product_id', ids)
              .order('sort_order', { ascending: true }),
            supabase
              .from('reviews')
              .select('product_id, rating')
              .in('product_id', ids)
              .eq('is_approved', true),
          ]);

          const imgMap = new Map<string, string[]>();
          (extraImgs as DbProductImage[] | null)?.forEach((img) => {
            if (img.image_url.startsWith('http://') || img.image_url.startsWith('https://')) {
              const list = imgMap.get(img.product_id) ?? [];
              list.push(img.image_url);
              imgMap.set(img.product_id, list);
            }
          });

          const rawStats = new Map<string, { sum: number; count: number }>();
          (extraRevs as Array<{ product_id: string; rating: number }> | null)?.forEach((r) => {
            const prev = rawStats.get(r.product_id) ?? { sum: 0, count: 0 };
            rawStats.set(r.product_id, {
              sum: prev.sum + Number(r.rating || 5),
              count: prev.count + 1,
            });
          });
          setExtraReviewStats((prev) => {
            const merged = new Map(prev);
            rawStats.forEach((v, k) => {
              merged.set(k, { avg: Number((v.sum / v.count).toFixed(1)), count: v.count });
            });
            return merged;
          });

          const filteredRows = rows.filter((r) => showDemoData || !isDemoProduct(r));
          return filteredRows.map((r) => {
            const dbUrls = imgMap.get(r.id) ?? [];
            const fallbackUrls = showDemoData ? PRODUCT_DEMO_IMAGES_BY_SLUG[r.slug] ?? [] : [];
            const combined = dbUrls.length > 0 ? dbUrls : fallbackUrls;
            return {
              ...r,
              image_url: combined[0] ?? null,
              image_urls: combined,
            };
          });
        };

        // Fetch related products (same category)
        if (currentProd.category_id) {
          const { data: related } = await supabase
            .from('public_products')
            .select('*')
            .eq('category_id', currentProd.category_id)
            .neq('id', currentProd.id)
            .limit(5);
          if (active && related) {
            const hydrated = await hydrateExtraProducts(related as PublicProduct[]);
            if (active) setRelatedProducts(hydrated);
          }
        }

        // Fetch other recently viewed products from database
        try {
          const stored = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
          if (stored) {
            const slugs: string[] = JSON.parse(stored);
            const otherSlugs = slugs.filter((s) => s !== currentProd.slug).slice(0, 5);
            if (otherSlugs.length > 0) {
              const { data: recents } = await supabase
                .from('public_products')
                .select('*')
                .in('slug', otherSlugs);
              if (active && recents) {
                const hydrated = await hydrateExtraProducts(recents as PublicProduct[]);
                if (active) setRecentProducts(hydrated);
              }
            }
          }
        } catch {
          // Ignore
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProduct();
    return () => {
      active = false;
    };
  }, [slug, showDemoData]);

  // Active Variant calculations
  const selectedVariant = useMemo(() => {
    if (!product || !selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const hasSale = useMemo(() => {
    if (!product) return false;
    return (
      product.sale_price !== null &&
      product.sale_price > 0 &&
      product.sale_price < product.price
    );
  }, [product]);

  const activePrice = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant && selectedVariant.price_override !== null) {
      return selectedVariant.price_override;
    }
    return hasSale ? product.sale_price! : product.price;
  }, [product, selectedVariant, hasSale]);

  const availableStock = useMemo(() => {
    if (!product || !product.track_stock) return 999;
    if (selectedVariant) {
      return selectedVariant.stock;
    }
    return product.stock;
  }, [product, selectedVariant]);

  const isLowStock = availableStock > 0 && availableStock <= (product?.low_stock_threshold ?? 5);
  const isOutOfStock = availableStock <= 0;

  // Primary active image
  const displayImage = useMemo(() => {
    if (selectedVariant?.image_url) return selectedVariant.image_url;
    if (product?.images && product.images.length > 0) {
      return product.images[activeImageIndex] ?? product.images[0];
    }
    return null;
  }, [selectedVariant, product, activeImageIndex]);

  // Add to cart & Buy now
  const handleAddToCart = (redirectCheckout = false) => {
    if (!product || isOutOfStock) return;

    addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        slug: product.slug,
        nameBn: product.name_bn,
        nameEn: product.name_en,
        variantNameBn: selectedVariant?.name_bn ?? null,
        variantNameEn: selectedVariant?.name_en ?? null,
        price: Number(activePrice),
        imageUrl: displayImage,
      },
      quantity,
      !redirectCheckout, // don't open drawer if redirecting to checkout
    );

    if (redirectCheckout) {
      navigate(localizedPath('/checkout'));
    } else {
      showToast({
        type: 'success',
        title: t('product.addedToCart'),
        description: `${tField(product, 'name')} (${formatNumber(quantity, lang)}x)`,
      });
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !supabase || !reviewName.trim() || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const { error: insErr } = await supabase.from('reviews').insert({
        product_id: product.id,
        customer_name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
        is_approved: false, // Default false, per security requirements
      });

      if (!insErr) {
        showToast({
          type: 'success',
          title: t('product.submitReview'),
          description: t('product.reviewPendingNote'),
        });
        setReviewName('');
        setReviewComment('');
        setReviewRating(5);
      } else {
        showToast({
          type: 'error',
          title: t('common.errorTitle'),
          description: t('common.errorDesc'),
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: t('common.errorTitle'),
        description: t('common.errorDesc'),
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Desktop Hover Zoom Math
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  // Share handlers
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(window.location.href);
      showToast({
        type: 'info',
        title: t('product.shareProduct'),
        description: t('product.copiedLink'),
      });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-[12px]" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <ErrorState
          title={t('common.errorTitle')}
          description={t('shop.noProductsFound')}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const hoursLeft = Math.floor(saleSecondsLeft / 3600);
  const minutesLeft = Math.floor((saleSecondsLeft % 3600) / 60);
  const secondsLeft = saleSecondsLeft % 60;

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {tField(product, 'name')} — {t('brand.name')}
        </title>
        <meta
          name="description"
          content={tField(product, 'short_desc') || tField(product, 'name')}
        />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: localizedPath('/') },
            { label: t('nav.shop'), to: localizedPath('/shop') },
            ...(product.category
              ? [
                  {
                    label: tField(product.category, 'name'),
                    to: localizedPath(`/category/${product.category.slug}`),
                  },
                ]
              : []),
            { label: tField(product, 'name') },
          ]}
        />

        {/* Product Details Section */}
        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          {/* Left Column: Image Gallery (Thumbnails, Desktop Zoom) */}
          <div className="lg:col-span-6 space-y-4">
            <div
              ref={imageContainerRef}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
              className="relative aspect-square w-full overflow-hidden rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] shadow-soft cursor-crosshair"
            >
              <ProductImage
                src={displayImage}
                alt={tField(product, 'name')}
                aspectClassName="aspect-square"
                width={800}
                height={800}
                eager
                categoryKey={product.category?.slug || product.slug}
                className="h-full w-full object-cover"
              />

              {/* Hover Zoom Overlay (Desktop) */}
              {isZooming && displayImage && (
                <div
                  className="pointer-events-none absolute inset-0 hidden lg:block"
                  style={{
                    backgroundImage: `url(${displayImage})`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundSize: '220%',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )}

              {/* Wishlist Heart on top-right */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Wishlist"
                className={`absolute right-3.5 top-3.5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border shadow-sm transition-colors cursor-pointer ${
                  isWishlisted
                    ? 'border-[#DC2626] bg-[#DC2626] text-white'
                    : 'border-white/80 bg-white/90 text-[#5B6577] hover:text-[#DC2626]'
                }`}
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Thumbnails list */}
            {product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-[#F47125] ring-2 ring-[#F47125]/20'
                        : 'border-[#17263E]/10 hover:border-[#17263E]/30'
                    }`}
                  >
                    <ProductImage
                      src={img}
                      alt={`${tField(product, 'name')} - ${idx + 1}`}
                      aspectClassName="aspect-square"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <div>
              {product.brand && (
                <p className="text-xs font-bold uppercase tracking-wider text-[#F47125]">
                  {product.brand.name}
                </p>
              )}
              <h1 className="mt-1 text-2xl font-bold text-[#0F1A2C] sm:text-3xl">
                {tField(product, 'name')}
              </h1>

              {/* SKU & Stock alert */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[#5B6577]">
                <span>
                  {t('product.sku')}: <strong className="font-mono text-[#0F1A2C]">{product.sku}</strong>
                </span>
                <span>•</span>
                {isOutOfStock ? (
                  <span className="font-semibold text-[#DC2626]">{t('product.outOfStock')}</span>
                ) : isLowStock ? (
                  <span className="font-bold text-[#D95F18]">
                    {t('product.onlyLeft', { count: formatNumber(availableStock, lang) })}
                  </span>
                ) : (
                  <span className="font-medium text-[#16A34A]">{t('product.inStock')}</span>
                )}
                {reviews.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1 text-[#F47125]">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="font-bold text-[#0F1A2C] tabular-nums">
                        {(
                          reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) /
                          reviews.length
                        ).toFixed(1)}
                      </span>
                      <span className="text-[#5B6577] tabular-nums">
                        ({formatNumber(reviews.length, lang)})
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Price Box with Countdown if On Sale */}
            <div className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#F47125] tabular-nums">
                  {formatPrice(Number(activePrice))}
                </span>
                {hasSale && (
                  <span className="text-base text-[#5B6577] line-through tabular-nums">
                    {formatPrice(Number(product.price))}
                  </span>
                )}
                {hasSale && (
                  <Badge variant="accent">
                    {Math.round(((product.price - product.sale_price!) / product.price) * 100)}% {t('product.off')}
                  </Badge>
                )}
              </div>

              {hasSale && (
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#D95F18] border-t border-[#17263E]/5 pt-2.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {t('product.saleEndsIn')}{' '}
                    <span className="font-mono tabular-nums text-[#0F1A2C]">
                      {String(hoursLeft).padStart(2, '0')}:{String(minutesLeft).padStart(2, '0')}:
                      {String(secondsLeft).padStart(2, '0')}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Short Description */}
            {product.short_desc_en && (
              <p className="text-sm leading-relaxed text-[#5B6577]">
                {tField(product, 'short_desc')}
              </p>
            )}

            {/* Variant Selector (if available) */}
            {product.variants.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1A2C] mb-2.5">
                  {t('product.selectVariant')}
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    const vStock = v.stock > 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!vStock}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`min-h-[44px] rounded-[10px] border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#F47125] bg-[#F47125] text-white shadow-sm'
                            : vStock
                            ? 'border-[#17263E]/15 bg-white text-[#0F1A2C] hover:bg-[#F5F7FA]'
                            : 'border-[#17263E]/10 bg-[#E5E9F0] text-[#5B6577] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {tField(v, 'name')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F1A2C]">
                {t('product.quantity')}:
              </span>
              <div className="inline-flex items-center rounded-[10px] border border-[#17263E]/15 bg-white">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="inline-flex h-11 w-11 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[36px] text-center text-sm font-bold text-[#0F1A2C] tabular-nums">
                  {formatNumber(quantity, lang)}
                </span>
                <button
                  type="button"
                  disabled={quantity >= availableStock || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  className="inline-flex h-11 w-11 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Purchase CTA Buttons (Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                size="lg"
                variant="outline"
                disabled={isOutOfStock}
                onClick={() => handleAddToCart(false)}
                leftIcon={<ShoppingBag className="h-5 w-5" />}
              >
                {t('product.addToCart')}
              </Button>
              <Button
                size="lg"
                variant="primary"
                disabled={isOutOfStock}
                onClick={() => handleAddToCart(true)}
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                {t('product.buyNow')}
              </Button>
            </div>

            {/* Delivery & Warranty Trust Box */}
            <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-4 space-y-3 text-xs text-[#5B6577]">
              <div className="flex items-center gap-2.5 text-[#0F1A2C]">
                <Truck className="h-4 w-4 text-[#F47125] shrink-0" />
                <span className="font-semibold">{t('product.codAvailable')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-[#17263E] shrink-0" />
                <span>
                  {t('product.deliveryEstimate', {
                    days: formatNumber(product.estimated_delivery_days || 3, lang),
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
                <span>
                  {t('product.warranty')}: <strong>{tField(product, 'warranty') || 'Official Warranty'}</strong>
                </span>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center gap-3 pt-2 text-xs text-[#5B6577]">
              <span className="font-semibold">{t('product.shareProduct')}:</span>
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label="Copy Link"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#17263E]/15 hover:bg-[#F5F7FA] cursor-pointer"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `${tField(product, 'name')} - ${window.location.href}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on WhatsApp"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#17263E]/15 text-[#16A34A] hover:bg-[#16A34A]/10"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  window.location.href,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Facebook"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#17263E]/15 text-[#1877F2] hover:bg-[#1877F2]/10"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Product Information Tabs */}
        <div className="mt-14">
          <div className="flex border-b border-[#17263E]/10 overflow-x-auto">
            {(
              [
                { id: 'desc', label: t('product.tabDescription') },
                { id: 'specs', label: t('product.tabSpecs') },
                { id: 'delivery', label: t('product.tabDelivery') },
                { id: 'reviews', label: t('product.tabReviews', { count: reviews.length }) },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-6 text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-[#F47125] text-[#F47125]'
                    : 'border-transparent text-[#5B6577] hover:text-[#0F1A2C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-6">
            {activeTab === 'desc' && (
              <div className="prose max-w-none text-base leading-relaxed text-[#5B6577] whitespace-pre-line">
                {tField(product, 'description') || tField(product, 'short_desc')}
              </div>
            )}

            {activeTab === 'specs' && (
              <div>
                {Array.isArray(product.specifications) && product.specifications.length > 0 ? (
                  <div className="overflow-hidden rounded-[12px] border border-[#17263E]/10 max-w-2xl">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-[#17263E]/10">
                        {product.specifications.map((spec, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F7FA]'}>
                            <th className="w-1/3 px-4 py-3 font-semibold text-[#0F1A2C]">
                              {lang === 'bn' ? spec.key_bn : spec.key_en}
                            </th>
                            <td className="px-4 py-3 text-[#5B6577]">
                              {lang === 'bn' ? spec.value_bn : spec.value_en}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-[#5B6577]">{t('product.noSpecs')}</p>
                )}
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-6 text-sm leading-relaxed text-[#0F1A2C] whitespace-pre-line">
                {t('product.deliveryTabContent')}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* List of approved reviews */}
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-[12px] border border-[#17263E]/10 bg-white p-4 shadow-soft"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[#0F1A2C]">
                            {rev.customer_name}
                          </span>
                          <div className="flex items-center text-[#F47125]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < rev.rating ? 'fill-current' : 'text-[#E5E9F0]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-[#5B6577]">{rev.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#5B6577]">{t('home.noReviewsYet')}</p>
                  )}
                </div>

                {/* Write Review Form */}
                <form
                  onSubmit={handleSubmitReview}
                  className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-6 max-w-xl space-y-4"
                >
                  <h3 className="text-base font-bold text-[#0F1A2C]">
                    {t('product.writeReview')}
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F1A2C] mb-1.5">
                      {t('product.yourRating')}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 text-[#F47125] cursor-pointer"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= reviewRating ? 'fill-current' : 'text-[#D1D5DB]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label={t('product.yourName')}
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                  />

                  <Textarea
                    label={t('product.yourComment')}
                    required
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell us what you liked about this product..."
                  />

                  <Button type="submit" loading={submittingReview}>
                    {t('product.submitReview')}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Row */}
        {relatedProducts.length > 0 && (
          <div className="mt-14 border-t border-[#17263E]/10 pt-10">
            <h2 className="text-2xl font-bold text-[#0F1A2C]">{t('product.relatedTitle')}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  reviewStats={extraReviewStats.get(p.id) ?? null}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed Products Row */}
        {recentProducts.length > 0 && (
          <div className="mt-14 border-t border-[#17263E]/10 pt-10">
            <h2 className="text-2xl font-bold text-[#0F1A2C]">
              {t('product.recentlyViewedTitle')}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {recentProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  reviewStats={extraReviewStats.get(p.id) ?? null}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Bottom Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#17263E]/10 bg-white p-3 shadow-card lg:hidden flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-[#5B6577]">{t('cart.price')}</span>
          <span className="text-lg font-bold text-[#F47125] tabular-nums">
            {formatPrice(Number(activePrice))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isOutOfStock}
            onClick={() => handleAddToCart(false)}
          >
            {t('product.addToCart')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={isOutOfStock}
            onClick={() => handleAddToCart(true)}
          >
            {t('product.buyNow')}
          </Button>
        </div>
      </div>
    </>
  );
};

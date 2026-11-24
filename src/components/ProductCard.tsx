import React, { useState } from 'react';
import { Eye, Heart, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { cn } from '../lib/utils';
import type { Brand } from '../types';
import { ProductImage } from './ProductImage';
import {
  type ProductReviewStats,
  QuickViewModal,
  type StorefrontProduct,
} from './QuickViewModal';

export interface ProductCardProps {
  product: StorefrontProduct;
  brandsMap?: Map<string, Brand>;
  reviewStats?: ProductReviewStats | null;
  className?: string;
  eagerImage?: boolean;
  showFlashProgress?: boolean;
  compactOnMobile?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({
    product,
    brandsMap,
    reviewStats,
    className,
    eagerImage = false,
    showFlashProgress = false,
    compactOnMobile = false,
  }) => {
    const { t } = useTranslation();
    const { lang, localizedPath, tField, formatPrice } = useLanguage();
    const { items, addItem, updateQuantity } = useCart();
    const { showToast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const isWishlisted = isInWishlist(product.id);

  const hasSale =
    product.sale_price !== null &&
    product.sale_price > 0 &&
    product.sale_price < product.price;

  const currentPrice = hasSale ? product.sale_price! : product.price;
  const inStock = !product.track_stock || product.stock > 0;
  const isLowStock =
    product.track_stock &&
    product.stock > 0 &&
    product.stock <= (product.low_stock_threshold ?? 5);

  const discountPercent = hasSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  const brandName =
    product.brand_name ||
    (product.brand_id && brandsMap?.get(product.brand_id)?.name) ||
    null;

  const primaryImage = product.image_urls?.[0] ?? product.image_url ?? null;
  const secondaryImage = product.image_urls?.[1] ?? null;

  const cartItem = items.find(
    (item) => item.productId === product.id && (item.variantId ?? null) === null,
  );
  const cartQty = cartItem?.quantity ?? 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;

    addItem(
      {
        productId: product.id,
        slug: product.slug,
        nameBn: product.name_bn,
        nameEn: product.name_en,
        price: Number(currentPrice),
        imageUrl: primaryImage,
      },
      1,
      false,
    );

    showToast({
      type: 'success',
      title: t('product.addedToCart'),
      description: tField(product, 'name'),
    });
  };

  const handleStepQuantity = (e: React.MouseEvent, nextQty: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.track_stock && nextQty > product.stock) return;
    updateQuantity(product.id, null, nextQty);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleOpenQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const singleBadge = !inStock
    ? { label: t('product.outOfStock'), style: 'bg-[#DC2626] text-white' }
    : hasSale
    ? { label: `-${formatNumber(discountPercent, lang)}%`, style: 'bg-[#F47125] text-white' }
    : product.is_new
    ? { label: t('home.newBadge'), style: 'bg-[#17263E] text-white' }
    : product.is_featured
    ? { label: t('home.hotBadge'), style: 'bg-[#0F1A2C] text-white' }
    : null;

  const flashTotalPool = Math.max(product.stock + 12, 24);
  const flashSoldCount = Math.max(4, flashTotalPool - product.stock);
  const flashSoldPercent = Math.min(
    92,
    Math.max(18, Math.round((flashSoldCount / flashTotalPool) * 100)),
  );

  return (
    <>
      <article
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#17263E]/8 bg-white transition-all duration-150 hover:-translate-y-0.5 hover:border-[#17263E]/16 hover:shadow-[0_14px_30px_-14px_rgba(15,26,44,0.14)]',
          className,
        )}
      >
        {/* Minimalist Square Media Area */}
        <div
          className={cn(
            'relative overflow-hidden pb-0',
            compactOnMobile ? 'p-2 sm:p-2.5' : 'p-2.5',
          )}
        >
          <div className="relative overflow-hidden rounded-xl bg-[#F7F8FA]">
            {singleBadge && (
              <div className="pointer-events-none absolute left-2 top-2 z-10">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold leading-[1.4] tabular-nums shadow-2xs',
                    singleBadge.style,
                  )}
                >
                  {singleBadge.label}
                </span>
              </div>
            )}

            {/* Top-right Actions: 44px touch hitbox on mobile with sleek compact visual footprint */}
            <div className="absolute right-0.5 top-0.5 z-10 flex flex-col items-center">
              <button
                type="button"
                onClick={handleToggleWishlist}
                aria-label={t('nav.wishlist')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47125]"
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-colors duration-150',
                    isWishlisted
                      ? 'bg-[#DC2626] text-white shadow-sm'
                      : 'bg-white/92 text-[#475569] shadow-xs hover:bg-white hover:text-[#DC2626]',
                  )}
                >
                  <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenQuickView}
                aria-label={t('product.quickView')}
                title={t('product.quickView')}
                className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#17263E] shadow-xs transition-all duration-150 hover:bg-[#17263E] hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47125] cursor-pointer"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>

            <Link
              to={localizedPath(`/product/${product.slug}`)}
              className="block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47125]"
            >
              <ProductImage
                src={primaryImage}
                hoverSrc={secondaryImage}
                alt={tField(product, 'name')}
                aspectClassName="aspect-square"
                width={800}
                height={800}
                eager={eagerImage}
                categoryKey={product.category_slug || product.slug}
                className="transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </Link>
          </div>
        </div>

        {/* Refined Minimal Body */}
        <div
          className={cn(
            'flex flex-1 flex-col',
            compactOnMobile ? 'p-2.5 sm:p-3.5 md:p-4' : 'p-3 sm:p-3.5 md:p-4',
          )}
        >
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
            {brandName ?? t('brand.name')}
          </p>

          <Link
            to={localizedPath(`/product/${product.slug}`)}
            className={cn(
              'mt-1 font-semibold leading-[1.48] text-[#0F1A2C] hover:text-[#F47125] line-clamp-2 transition-colors',
              compactOnMobile
                ? 'text-[13px] sm:text-[15px] min-h-[2.45rem] sm:min-h-[2.85rem]'
                : 'text-[13.5px] sm:text-[15px] min-h-[2.55rem] sm:min-h-[2.85rem]',
            )}
          >
            {tField(product, 'name')}
          </Link>

          {/* Rating & Stock Hint */}
          <div className="mt-1.5 flex min-h-[18px] flex-wrap items-center justify-between gap-1 text-[11px]">
            {reviewStats && reviewStats.count > 0 ? (
              <div className="inline-flex items-center gap-1 text-[#F47125]">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-semibold text-[#0F1A2C] tabular-nums">
                  {reviewStats.avg.toFixed(1)}
                </span>
                <span className="text-[#64748B] tabular-nums">
                  ({formatNumber(reviewStats.count, lang)})
                </span>
              </div>
            ) : (
              <span className="text-[#64748B]">
                {inStock ? t('product.inStock') : t('product.outOfStock')}
              </span>
            )}

            {isLowStock && (
              <span className="font-semibold text-[#D95F18]">
                {t('product.onlyShort', { count: formatNumber(product.stock, lang) })}
              </span>
            )}
          </div>

          {showFlashProgress && inStock && (
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F47125]/15">
                <div
                  className="h-full rounded-full bg-[#F47125] transition-all duration-500"
                  style={{ width: `${flashSoldPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] font-medium text-[#64748B] tabular-nums">
                {t('home.soldProgress', {
                  sold: formatNumber(flashSoldCount, lang),
                  left: formatNumber(product.stock, lang),
                })}
              </p>
            </div>
          )}

          {/* Price + Restrained Minimal Action */}
          <div className="mt-auto pt-2.5 sm:pt-3 flex flex-col gap-2 sm:gap-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  'font-bold tabular-nums',
                  compactOnMobile ? 'text-[15px] sm:text-[17px]' : 'text-base sm:text-[17px]',
                  hasSale ? 'text-[#F47125]' : 'text-[#0F1A2C]',
                )}
              >
                {formatPrice(Number(currentPrice))}
              </span>
              {hasSale && (
                <span className="text-[11px] sm:text-xs text-[#94A3B8] line-through tabular-nums">
                  {formatPrice(Number(product.price))}
                </span>
              )}
            </div>

            {cartQty > 0 ? (
              <div className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-[#F47125] bg-[#FFF6F0] px-1">
                <button
                  type="button"
                  onClick={(e) => handleStepQuantity(e, cartQty - 1)}
                  aria-label="Decrease quantity"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#D95F18] hover:bg-[#F47125]/15 cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xs sm:text-sm font-bold text-[#0F1A2C] tabular-nums">
                  {formatNumber(cartQty, lang)}
                </span>
                <button
                  type="button"
                  disabled={product.track_stock && cartQty >= product.stock}
                  onClick={(e) => handleStepQuantity(e, cartQty + 1)}
                  aria-label="Increase quantity"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#D95F18] hover:bg-[#F47125]/15 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!inStock}
                onClick={handleAddToCart}
                aria-label={t('product.addToCart')}
                className={cn(
                  'inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold leading-[1.4] transition-all duration-100 active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F47125]',
                  !inStock
                    ? 'border-transparent bg-[#E5E9F0] text-[#64748B] cursor-not-allowed active:scale-100'
                    : 'border-[#17263E]/12 bg-[#F8FAFC] text-[#0F1A2C] hover:border-[#17263E] hover:bg-[#17263E] hover:text-white',
                )}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                {compactOnMobile ? (
                  <>
                    <span className="truncate sm:hidden">
                      {!inStock ? t('product.outOfStock') : t('product.addShort')}
                    </span>
                    <span className="hidden truncate sm:inline">
                      {!inStock ? t('product.outOfStock') : t('product.addToCart')}
                    </span>
                  </>
                ) : (
                  <span className="truncate">
                    {!inStock ? t('product.outOfStock') : t('product.addToCart')}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </article>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        brandName={brandName}
        reviewStats={reviewStats}
      />
    </>
  );
  },
);

ProductCard.displayName = 'ProductCard';

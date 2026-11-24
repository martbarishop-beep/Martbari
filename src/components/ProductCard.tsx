import React, { Suspense, lazy, useState } from 'react';
import { Heart, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { theme } from '../config/theme';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { cn } from '../lib/utils';
import type { Brand } from '../types';
import { ProductImage } from './ProductImage';
import type { ProductReviewStats, StorefrontProduct } from './QuickViewModal';

const LazyQuickViewModal = lazy(() =>
  import('./QuickViewModal').then((m) => ({ default: m.QuickViewModal })),
);

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

    return (
      <>
        <article
          style={{ borderRadius: theme.radii.card }}
          className={cn(
            'group desktop-card-lift relative flex h-full min-w-0 flex-col border border-[#17263E]/10 bg-white p-3 sm:p-4',
            className,
          )}
        >
          {/* Square Image Frame */}
          <div className="relative overflow-hidden rounded-[12px] bg-[#F5F7FA]">
            {!inStock ? (
              <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-[8px] bg-[#DC2626] px-2 py-0.5 text-[11px] font-bold text-white">
                {t('product.outOfStock')}
              </span>
            ) : hasSale && discountPercent > 0 ? (
              <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-[8px] bg-[#F47125] px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                -{formatNumber(discountPercent, lang)}%
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleToggleWishlist}
              aria-label={t('nav.wishlist')}
              className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#17263E]/10 text-[#5B6577] transition-colors hover:text-[#DC2626] cursor-pointer"
            >
              <Heart
                className={cn('h-4 w-4', isWishlisted && 'fill-[#DC2626] text-[#DC2626]')}
                aria-hidden="true"
              />
            </button>

            <Link
              to={localizedPath(`/product/${product.slug}`)}
              className="block overflow-hidden"
            >
              <ProductImage
                src={primaryImage}
                hoverSrc={secondaryImage}
                alt={tField(product, 'name')}
                aspectClassName="aspect-square"
                width={480}
                height={480}
                eager={eagerImage}
                categoryKey={product.category_slug || product.slug}
                className="desktop-hover-scale transition-transform duration-200"
              />
            </Link>
          </div>

          {/* Card Details */}
          <div className="mt-3 flex flex-1 flex-col min-w-0">
            <p className="truncate text-[11px] font-medium text-[#5B6577]">
              {brandName ?? t('brand.name')}
            </p>

            <Link
              to={localizedPath(`/product/${product.slug}`)}
              className="mt-1 min-h-[2.6rem] text-[13.5px] sm:text-[15px] font-semibold leading-[1.38] text-[#0F1A2C] hover:text-[#F47125] line-clamp-2 transition-colors"
            >
              {tField(product, 'name')}
            </Link>

            {/* Rating */}
            <div className="mt-1.5 flex items-center gap-1 text-xs text-[#5B6577]">
              {reviewStats && reviewStats.count > 0 ? (
                <>
                  <Star className="h-3.5 w-3.5 fill-[#F47125] text-[#F47125]" aria-hidden="true" />
                  <span className="font-semibold text-[#0F1A2C] tabular-nums">
                    {reviewStats.avg.toFixed(1)}
                  </span>
                  <span className="tabular-nums">
                    ({formatNumber(reviewStats.count, lang)})
                  </span>
                </>
              ) : (
                <span>{inStock ? t('product.inStock') : t('product.outOfStock')}</span>
              )}
            </div>

            {/* Price & Add to Cart */}
            <div className="mt-auto pt-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    'text-base sm:text-lg font-bold tabular-nums',
                    hasSale ? 'text-[#F47125]' : 'text-[#0F1A2C]',
                  )}
                >
                  {formatPrice(Number(currentPrice))}
                </span>
                {hasSale && (
                  <span className="text-xs text-[#94A3B8] line-through tabular-nums">
                    {formatPrice(Number(product.price))}
                  </span>
                )}
              </div>

              {cartQty > 0 ? (
                <div className="flex min-h-[42px] w-full items-center justify-between rounded-[12px] border border-[#F47125] bg-[#FFF4EC] px-1">
                  <button
                    type="button"
                    onClick={(e) => handleStepQuantity(e, cartQty - 1)}
                    aria-label="Decrease quantity"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[#D95F18] hover:bg-[#F47125]/15 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-bold text-[#0F1A2C] tabular-nums">
                    {formatNumber(cartQty, lang)}
                  </span>
                  <button
                    type="button"
                    disabled={product.track_stock && cartQty >= product.stock}
                    onClick={(e) => handleStepQuantity(e, cartQty + 1)}
                    aria-label="Increase quantity"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[#D95F18] hover:bg-[#F47125]/15 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={handleAddToCart}
                  className={cn(
                    'inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[12px] border px-3 text-xs sm:text-sm font-semibold transition-colors duration-150 cursor-pointer',
                    !inStock
                      ? 'border-transparent bg-[#E5E9F0] text-[#5B6577] cursor-not-allowed'
                      : 'border-[#17263E] bg-white text-[#17263E] hover:bg-[#17263E] hover:text-white',
                  )}
                >
                  <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {!inStock ? t('product.outOfStock') : t('product.addToCart')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </article>

        {isQuickViewOpen && (
          <Suspense fallback={null}>
            <LazyQuickViewModal
              product={product}
              isOpen={isQuickViewOpen}
              onClose={() => setIsQuickViewOpen(false)}
              brandName={brandName}
              reviewStats={reviewStats}
            />
          </Suspense>
        )}
      </>
    );
  },
);

ProductCard.displayName = 'ProductCard';

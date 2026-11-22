import React, { useState } from 'react';
import { Check, Heart, Plus, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../lib/utils';
import type { Brand, PublicProduct } from '../types';
import { ProductImage } from './ProductImage';

export interface ProductCardProps {
  product: PublicProduct & {
    image_url?: string | null;
    brand_name?: string | null;
  };
  brandsMap?: Map<string, Brand>;
  className?: string;
  eagerImage?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  brandsMap,
  className,
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField, formatPrice } = useLanguage();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [justAdded, setJustAdded] = useState(false);

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

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;

    addItem({
      productId: product.id,
      slug: product.slug,
      nameBn: product.name_bn,
      nameEn: product.name_en,
      price: Number(currentPrice),
      imageUrl: product.image_url ?? null,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);

    showToast({
      type: 'success',
      title: t('product.addedToCart'),
      description: tField(product, 'name'),
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  // Single minimal status tag (max 1 tag)
  const tagInfo = !inStock
    ? { label: t('product.outOfStock'), style: 'bg-[#DC2626] text-white' }
    : hasSale
    ? { label: `-${discountPercent}%`, style: 'bg-[#F47125] text-white' }
    : product.is_new
    ? { label: t('home.newBadge'), style: 'bg-[#17263E] text-white' }
    : null;

  const addShortLabel = lang === 'bn' ? 'যোগ করুন' : 'Add';

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-[#17263E]/8 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#17263E]/18 hover:shadow-[0_12px_28px_-10px_rgba(15,26,44,0.12)]',
        className,
      )}
    >
      {/* Media Container */}
      <div className="relative overflow-hidden bg-[#F6F7F9]">
        {tagInfo && (
          <span
            className={cn(
              'pointer-events-none absolute left-3 top-3 z-10 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-tight',
              tagInfo.style,
            )}
          >
            {tagInfo.label}
          </span>
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={t('nav.wishlist')}
          className={cn(
            'absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer',
            isWishlisted
              ? 'bg-[#DC2626] text-white shadow-xs'
              : 'bg-white/85 text-[#5B6577] opacity-90 hover:bg-white hover:text-[#DC2626] sm:opacity-0 sm:group-hover:opacity-100',
          )}
        >
          <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
        </button>

        <Link to={localizedPath(`/product/${product.slug}`)} className="block overflow-hidden">
          <ProductImage
            src={product.image_url}
            alt={tField(product, 'name')}
            aspectClassName="aspect-[4/3]"
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      </div>

      {/* Minimal Card Body */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {/* Quiet single-line Brand text */}
        <p className="truncate text-[11px] font-medium text-[#64748B]">
          {brandName ?? t('brand.name')}
        </p>

        {/* Clean 2-line Product Title */}
        <Link
          to={localizedPath(`/product/${product.slug}`)}
          className="mt-1 text-sm sm:text-[15px] font-semibold leading-snug text-[#0F1A2C] hover:text-[#F47125] line-clamp-2 min-h-[2.6rem] transition-colors"
        >
          {tField(product, 'name')}
        </Link>

        {/* Price + User-friendly Add CTA */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn(
                'text-base sm:text-[17px] font-bold tabular-nums',
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

          <button
            type="button"
            disabled={!inStock}
            onClick={handleQuickAdd}
            aria-label={t('product.addToCart')}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-1 rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer',
              !inStock
                ? 'bg-[#E5E9F0] text-[#64748B] cursor-not-allowed'
                : justAdded
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#F4F6F9] text-[#0F1A2C] hover:bg-[#F47125] hover:text-white',
            )}
          >
            {justAdded ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5 hidden sm:inline" />
                <Plus className="h-3.5 w-3.5 sm:hidden" />
                <span className="hidden sm:inline">{addShortLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

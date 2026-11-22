import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../hooks/useLanguage';
import { formatNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { PublicProduct, PublicProductVariant } from '../types';
import { ProductImage } from './ProductImage';
import { Badge, Button, Modal } from './ui';

export interface ProductReviewStats {
  avg: number;
  count: number;
}

export interface StorefrontProduct extends PublicProduct {
  image_url?: string | null;
  image_urls?: string[];
  brand_name?: string | null;
  category_slug?: string | null;
}

interface QuickViewModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
  brandName?: string | null;
  reviewStats?: ProductReviewStats | null;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  brandName,
  reviewStats,
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField, formatPrice } = useLanguage();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [variants, setVariants] = useState<PublicProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !product) return;
    setQuantity(1);
    setActiveImageIndex(0);
    setSelectedVariantId(null);
    setVariants([]);

    let active = true;
    if (supabase && !product.id.startsWith('demo-')) {
      void supabase
        .from('public_product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .then(({ data }) => {
          if (!active || !data) return;
          const list = data as PublicProductVariant[];
          setVariants(list);
          if (list.length > 0) {
            const firstInStock = list.find((v) => v.stock > 0) ?? list[0];
            setSelectedVariantId(firstInStock.id);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const urls =
      product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : product.image_url
        ? [product.image_url]
        : [];
    return Array.from(new Set(urls.filter(Boolean)));
  }, [product]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );

  if (!product) return null;

  const hasSale =
    product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price;
  const activePrice =
    selectedVariant && selectedVariant.price_override !== null
      ? selectedVariant.price_override
      : hasSale
      ? product.sale_price!
      : product.price;

  const discountPercent = hasSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  const availableStock = !product.track_stock
    ? 999
    : selectedVariant
    ? selectedVariant.stock
    : product.stock;
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= (product.low_stock_threshold ?? 5);

  const activeImage =
    selectedVariant?.image_url || galleryImages[activeImageIndex] || galleryImages[0] || null;

  const handleAdd = (goToCheckout = false) => {
    if (isOutOfStock) return;
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
        imageUrl: activeImage,
      },
      quantity,
      !goToCheckout,
    );

    onClose();
    if (goToCheckout) {
      navigate(localizedPath('/checkout'));
    } else {
      showToast({
        type: 'success',
        title: t('product.addedToCart'),
        description: `${tField(product, 'name')} (${formatNumber(quantity, lang)}x)`,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('product.quickView')}
      maxWidthClass="max-w-3xl"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
        {/* Left Gallery */}
        <div className="md:col-span-5 space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[#17263E]/10 bg-[#F5F7FA] shadow-soft">
            <ProductImage
              src={activeImage}
              alt={tField(product, 'name')}
              aspectClassName="aspect-square"
              categoryKey={product.category_slug || product.slug}
              eager
            />
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`${tField(product, 'name')} ${idx + 1}`}
                  className={cn(
                    'h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer',
                    activeImageIndex === idx
                      ? 'border-[#F47125] ring-2 ring-[#F47125]/25'
                      : 'border-[#17263E]/10 hover:border-[#17263E]/30',
                  )}
                >
                  <ProductImage
                    src={img}
                    alt={`${tField(product, 'name')} ${idx + 1}`}
                    aspectClassName="aspect-square"
                    categoryKey={product.category_slug || product.slug}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Details */}
        <div className="md:col-span-7 flex flex-col space-y-4">
          <div>
            {(brandName || product.brand_name) && (
              <p className="text-xs font-bold uppercase tracking-wider text-[#F47125]">
                {brandName || product.brand_name}
              </p>
            )}
            <h3 className="mt-1 text-xl font-bold leading-snug text-[#0F1A2C]">
              {tField(product, 'name')}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-[#5B6577]">
              <span>
                {t('product.sku')}: <strong className="font-mono text-[#0F1A2C]">{product.sku}</strong>
              </span>
              <span>•</span>
              {isOutOfStock ? (
                <span className="font-semibold text-[#DC2626]">{t('product.outOfStock')}</span>
              ) : isLowStock ? (
                <span className="font-semibold text-[#D95F18]">
                  {t('product.onlyShort', { count: formatNumber(availableStock, lang) })}
                </span>
              ) : (
                <span className="font-semibold text-[#16A34A]">{t('product.inStock')}</span>
              )}
              {reviewStats && reviewStats.count > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-[#F47125]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <strong className="text-[#0F1A2C] tabular-nums">
                      {reviewStats.avg.toFixed(1)}
                    </strong>
                    <span className="text-[#5B6577] tabular-nums">
                      ({formatNumber(reviewStats.count, lang)})
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-2.5 rounded-xl border border-[#17263E]/10 bg-[#F8FAFC] px-4 py-3">
            <span className="text-2xl font-bold text-[#F47125] tabular-nums">
              {formatPrice(Number(activePrice))}
            </span>
            {hasSale && (
              <span className="text-sm text-[#64748B] line-through tabular-nums">
                {formatPrice(Number(product.price))}
              </span>
            )}
            {hasSale && (
              <Badge variant="accent">
                -{formatNumber(discountPercent, lang)}%
              </Badge>
            )}
          </div>

          {(product.short_desc_en || product.short_desc_bn) && (
            <p className="text-sm leading-relaxed text-[#5B6577]">
              {tField(product, 'short_desc')}
            </p>
          )}

          {variants.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#0F1A2C]">
                {t('product.selectVariant')}
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  const vInStock = v.stock > 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!vInStock}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        'min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer',
                        isSelected
                          ? 'border-[#F47125] bg-[#F47125] text-white'
                          : vInStock
                          ? 'border-[#17263E]/15 bg-white text-[#0F1A2C] hover:bg-[#F5F7FA]'
                          : 'border-[#17263E]/10 bg-[#E5E9F0] text-[#64748B] opacity-60 cursor-not-allowed',
                      )}
                    >
                      {tField(v, 'name')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F1A2C]">
              {t('product.quantity')}:
            </span>
            <div className="inline-flex items-center rounded-xl border border-[#17263E]/15 bg-white">
              <button
                type="button"
                disabled={quantity <= 1 || isOutOfStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="inline-flex h-11 w-11 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[32px] text-center text-sm font-bold text-[#0F1A2C] tabular-nums">
                {formatNumber(quantity, lang)}
              </span>
              <button
                type="button"
                disabled={quantity >= availableStock || isOutOfStock}
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                aria-label="Increase quantity"
                className="inline-flex h-11 w-11 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button
              size="md"
              variant="outline"
              disabled={isOutOfStock}
              onClick={() => handleAdd(false)}
              className="min-h-[44px]"
              leftIcon={<ShoppingBag className="h-4 w-4" />}
            >
              {t('product.addToCart')}
            </Button>
            <Button
              size="md"
              variant="primary"
              disabled={isOutOfStock}
              onClick={() => handleAdd(true)}
              className="min-h-[44px]"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {t('product.buyNow')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#17263E]/10 pt-3 text-xs text-[#5B6577]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-[#F47125]" />
                {t('home.trustCodShort')}
              </span>
              {(product.warranty_en || product.warranty_bn) && (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
                  {tField(product, 'warranty')}
                </span>
              )}
            </div>

            <Link
              to={localizedPath(`/product/${product.slug}`)}
              onClick={onClose}
              className="font-semibold text-[#F47125] hover:underline"
            >
              {t('product.viewFullDetails')} →
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
};

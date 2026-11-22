import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, RotateCcw, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { Breadcrumb, Button, EmptyState, Input } from '../components/ui';
import { EDITORIAL_DEMO_IMAGES } from '../config/demoImages';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';
import type { CouponValidationResult } from '../types';

export const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, formatPrice } = useLanguage();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { items, subtotal, totalItems, updateQuantity, removeItem, clearCart } = useCart();

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Delivery preview toggle (Inside Dhaka vs Outside Dhaka)
  const [deliveryDistrictType, setDeliveryDistrictType] = useState<'dhaka' | 'outside'>('dhaka');

  const freeDeliveryThreshold = settings.free_delivery_above ?? 3000;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const neededForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  const deliveryCharge = isFreeDelivery
    ? 0
    : deliveryDistrictType === 'dhaka'
    ? settings.delivery_charge_dhaka ?? 70
    : settings.delivery_charge_outside ?? 130;

  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount) + deliveryCharge;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCodeInput.trim().toUpperCase();
    if (!code || !supabase) return;

    setValidatingCoupon(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code,
        p_subtotal: subtotal,
      });

      if (!error && data) {
        const res = data as CouponValidationResult;
        if (res.valid) {
          setAppliedCoupon(res);
          showToast({
            type: 'success',
            title: t('cart.couponApplied', { code: res.code }),
            description: `${t('cart.discount')}: ${formatPrice(res.discount_amount)}`,
          });
        } else {
          setAppliedCoupon(null);
          showToast({
            type: 'error',
            title: t('common.errorTitle'),
            description:
              res.reason === 'min_order_not_met'
                ? `Minimum order of ${formatPrice(res.min_order_amount ?? 0)} required.`
                : 'Invalid or expired coupon code.',
          });
        }
      }
    } catch {
      showToast({
        type: 'error',
        title: t('common.errorTitle'),
        description: t('common.errorDesc'),
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t('cart.title')} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: localizedPath('/') },
            { label: t('cart.title') },
          ]}
        />

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#17263E]/10 pb-6">
          <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">
            {t('cart.title')} ({totalItems})
          </h1>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t('cart.clearAll')}</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              imageUrl={EDITORIAL_DEMO_IMAGES.emptyShowcase}
              title={t('cart.emptyTitle')}
              description={t('cart.emptyDesc')}
              actionLabel={t('cart.browseProducts')}
              onAction={() => navigate(localizedPath('/shop'))}
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left 8 cols: Cart Table & Free Delivery banner */}
            <div className="lg:col-span-8 space-y-6">
              {/* Free delivery banner */}
              <div className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-4 shadow-soft">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className={isFreeDelivery ? 'text-[#16A34A]' : 'text-[#0F1A2C]'}>
                    {isFreeDelivery
                      ? t('cart.freeDeliveryQualified')
                      : t('cart.freeDeliveryProgress', { amount: formatPrice(neededForFree) })}
                  </span>
                  <span className="tabular-nums text-[#5B6577]">{progressPercent}%</span>
                </div>
                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#E5E9F0]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFreeDelivery ? 'bg-[#16A34A]' : 'bg-[#F47125]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-hidden rounded-[12px] border border-[#17263E]/10 bg-white shadow-soft">
                <div className="divide-y divide-[#17263E]/5">
                  {items.map((item) => {
                    const lineTotal = item.price * item.quantity;
                    return (
                      <div
                        key={`${item.productId}-${item.variantId ?? 'default'}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <Link
                            to={localizedPath(`/product/${item.slug}`)}
                            className="h-20 w-20 shrink-0 overflow-hidden rounded-[10px] border border-[#17263E]/10 bg-[#F5F7FA]"
                          >
                            <ProductImage
                              src={item.imageUrl}
                              alt={lang === 'bn' ? item.nameBn : item.nameEn}
                              aspectClassName="aspect-square"
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              to={localizedPath(`/product/${item.slug}`)}
                              className="text-base font-semibold text-[#0F1A2C] hover:text-[#F47125] line-clamp-1 transition-colors"
                            >
                              {lang === 'bn' ? item.nameBn : item.nameEn}
                            </Link>

                            {(item.variantNameBn || item.variantNameEn) && (
                              <p className="mt-0.5 text-xs text-[#5B6577]">
                                {lang === 'bn'
                                  ? item.variantNameBn || item.variantNameEn
                                  : item.variantNameEn || item.variantNameBn}
                              </p>
                            )}

                            <p className="mt-1 text-sm font-bold text-[#F47125] tabular-nums sm:hidden">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                        </div>

                        {/* Controls: Price, Stepper, Line Total, Remove */}
                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <span className="hidden sm:inline text-sm font-bold text-[#0F1A2C] tabular-nums">
                            {formatPrice(item.price)}
                          </span>

                          <div className="inline-flex items-center rounded-[8px] border border-[#17263E]/15 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                              aria-label="Decrease quantity"
                              className="inline-flex h-9 w-9 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[32px] text-center text-xs font-bold text-[#0F1A2C] tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                              aria-label="Increase quantity"
                              className="inline-flex h-9 w-9 items-center justify-center text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span className="text-base font-bold text-[#F47125] tabular-nums min-w-[70px] text-right">
                            {formatPrice(lineTotal)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, item.variantId)}
                            aria-label={t('cart.removeItem')}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[#5B6577] hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Continue Shopping button */}
              <div className="flex justify-between items-center">
                <Link to={localizedPath('/shop')}>
                  <Button variant="outline" size="sm">
                    ← {t('cart.continueShopping')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right 4 cols: Order Summary & Coupon */}
            <div className="lg:col-span-4 space-y-5">
              {/* Coupon Box */}
              <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F1A2C] mb-3">
                  <Tag className="h-4 w-4 text-[#F47125]" />
                  <span>{t('cart.couponCode')}</span>
                </div>

                {appliedCoupon?.valid ? (
                  <div className="flex items-center justify-between rounded-[8px] border border-[#16A34A]/30 bg-[#16A34A]/10 p-3">
                    <div>
                      <span className="font-mono text-sm font-bold text-[#16A34A]">
                        {appliedCoupon.code}
                      </span>
                      <p className="text-xs text-[#16A34A]">
                        {t('cart.discount')}: {formatPrice(appliedCoupon.discount_amount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
                    >
                      {t('cart.removeCoupon')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      placeholder={t('cart.couponPlaceholder')}
                      className="min-h-[40px] flex-1 rounded-[8px] border border-[#17263E]/15 px-3 py-1.5 text-xs text-[#0F1A2C] uppercase focus:border-[#F47125] focus:outline-none"
                    />
                    <Button type="submit" size="sm" loading={validatingCoupon}>
                      {t('cart.applyCoupon')}
                    </Button>
                  </form>
                )}
              </div>

              {/* Order Summary Box */}
              <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-5 shadow-soft space-y-4">
                <h2 className="text-base font-bold text-[#0F1A2C]">{t('checkout.orderSummary')}</h2>

                <div className="space-y-2.5 text-sm text-[#5B6577] border-b border-[#17263E]/10 pb-4">
                  <div className="flex justify-between">
                    <span>{t('cart.subtotal')}</span>
                    <span className="font-bold text-[#0F1A2C] tabular-nums">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-[#16A34A]">
                      <span>{t('cart.discount')}</span>
                      <span className="font-bold tabular-nums">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  {/* Delivery Location Preview */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1.5 font-medium text-[#0F1A2C]">
                      <span>{t('cart.deliveryCharge')}</span>
                      <span className="font-bold tabular-nums">
                        {isFreeDelivery ? 'Free' : formatPrice(deliveryCharge)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDeliveryDistrictType('dhaka')}
                        className={`rounded-[6px] border py-1 px-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                          deliveryDistrictType === 'dhaka'
                            ? 'border-[#F47125] bg-[#F47125]/10 text-[#D95F18]'
                            : 'border-[#17263E]/15 text-[#5B6577]'
                        }`}
                      >
                        {t('cart.insideDhaka')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryDistrictType('outside')}
                        className={`rounded-[6px] border py-1 px-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                          deliveryDistrictType === 'outside'
                            ? 'border-[#F47125] bg-[#F47125]/10 text-[#D95F18]'
                            : 'border-[#17263E]/15 text-[#5B6577]'
                        }`}
                      >
                        {t('cart.outsideDhaka')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-baseline text-lg font-bold text-[#0F1A2C]">
                  <span>{t('cart.grandTotal')}</span>
                  <span className="text-2xl text-[#F47125] tabular-nums">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <Button
                  size="lg"
                  fullWidth
                  onClick={() =>
                    navigate(
                      `${localizedPath('/checkout')}${
                        appliedCoupon?.code ? `?coupon=${appliedCoupon.code}` : ''
                      }`,
                    )
                  }
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  {t('cart.proceedCheckout')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

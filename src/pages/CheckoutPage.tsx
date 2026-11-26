import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumb, Button, Input, Textarea } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { BANGLADESH_DISTRICTS, type District } from '../data/districts';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { trackBeginCheckout, trackPurchase } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import { isValidBdPhone, isValidEmail, normalizeBdPhone } from '../lib/validation';
import type { CouponValidationResult, PaymentMethod } from '../types';

const LAST_ORDER_KEY = 'martbari_last_order_customer';

export const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, formatPrice } = useLanguage();
  const { settings } = useSettings();
  const { items, subtotal, clearCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Coupon from URL (e.g. ?coupon=WELCOME10)
  const initialCoupon = searchParams.get('coupon') || '';
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<District>(BANGLADESH_DISTRICTS[0]);
  const [address, setAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // District Search Filter in dropdown
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const districtRef = useRef<HTMLDivElement>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentSender, setPaymentSender] = useState('');
  const [paymentTrxId, setPaymentTrxId] = useState('');

  // Anti-bot controls
  const [honeypot, setHoneypot] = useState('');
  const formMountTimeRef = useRef<number>(Date.now());

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track begin_checkout
  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(subtotal, items.length);
    }
  }, [items.length, subtotal]);

  // Pre-fill from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_ORDER_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.name) setFullName(data.name);
        if (data.phone) setPhone(data.phone);
        if (data.email) setEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.district) {
          const match = BANGLADESH_DISTRICTS.find(
            (d) =>
              d.name_en.toLowerCase() === data.district.toLowerCase() ||
              d.name_bn === data.district,
          );
          if (match) setSelectedDistrict(match);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Validate coupon if passed from cart
  useEffect(() => {
    if (initialCoupon.trim() && supabase && subtotal > 0) {
      void supabase
        .rpc('validate_coupon', {
          p_code: initialCoupon.trim().toUpperCase(),
          p_subtotal: subtotal,
        })
        .then(({ data }) => {
          if (data && (data as CouponValidationResult).valid) {
            setAppliedCoupon(data as CouponValidationResult);
          }
        });
    }
  }, [initialCoupon, subtotal]);

  // Close district dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (districtRef.current && !districtRef.current.contains(e.target as Node)) {
        setIsDistrictOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    const q = districtSearch.trim().toLowerCase();
    if (!q) return BANGLADESH_DISTRICTS;
    return BANGLADESH_DISTRICTS.filter(
      (d) =>
        d.name_en.toLowerCase().includes(q) ||
        d.name_bn.includes(q) ||
        d.id.toLowerCase().includes(q),
    );
  }, [districtSearch]);

  // Delivery charge calculation
  const freeDeliveryThreshold = settings.free_delivery_above ?? 3000;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;

  const deliveryCharge = isFreeDelivery
    ? 0
    : selectedDistrict.is_dhaka
    ? settings.delivery_charge_dhaka ?? 70
    : settings.delivery_charge_outside ?? 130;

  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount) + deliveryCharge;

  // Form submit handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Anti-bot checks
    if (honeypot.trim().length > 0) {
      setErrorMessage(t('checkout.botDetected'));
      return;
    }
    const elapsedMs = Date.now() - formMountTimeRef.current;
    if (elapsedMs < 2500) {
      setErrorMessage(t('checkout.botDetected'));
      return;
    }

    // 2. Validate Cart
    if (items.length === 0) {
      navigate(localizedPath('/cart'));
      return;
    }

    // 3. Validate Inputs
    const cleanName = fullName.trim();
    const cleanPhone = normalizeBdPhone(phone);
    const cleanAddress = address.trim();

    if (!cleanName) {
      setErrorMessage(t('checkout.fullName') + ' is required.');
      return;
    }

    if (!isValidBdPhone(cleanPhone)) {
      setErrorMessage(t('checkout.invalidPhone'));
      return;
    }

    if (email.trim() && !isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!cleanAddress) {
      setErrorMessage(t('checkout.address') + ' is required.');
      return;
    }

    if (paymentMethod !== 'cod') {
      if (!paymentSender.trim() || !paymentTrxId.trim()) {
        setErrorMessage('Please enter your sender mobile number and Transaction ID (TrxID).');
        return;
      }
    }

    if (!supabase) {
      setErrorMessage('Database connection not initialized.');
      return;
    }

    // Prepare Items payload (product_id, variant_id, quantity) - NEVER send prices!
    const itemsPayload = items.map((i) => ({
      product_id: i.productId,
      variant_id: i.variantId ?? null,
      quantity: i.quantity,
    }));

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_customer_name: cleanName,
        p_phone: cleanPhone,
        p_email: email.trim() || null,
        p_address: cleanAddress,
        p_district: selectedDistrict.name_en,
        p_items: itemsPayload,
        p_coupon_code: appliedCoupon?.code ?? (couponCode.trim() || null),
        p_payment_method: paymentMethod,
        p_payment_sender_number: paymentSender.trim() || null,
        p_payment_trx_id: paymentTrxId.trim() || null,
        p_customer_note: orderNote.trim() || null,
      });

      if (error) {
        let friendlyErr = error.message;
        if (friendlyErr.includes('Insufficient stock')) {
          friendlyErr = 'One or more items in your cart are out of stock. Please adjust quantities in cart.';
        } else if (friendlyErr.includes('blocked')) {
          friendlyErr = 'This phone number cannot place orders at this time. Please contact customer care.';
        } else if (friendlyErr.includes('Too many orders')) {
          friendlyErr = 'Too many orders placed recently. Please try again in an hour.';
        } else if (friendlyErr.includes('coupon')) {
          friendlyErr = 'The coupon code entered is invalid or expired.';
        }
        setErrorMessage(friendlyErr);
        setIsSubmitting(false);
        return;
      }

      const orderNumber = data as string;

      // Save customer details in localStorage for future orders
      try {
        window.localStorage.setItem(
          LAST_ORDER_KEY,
          JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            email: email.trim(),
            address: cleanAddress,
            district: selectedDistrict.name_en,
          }),
        );
      } catch {
        // Ignore
      }

      // Track purchase event in analytics
      trackPurchase(orderNumber, grandTotal);

      // Snapshot ordered items for immediate customer invoice preview
      const invoiceItemsSnapshot = items.map((item) => ({
        nameBn: item.variantNameBn ? `${item.nameBn} (${item.variantNameBn})` : item.nameBn,
        nameEn: item.variantNameEn ? `${item.nameEn} (${item.variantNameEn})` : item.nameEn,
        quantity: item.quantity,
        unitPrice: item.price,
        imageUrl: item.imageUrl,
      }));

      // Clear cart
      clearCart();

      // Navigate to order-success page with state
      navigate(localizedPath(`/order-success/${orderNumber}`), {
        state: {
          orderNumber,
          customerName: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          district: selectedDistrict.name_en,
          total: grandTotal,
          deliveryCharge,
          subtotal,
          discountAmount,
          paymentMethod,
          createdAt: new Date().toISOString(),
          items: invoiceItemsSnapshot,
        },
      });
    } catch {
      setErrorMessage('Network error while placing order. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#F5F7FA] text-[#17263E]/40 mb-4">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0F1A2C]">{t('cart.emptyTitle')}</h2>
        <p className="mt-2 text-sm text-[#5B6577]">{t('cart.emptyDesc')}</p>
        <Link to={localizedPath('/shop')}>
          <Button className="mt-6">{t('cart.browseProducts')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t('checkout.title')} — {t('brand.name')}
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: localizedPath('/') },
            { label: t('cart.title'), to: localizedPath('/cart') },
            { label: t('checkout.title') },
          ]}
        />

        <div className="mt-6 border-b border-[#17263E]/10 pb-4">
          <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">
            {t('checkout.title')}
          </h1>
          <p className="mt-1 text-xs text-[#5B6577] flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#16A34A]" />
            <span>{t('checkout.guestNote')}</span>
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-3 rounded-[12px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-4 text-sm text-[#DC2626]">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Honeypot field (hidden from genuine users) */}
          <input
            type="text"
            name="website_hp"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          {/* Left Column (7 cols): Customer & Shipping Info + Payment Method */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Shipping Info */}
            <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-6 shadow-soft space-y-4">
              <h2 className="text-lg font-bold text-[#0F1A2C]">
                {t('checkout.shippingInfo')}
              </h2>

              <Input
                label={t('checkout.fullName')}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('checkout.namePlaceholder')}
              />

              <div>
                <Input
                  label={t('checkout.phone')}
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('checkout.phonePlaceholder')}
                  helperText={t('checkout.phoneHelp')}
                />
              </div>

              <Input
                label={t('checkout.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('checkout.emailPlaceholder')}
              />

              {/* District Selector (Searchable list of all 64 districts) */}
              <div ref={districtRef} className="relative">
                <label className="mb-1.5 block text-sm font-medium text-[#0F1A2C]">
                  {t('checkout.district')} *
                </label>
                <button
                  type="button"
                  onClick={() => setIsDistrictOpen((prev) => !prev)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-[#17263E]/15 bg-white px-4 py-2.5 text-sm text-[#0F1A2C] focus:border-[#F47125] focus:outline-none cursor-pointer"
                >
                  <span className="font-semibold">
                    {lang === 'bn' ? selectedDistrict.name_bn : selectedDistrict.name_en}
                  </span>
                  <span className="text-xs text-[#5B6577]">
                    {selectedDistrict.is_dhaka ? t('cart.insideDhaka') : t('cart.outsideDhaka')}
                  </span>
                </button>

                {isDistrictOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-60 overflow-y-auto rounded-[12px] border border-[#17263E]/10 bg-white shadow-card">
                    <div className="sticky top-0 bg-white p-2 border-b border-[#17263E]/10">
                      <div className="relative">
                        <input
                          type="text"
                          value={districtSearch}
                          onChange={(e) => setDistrictSearch(e.target.value)}
                          placeholder={t('checkout.searchDistrict')}
                          className="w-full rounded-[8px] border border-[#17263E]/15 px-3 py-1.5 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                        />
                        <Search className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5B6577]" />
                      </div>
                    </div>

                    <div className="divide-y divide-[#17263E]/5">
                      {filteredDistricts.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDistrict(d);
                            setIsDistrictOpen(false);
                            setDistrictSearch('');
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                            selectedDistrict.id === d.id
                              ? 'bg-[#F47125]/10 font-bold text-[#D95F18]'
                              : 'text-[#0F1A2C] hover:bg-[#F5F7FA]'
                          }`}
                        >
                          <span>{lang === 'bn' ? d.name_bn : d.name_en}</span>
                          <span className="text-[11px] text-[#5B6577]">
                            {d.is_dhaka ? '৳70' : '৳130'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Textarea
                label={t('checkout.address')}
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('checkout.addressPlaceholder')}
              />

              <Textarea
                label={t('checkout.orderNote')}
                rows={2}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder={t('checkout.notePlaceholder')}
              />
            </div>

            {/* Step 2: Payment Method */}
            <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-6 shadow-soft space-y-4">
              <h2 className="text-lg font-bold text-[#0F1A2C]">
                {t('checkout.paymentMethod')}
              </h2>

              <div className="space-y-3">
                {/* Cash on Delivery Option */}
                <label
                  className={`flex items-start gap-3.5 rounded-[12px] border p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'cod'
                      ? 'border-[#F47125] bg-[#F47125]/5'
                      : 'border-[#17263E]/10 hover:bg-[#F5F7FA]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="mt-1 h-4 w-4 text-[#F47125] focus:ring-[#F47125]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#0F1A2C]">{t('checkout.cod')}</p>
                    <p className="mt-1 text-xs text-[#5B6577]">{t('checkout.codDesc')}</p>
                  </div>
                </label>

                {/* bKash Manual Payment Option */}
                <label
                  className={`flex items-start gap-3.5 rounded-[12px] border p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'bkash'
                      ? 'border-[#E2136E] bg-[#E2136E]/5'
                      : 'border-[#17263E]/10 hover:bg-[#F5F7FA]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="bkash"
                    checked={paymentMethod === 'bkash'}
                    onChange={() => setPaymentMethod('bkash')}
                    className="mt-1 h-4 w-4 text-[#E2136E] focus:ring-[#E2136E]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#0F1A2C]">{t('checkout.bkash')}</p>
                    <p className="mt-1 text-xs text-[#5B6577]">
                      {t('checkout.manualPaymentNotice')}
                    </p>
                  </div>
                </label>

                {/* Nagad Manual Payment Option */}
                <label
                  className={`flex items-start gap-3.5 rounded-[12px] border p-4 cursor-pointer transition-colors ${
                    paymentMethod === 'nagad'
                      ? 'border-[#F47125] bg-[#F47125]/5'
                      : 'border-[#17263E]/10 hover:bg-[#F5F7FA]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="nagad"
                    checked={paymentMethod === 'nagad'}
                    onChange={() => setPaymentMethod('nagad')}
                    className="mt-1 h-4 w-4 text-[#F47125] focus:ring-[#F47125]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#0F1A2C]">{t('checkout.nagad')}</p>
                    <p className="mt-1 text-xs text-[#5B6577]">
                      {t('checkout.manualPaymentNotice')}
                    </p>
                  </div>
                </label>
              </div>

              {/* Conditional manual bKash/Nagad fields */}
              {paymentMethod !== 'cod' && (
                <div className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-4 space-y-3.5 mt-4">
                  <div className="text-xs">
                    <span className="font-semibold text-[#0F1A2C]">
                      {t('checkout.sendMoneyTo')}{' '}
                    </span>
                    <strong className="font-mono text-sm text-[#F47125]">
                      {paymentMethod === 'bkash'
                        ? settings.bkash_number || settings.phone
                        : settings.nagad_number || settings.phone}
                    </strong>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label={t('checkout.senderNumber')}
                      required
                      value={paymentSender}
                      onChange={(e) => setPaymentSender(e.target.value)}
                      placeholder={t('checkout.senderPlaceholder')}
                    />
                    <Input
                      label={t('checkout.trxId')}
                      required
                      value={paymentTrxId}
                      onChange={(e) => setPaymentTrxId(e.target.value)}
                      placeholder={t('checkout.trxPlaceholder')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Order Summary & Confirm Order CTA */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-6 shadow-soft space-y-4 sticky top-24">
              <h2 className="text-base font-bold text-[#0F1A2C]">
                {t('checkout.orderSummary')} ({items.length})
              </h2>

              {/* Items List preview */}
              <div className="divide-y divide-[#17263E]/5 max-h-60 overflow-y-auto">
                {items.map((i) => (
                  <div
                    key={`${i.productId}-${i.variantId ?? 'default'}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="py-0.5 font-semibold leading-[1.5] text-[#0F1A2C] truncate">
                        {lang === 'bn' ? i.nameBn : i.nameEn}
                      </p>
                      <p className="text-[#5B6577]">
                        {formatPrice(i.price)} × {i.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-[#0F1A2C] tabular-nums">
                      {formatPrice(i.price * i.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Calculations */}
              <div className="space-y-2 text-sm text-[#5B6577] border-t border-[#17263E]/10 pt-4">
                <div className="flex justify-between">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-bold text-[#0F1A2C] tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#16A34A]">
                    <span>
                      {t('cart.discount')} ({appliedCoupon?.code})
                    </span>
                    <span className="font-bold tabular-nums">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>
                    {t('cart.deliveryCharge')} (
                    {selectedDistrict.is_dhaka
                      ? t('cart.insideDhaka')
                      : t('cart.outsideDhaka')}
                    )
                  </span>
                  <span className="font-bold text-[#0F1A2C] tabular-nums">
                    {isFreeDelivery ? 'Free' : formatPrice(deliveryCharge)}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-baseline border-t border-[#17263E]/10 pt-4 text-base font-bold text-[#0F1A2C]">
                <span>{t('cart.grandTotal')}</span>
                <span className="text-2xl text-[#F47125] tabular-nums">
                  {formatPrice(grandTotal)}
                </span>
              </div>

              {/* Trust Badge */}
              <div className="rounded-[8px] bg-[#F5F7FA] p-3 text-xs text-[#5B6577] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#16A34A] shrink-0" />
                <span>{t('footer.codNote')}</span>
              </div>

              {/* Place Order CTA Button */}
              <Button
                type="submit"
                size="lg"
                fullWidth
                disabled={isSubmitting}
                loading={isSubmitting}
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                {isSubmitting ? t('checkout.submitting') : t('checkout.placeOrder')}
              </Button>

              <p className="text-center text-[11px] text-[#5B6577]">
                {t('checkout.agreeTerms')}
              </p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

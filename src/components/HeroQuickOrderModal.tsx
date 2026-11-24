import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { BANGLADESH_DISTRICTS, type District } from '../data/districts';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { trackPurchase } from '../lib/analytics';
import { formatNumber } from '../lib/format';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { isValidBdPhone, normalizeBdPhone } from '../lib/validation';
import type { PaymentMethod, PublicProductVariant } from '../types';
import { ProductImage } from './ProductImage';
import type { StorefrontProduct } from './QuickViewModal';
import { Badge, Button, Input, Modal, Textarea } from './ui';

const LAST_ORDER_KEY = 'martbari_last_order_customer';

export interface HeroQuickOrderModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
  initialVariantId?: string | null;
  initialQuantity?: number;
}

export const HeroQuickOrderModal: React.FC<HeroQuickOrderModalProps> = ({
  product,
  isOpen,
  onClose,
  initialVariantId = null,
  initialQuantity = 1,
}) => {
  const { t } = useTranslation();
  const { lang, localizedPath, tField, formatPrice } = useLanguage();
  const { settings } = useSettings();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [variants, setVariants] = useState<PublicProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(initialVariantId);
  const [quantity, setQuantity] = useState(initialQuantity);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<District>(BANGLADESH_DISTRICTS[0]);
  const [address, setAddress] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const districtRef = useRef<HTMLDivElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentSender, setPaymentSender] = useState('');
  const [paymentTrxId, setPaymentTrxId] = useState('');

  const [honeypot, setHoneypot] = useState('');
  const openTimestampRef = useRef<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) return;
    setQuantity(Math.max(1, initialQuantity));
    setSelectedVariantId(initialVariantId ?? null);
    setVariants([]);
    setErrorMessage(null);
    setIsDistrictOpen(false);
    openTimestampRef.current = Date.now();

    try {
      const stored = window.localStorage.getItem(LAST_ORDER_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.name) setFullName((prev) => prev || data.name);
        if (data.phone) setPhone((prev) => prev || data.phone);
        if (data.address) setAddress((prev) => prev || data.address);
        if (data.district) {
          const match = BANGLADESH_DISTRICTS.find(
            (d) =>
              d.name_en.toLowerCase() === String(data.district).toLowerCase() ||
              d.name_bn === data.district,
          );
          if (match) setSelectedDistrict(match);
        }
      }
    } catch {
      // Ignore localStorage parse error
    }

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

  useEffect(() => {
    if (!isDistrictOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (districtRef.current && !districtRef.current.contains(e.target as Node)) {
        setIsDistrictOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isDistrictOpen]);

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

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );

  if (!product) return null;

  const hasSale =
    product.sale_price !== null &&
    product.sale_price > 0 &&
    product.sale_price < product.price;

  const unitPrice =
    selectedVariant && selectedVariant.price_override !== null
      ? Number(selectedVariant.price_override)
      : hasSale
      ? Number(product.sale_price!)
      : Number(product.price);

  const discountPercent = hasSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : 0;

  const availableStock = !product.track_stock
    ? 999
    : selectedVariant
    ? selectedVariant.stock
    : product.stock;

  const isOutOfStock = availableStock <= 0;
  const activeImage =
    selectedVariant?.image_url ||
    product.image_urls?.[0] ||
    product.image_url ||
    null;

  const subtotal = unitPrice * quantity;
  const freeDeliveryThreshold = settings.free_delivery_above ?? 3000;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDelivery
    ? 0
    : selectedDistrict.is_dhaka
    ? settings.delivery_charge_dhaka ?? 70
    : settings.delivery_charge_outside ?? 130;
  const grandTotal = subtotal + deliveryCharge;

  const isDemoItem = product.id.startsWith('demo-') || !supabase;

  const handleAddToCartAndGoCheckout = () => {
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
        price: unitPrice,
        imageUrl: activeImage,
      },
      quantity,
      false,
    );
    onClose();
    navigate(localizedPath('/checkout'));
  };

  const handleExpressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (honeypot.trim().length > 0) {
      setErrorMessage(t('checkout.botDetected'));
      return;
    }

    if (Date.now() - openTimestampRef.current < 1200) {
      setErrorMessage(t('checkout.botDetected'));
      return;
    }

    if (isOutOfStock) {
      setErrorMessage(t('product.outOfStock'));
      return;
    }

    // If demo item or offline preview without Supabase, hand off via Cart -> Checkout
    if (isDemoItem || !supabase) {
      handleAddToCartAndGoCheckout();
      return;
    }

    const cleanName = fullName.trim();
    const cleanPhone = normalizeBdPhone(phone);
    const cleanAddress = address.trim();

    if (!cleanName) {
      setErrorMessage(`${t('checkout.fullName')} is required.`);
      return;
    }

    if (!isValidBdPhone(cleanPhone)) {
      setErrorMessage(t('checkout.invalidPhone'));
      return;
    }

    if (!cleanAddress) {
      setErrorMessage(`${t('checkout.address')} is required.`);
      return;
    }

    if (paymentMethod !== 'cod' && (!paymentSender.trim() || !paymentTrxId.trim())) {
      setErrorMessage('Please enter your sender number and Transaction ID (TrxID).');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_customer_name: cleanName,
        p_phone: cleanPhone,
        p_email: null,
        p_address: cleanAddress,
        p_district: selectedDistrict.name_en,
        p_items: [
          {
            product_id: product.id,
            variant_id: selectedVariant?.id ?? null,
            quantity,
          },
        ],
        p_coupon_code: null,
        p_payment_method: paymentMethod,
        p_payment_sender_number: paymentSender.trim() || null,
        p_payment_trx_id: paymentTrxId.trim() || null,
        p_customer_note: 'Express Hero Quick Order',
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      const orderNumber = data as string;
      try {
        window.localStorage.setItem(
          LAST_ORDER_KEY,
          JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            address: cleanAddress,
            district: selectedDistrict.name_en,
          }),
        );
      } catch {
        // Ignore storage write error
      }

      trackPurchase(orderNumber, grandTotal);
      showToast({
        type: 'success',
        title: t('orderSuccess.title'),
        description: `#${orderNumber}`,
      });
      onClose();
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
          paymentMethod,
        },
      });
    } catch {
      setErrorMessage('Network error while placing order. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('hero.quickOrderTitle')}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Product Summary Strip */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#17263E]/10 bg-[#F8FAFC] p-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#17263E]/10 bg-white">
            <ProductImage
              src={activeImage}
              alt={tField(product, 'name')}
              aspectClassName="aspect-square"
              categoryKey={product.category_slug || product.slug}
              eager
            />
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={localizedPath(`/product/${product.slug}`)}
              onClick={onClose}
              className="block text-sm sm:text-base font-bold text-[#0F1A2C] hover:text-[#F47125] line-clamp-2"
            >
              {tField(product, 'name')}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-base sm:text-lg font-extrabold text-[#F47125] tabular-nums">
                {formatPrice(unitPrice)}
              </span>
              {hasSale && (
                <span className="text-xs text-[#64748B] line-through tabular-nums">
                  {formatPrice(Number(product.price))}
                </span>
              )}
              {hasSale && (
                <Badge variant="accent">-{formatNumber(discountPercent, lang)}%</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Variant Picker + Quantity */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#17263E]/10 pb-4">
          {variants.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-[#0F1A2C]">{t('product.selectVariant')}</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const selected = selectedVariantId === v.id;
                  const vInStock = v.stock > 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!vInStock}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        'min-h-[44px] rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                        selected
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
            <span className="text-xs font-bold text-[#0F1A2C]">{t('product.quantity')}</span>
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
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 p-3 text-xs font-medium text-[#DC2626]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleExpressSubmit} className="space-y-4">
          <input
            type="text"
            name="quick_hp"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />

          <p className="flex items-center gap-1.5 text-xs font-medium text-[#5B6577]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] shrink-0" />
            <span>{t('hero.quickOrderSubtitle')}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('checkout.fullName')}
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('checkout.namePlaceholder')}
            />
            <Input
              label={t('checkout.phone')}
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('checkout.phonePlaceholder')}
            />
          </div>

          <div ref={districtRef} className="relative">
            <label className="mb-1.5 block text-sm font-medium text-[#0F1A2C]">
              {t('checkout.district')} *
            </label>
            <button
              type="button"
              onClick={() => setIsDistrictOpen((prev) => !prev)}
              className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] border border-[#17263E]/15 bg-white px-4 py-2 text-sm text-[#0F1A2C] focus:border-[#F47125] focus:outline-none cursor-pointer"
            >
              <span className="font-semibold">
                {lang === 'bn' ? selectedDistrict.name_bn : selectedDistrict.name_en}
              </span>
              <span className="text-xs text-[#5B6577]">
                {isFreeDelivery
                  ? 'Free'
                  : selectedDistrict.is_dhaka
                  ? t('cart.insideDhaka')
                  : t('cart.outsideDhaka')}
              </span>
            </button>

            {isDistrictOpen && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-52 overflow-y-auto rounded-[12px] border border-[#17263E]/10 bg-white shadow-card">
                <div className="sticky top-0 bg-white p-2 border-b border-[#17263E]/10">
                  <div className="relative">
                    <input
                      type="text"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder={t('checkout.searchDistrict')}
                      className="w-full rounded-[8px] border border-[#17263E]/15 px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
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
                      className={cn(
                        'flex min-h-[44px] w-full items-center justify-between px-4 py-2 text-left text-xs transition-colors cursor-pointer',
                        selectedDistrict.id === d.id
                          ? 'bg-[#F47125]/10 font-bold text-[#D95F18]'
                          : 'text-[#0F1A2C] hover:bg-[#F5F7FA]',
                      )}
                    >
                      <span>{lang === 'bn' ? d.name_bn : d.name_en}</span>
                      <span className="text-[11px] text-[#5B6577] tabular-nums">
                        {formatPrice(
                          d.is_dhaka
                            ? settings.delivery_charge_dhaka ?? 70
                            : settings.delivery_charge_outside ?? 130,
                        )}
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
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('checkout.addressPlaceholder')}
          />

          {/* Compact Payment Toggle */}
          <div className="grid grid-cols-3 gap-2">
            {(['cod', 'bkash', 'nagad'] as PaymentMethod[]).map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => setPaymentMethod(pm)}
                className={cn(
                  'min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors cursor-pointer',
                  paymentMethod === pm
                    ? 'border-[#F47125] bg-[#F47125]/10 text-[#D95F18]'
                    : 'border-[#17263E]/15 bg-white text-[#0F1A2C] hover:bg-[#F5F7FA]',
                )}
              >
                {pm === 'cod'
                  ? t('checkout.cod')
                  : pm === 'bkash'
                  ? 'bKash'
                  : 'Nagad'}
              </button>
            ))}
          </div>

          {paymentMethod !== 'cod' && (
            <div className="rounded-xl border border-[#17263E]/10 bg-[#F5F7FA] p-3 space-y-2.5">
              <p className="text-xs text-[#0F1A2C]">
                {t('checkout.sendMoneyTo')}{' '}
                <strong className="font-mono text-[#F47125]">
                  {paymentMethod === 'bkash'
                    ? settings.bkash_number || settings.phone
                    : settings.nagad_number || settings.phone}
                </strong>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

          {/* Totals Summary */}
          <div className="rounded-xl border border-[#17263E]/10 bg-[#F8FAFC] p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between text-[#5B6577]">
              <span>{t('cart.subtotal')}</span>
              <span className="font-semibold text-[#0F1A2C] tabular-nums">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-[#5B6577]">
              <span>{t('cart.deliveryCharge')}</span>
              <span className="font-semibold text-[#0F1A2C] tabular-nums">
                {isFreeDelivery ? 'Free' : formatPrice(deliveryCharge)}
              </span>
            </div>
            <div className="flex justify-between items-baseline border-t border-[#17263E]/10 pt-2 text-sm font-bold text-[#0F1A2C]">
              <span>{t('cart.grandTotal')}</span>
              <span className="text-lg font-extrabold text-[#F47125] tabular-nums">
                {formatPrice(grandTotal)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isOutOfStock}
              onClick={handleAddToCartAndGoCheckout}
              className="min-h-[44px]"
              leftIcon={<ShoppingBag className="h-4 w-4" />}
            >
              {t('hero.goToFullCheckout')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isOutOfStock || isSubmitting}
              loading={isSubmitting}
              className="min-h-[44px]"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {isSubmitting ? t('checkout.submitting') : t('checkout.placeOrder')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#5B6577] pt-1">
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-[#F47125]" />
              {t('home.trustCodShort')}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
              {t('home.trustAuthenticShort')}
            </span>
          </div>
        </form>
      </div>
    </Modal>
  );
};

import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  Phone,
  Search,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Breadcrumb, Button } from '../components/ui';
import { STORE_DEFAULTS } from '../config/constants';
import { useLanguage } from '../hooks/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { keepLatinDigits } from '../lib/format';

interface OrderSuccessLocationState {
  orderNumber?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  district?: string;
  total?: number;
  paymentMethod?: string;
}

export const OrderSuccessPage: React.FC = () => {
  const { orderNumber: paramOrderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const state = (location.state as OrderSuccessLocationState) ?? {};

  const orderNumber = paramOrderNumber ?? state.orderNumber ?? 'MB-2026-00001';

  const { t } = useTranslation();
  const { lang, localizedPath, formatPrice } = useLanguage();
  const { settings } = useSettings();

  const [copied, setCopied] = useState(false);

  const handleCopyOrderNumber = () => {
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const whatsappNumber = keepLatinDigits(settings.whatsapp || STORE_DEFAULTS.whatsapp).replace(
    /[^\d]/g,
    '',
  );

  const whatsappMessage = t('orderSuccess.whatsappText', { orderNumber });
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t('orderSuccess.title')} — {t('brand.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-[12px] border border-[#16A34A]/25 bg-white shadow-card">
          {/* Header Banner */}
          <div className="bg-[#16A34A]/10 border-b border-[#16A34A]/20 p-6 sm:p-8 text-center">
            <div className="mx-auto mb-3.5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">
              {t('orderSuccess.title')}
            </h1>
            <p className="mt-2 text-sm text-[#5B6577]">{t('orderSuccess.subtitle')}</p>

            {/* Order Number Box */}
            <div className="mt-5 inline-flex items-center gap-3 rounded-[10px] border border-[#16A34A]/30 bg-white px-5 py-2.5 shadow-sm">
              <span className="text-xs font-semibold text-[#5B6577]">
                {t('orderSuccess.orderNumber')}:
              </span>
              <strong className="font-mono text-base font-bold text-[#0F1A2C] tracking-wide">
                {orderNumber}
              </strong>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                aria-label={t('orderSuccess.copy')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5B6577] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#16A34A]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Phone Confirmation Note */}
            <div className="flex items-start gap-3 rounded-[12px] border border-[#F47125]/25 bg-[#F47125]/5 p-4 text-xs sm:text-sm text-[#0F1A2C]">
              <Phone className="h-5 w-5 text-[#F47125] shrink-0 mt-0.5" />
              <span>{t('orderSuccess.callNotice')}</span>
            </div>

            {/* Order Summary details if available from location state */}
            {state.customerName && (
              <div className="rounded-[12px] border border-[#17263E]/10 bg-[#F5F7FA] p-5 space-y-3 text-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F1A2C]">
                  {t('orderSuccess.orderDetails')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5B6577]">
                  <div>
                    <span className="font-medium text-[#0F1A2C]">{t('checkout.fullName')}:</span>{' '}
                    {state.customerName}
                  </div>
                  <div>
                    <span className="font-medium text-[#0F1A2C]">{t('checkout.phone')}:</span>{' '}
                    <span className="tabular-nums font-mono">{state.phone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-medium text-[#0F1A2C]">{t('orderSuccess.deliveryTo')}:</span>{' '}
                    {state.address}, {state.district}
                  </div>
                  {state.total && (
                    <div>
                      <span className="font-medium text-[#0F1A2C]">{t('cart.grandTotal')}:</span>{' '}
                      <strong className="text-sm font-bold text-[#F47125] tabular-nums">
                        {formatPrice(state.total)}
                      </strong>
                    </div>
                  )}
                  {state.paymentMethod && (
                    <div>
                      <span className="font-medium text-[#0F1A2C]">{t('orderSuccess.payment')}:</span>{' '}
                      <span className="uppercase font-semibold text-[#0F1A2C]">
                        {state.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons: WhatsApp & Track Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  fullWidth
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white"
                  leftIcon={<MessageCircle className="h-5 w-5" />}
                >
                  {t('orderSuccess.whatsappConfirm')}
                </Button>
              </a>

              <Link
                to={`${localizedPath('/track-order')}?order=${encodeURIComponent(orderNumber)}${
                  state.phone ? `&phone=${encodeURIComponent(state.phone)}` : ''
                }`}
              >
                <Button fullWidth variant="outline" leftIcon={<Search className="h-4 w-4" />}>
                  {t('orderSuccess.trackOrder')}
                </Button>
              </Link>
            </div>

            <div className="text-center pt-2">
              <Link
                to={localizedPath('/')}
                className="text-xs font-semibold text-[#5B6577] hover:text-[#F47125]"
              >
                ← {t('orderSuccess.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

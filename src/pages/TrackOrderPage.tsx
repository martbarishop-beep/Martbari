import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CustomerInvoice, buildInvoiceFromTrackedOrder } from '../components/CustomerInvoice';
import { Breadcrumb, Button, Input } from '../components/ui';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../lib/supabase';
import { normalizeBdPhone } from '../lib/validation';
import type { TrackedOrderResult } from '../types';

export const TrackOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const { lang, localizedPath, formatPrice } = useLanguage();
  const [searchParams] = useSearchParams();

  const [orderNumberInput, setOrderNumberInput] = useState(searchParams.get('order') || '');
  const [phoneInput, setPhoneInput] = useState(searchParams.get('phone') || '');

  const [orderData, setOrderData] = useState<TrackedOrderResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(searchParams.get('view') === 'invoice');

  const handleTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const orderNum = orderNumberInput.trim().toUpperCase();
    const cleanPhone = normalizeBdPhone(phoneInput);

    if (!orderNum || !cleanPhone || !supabase) {
      setErrorMsg('Please enter both Order Number and Phone Number.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const { data, error } = await supabase.rpc('track_order', {
        p_order_number: orderNum,
        p_phone: cleanPhone,
      });

      if (error || !data) {
        setOrderData(null);
      } else {
        setOrderData(data as TrackedOrderResult);
      }
    } catch {
      setOrderData(null);
      setErrorMsg('Failed to lookup order. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-track if both order and phone are present in URL search params
  useEffect(() => {
    const urlOrder = searchParams.get('order');
    const urlPhone = searchParams.get('phone');
    if (urlOrder && urlPhone) {
      void handleTrack();
    }
  }, [searchParams]);

  // Normalize internal dropshipping/accounting steps so customers see clear customer-facing statuses
  const normalizeCustomerStatus = (status: string): string => {
    switch (status) {
      case 'placed_with_supplier':
      case 'ordered_from_supplier':
        return 'confirmed';
      case 'courier_paid':
      case 'supplier_paid':
        return 'delivered';
      case 'rejected':
        return 'cancelled';
      default:
        return status;
    }
  };

  // Order status badge styling
  const getStatusBadge = (rawStatus: string) => {
    const status = normalizeCustomerStatus(rawStatus);
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#16A34A]/10 px-3 py-1 text-xs font-bold text-[#16A34A]">
            <CheckCircle2 className="h-4 w-4" />
            {t('track.statusDelivered')}
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#F47125]/10 px-3 py-1 text-xs font-bold text-[#F47125]">
            <Truck className="h-4 w-4" />
            {t('track.statusShipped')}
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#17263E]/10 px-3 py-1 text-xs font-bold text-[#17263E]">
            <CheckCircle2 className="h-4 w-4" />
            {t('track.statusConfirmed')}
          </span>
        );
      case 'cancelled':
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#DC2626]">
            <XCircle className="h-4 w-4" />
            {status === 'cancelled' ? t('track.statusCancelled') : t('track.statusReturned')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#F5F7FA] px-3 py-1 text-xs font-bold text-[#5B6577]">
            <Clock className="h-4 w-4" />
            {t('track.statusPending')}
          </span>
        );
    }
  };

  const getCustomerStatusLabel = (rawStatus: string): string => {
    const status = normalizeCustomerStatus(rawStatus);
    switch (status) {
      case 'delivered':
        return t('track.statusDelivered');
      case 'shipped':
        return t('track.statusShipped');
      case 'confirmed':
        return t('track.statusConfirmed');
      case 'cancelled':
        return t('track.statusCancelled');
      case 'returned':
        return t('track.statusReturned');
      default:
        return t('track.statusPending');
    }
  };

  const steps = [
    { key: 'pending', label: t('track.statusPending') },
    { key: 'confirmed', label: t('track.statusConfirmed') },
    { key: 'shipped', label: t('track.statusShipped') },
    { key: 'delivered', label: t('track.statusDelivered') },
  ];

  const normalizedOrderStatus = orderData ? normalizeCustomerStatus(orderData.status) : '';
  const currentStepIndex = orderData
    ? steps.findIndex((s) => s.key === normalizedOrderStatus)
    : -1;

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>
          {t('track.title')} — {t('brand.name')}
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        {showInvoice && orderData ? (
          <CustomerInvoice
            data={buildInvoiceFromTrackedOrder(orderData, normalizeBdPhone(phoneInput))}
            lang={lang}
            onClose={() => setShowInvoice(false)}
            closeVariant="back"
          />
        ) : (
          <>
            <Breadcrumb
              items={[
                { label: t('nav.home'), to: localizedPath('/') },
                { label: t('track.title') },
              ]}
            />

            <div className="mt-6 border-b border-[#17263E]/10 pb-6 text-center">
              <h1 className="text-2xl font-bold text-[#0F1A2C] sm:text-3xl">{t('track.title')}</h1>
              <p className="mt-1.5 text-sm text-[#5B6577]">{t('track.subtitle')}</p>
            </div>

            {/* Search Form Box */}
            <form
              onSubmit={handleTrack}
              className="mt-8 rounded-[12px] border border-[#17263E]/10 bg-white p-6 shadow-soft"
            >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('orderSuccess.orderNumber')}
              required
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              placeholder={t('track.orderNumberPlaceholder')}
              className="uppercase font-mono"
            />
            <Input
              label={t('checkout.phone')}
              type="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={t('track.phonePlaceholder')}
            />
          </div>

          {errorMsg && (
            <p className="mt-3 text-xs font-semibold text-[#DC2626] flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              type="submit"
              loading={loading}
              leftIcon={<Search className="h-4 w-4" />}
            >
              {loading ? t('track.searching') : t('track.trackButton')}
            </Button>
          </div>
        </form>

        {/* Results Box */}
        {searched && !loading && (
          <div className="mt-8">
            {orderData ? (
              <div className="rounded-[12px] border border-[#17263E]/10 bg-white p-6 sm:p-8 shadow-card space-y-8">
                {/* Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#17263E]/10 pb-5">
                  <div>
                    <span className="text-xs text-[#5B6577]">{t('orderSuccess.orderNumber')}</span>
                    <h2 className="text-xl font-bold font-mono text-[#0F1A2C]">
                      {orderData.order_number}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getStatusBadge(orderData.status)}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowInvoice(true)}
                      className="bg-[#17263E] hover:bg-[#0F1A2C] text-white"
                      leftIcon={<FileText className="h-4 w-4" />}
                    >
                      {t('track.viewInvoice')}
                    </Button>
                  </div>
                </div>

                {/* Progress Steps (if not cancelled/returned) */}
                {normalizedOrderStatus !== 'cancelled' && normalizedOrderStatus !== 'returned' && (
                  <div className="py-2">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {steps.map((step, idx) => {
                        const isDone = currentStepIndex >= idx;
                        const isCurrent = currentStepIndex === idx;
                        return (
                          <div key={step.key} className="flex flex-col items-center">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-colors ${
                                isDone
                                  ? 'bg-[#F47125] text-white'
                                  : 'bg-[#E5E9F0] text-[#5B6577]'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span
                              className={`text-[11px] sm:text-xs font-medium ${
                                isCurrent
                                  ? 'text-[#F47125] font-bold'
                                  : isDone
                                  ? 'text-[#0F1A2C]'
                                  : 'text-[#5B6577]'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Courier info if available */}
                {orderData.courier_name && (
                  <div className="rounded-[10px] border border-[#17263E]/10 bg-[#F5F7FA] p-4 text-xs space-y-1.5">
                    <h3 className="font-bold text-[#0F1A2C]">{t('track.courierInfo')}</h3>
                    <p>
                      {t('track.courierName')}: <strong>{orderData.courier_name}</strong>
                    </p>
                    {orderData.tracking_code && (
                      <p>
                        {t('track.trackingCode')}:{' '}
                        <strong className="font-mono">{orderData.tracking_code}</strong>
                      </p>
                    )}
                    {orderData.tracking_url && (
                      <a
                        href={orderData.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#F47125] hover:underline pt-1"
                      >
                        <span>{t('track.courierLink')}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* Items List */}
                <div>
                  <h3 className="text-sm font-bold text-[#0F1A2C] mb-3">
                    {t('track.orderItems')}
                  </h3>
                  <div className="divide-y divide-[#17263E]/5 rounded-[10px] border border-[#17263E]/10 overflow-hidden">
                    {orderData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 text-xs bg-white"
                      >
                        <div>
                          <p className="font-semibold text-[#0F1A2C]">{item.product_name}</p>
                          <p className="text-[#5B6577]">
                            {formatPrice(item.unit_price)} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-bold text-[#0F1A2C] tabular-nums">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Totals */}
                  <div className="mt-4 space-y-2 text-xs text-[#5B6577] border-t border-[#17263E]/10 pt-3">
                    <div className="flex justify-between">
                      <span>{t('cart.subtotal')}</span>
                      <span className="font-bold text-[#0F1A2C] tabular-nums">
                        {formatPrice(orderData.subtotal)}
                      </span>
                    </div>
                    {orderData.discount_amount > 0 && (
                      <div className="flex justify-between text-[#16A34A]">
                        <span>{t('cart.discount')}</span>
                        <span className="font-bold tabular-nums">
                          -{formatPrice(orderData.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t('cart.deliveryCharge')} ({orderData.district})</span>
                      <span className="font-bold text-[#0F1A2C] tabular-nums">
                        {formatPrice(orderData.delivery_charge)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#0F1A2C] pt-2 border-t border-[#17263E]/5">
                      <span>{t('cart.grandTotal')}</span>
                      <span className="text-[#F47125] text-base tabular-nums">
                        {formatPrice(orderData.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline status history */}
                {orderData.timeline && orderData.timeline.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-[#0F1A2C] mb-3">{t('track.timeline')}</h3>
                    <div className="space-y-3">
                      {orderData.timeline.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs">
                          <div className="mt-1 h-2 w-2 rounded-full bg-[#F47125] shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#0F1A2C]">{getCustomerStatusLabel(item.status)}</p>
                            {item.note && <p className="text-[#5B6577]">{item.note}</p>}
                            <p className="text-[10px] text-[#5B6577]/70 tabular-nums">
                              {new Date(item.created_at).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[12px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-[#DC2626] mb-3" />
                <h3 className="text-base font-bold text-[#0F1A2C]">
                  {t('track.notFoundTitle')}
                </h3>
                <p className="mt-1.5 text-xs text-[#5B6577] max-w-sm mx-auto">
                  {t('track.notFoundDesc')}
                </p>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </>
  );
};

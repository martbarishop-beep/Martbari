import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Printer, X } from 'lucide-react';
import QRCode from 'qrcode';
import { STORE_DEFAULTS, type SupportedLanguage } from '../config/constants';
import { useSettings } from '../hooks/useSettings';
import { formatDate, formatNumber, formatPrice, keepLatinDigits } from '../lib/format';
import { DEFAULT_SITE_ORIGIN, resolveCanonicalOrigin } from '../lib/seo';
import type { Order, OrderItem, TrackedOrderResult } from '../types/database';

export interface CustomerInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
}

export interface CustomerInvoiceData {
  orderNumber: string;
  createdAt?: string | null;
  status: string;
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  courierName?: string | null;
  trackingCode?: string | null;
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  total: number;
  paidAmount?: number | null;
  dueAmount?: number | null;
  items: CustomerInvoiceItem[];
}

/**
 * Strips all internal/dropshipping fields (cost_price, supplier, profit, admin notes)
 * so the Admin invoice view renders strictly customer-facing data.
 */
export function buildInvoiceFromAdminOrder(order: Order, items: OrderItem[]): CustomerInvoiceData {
  const total = Number(order.total || 0);
  const rawPaid = Number(order.payment_received_amount || 0);
  const isTerminalCancelled = order.status === 'cancelled' || order.status === 'rejected';

  let paidAmount = 0;
  let dueAmount = 0;

  if (order.payment_status === 'paid') {
    paidAmount = total;
    dueAmount = 0;
  } else if (order.payment_status === 'refunded') {
    paidAmount = 0;
    dueAmount = 0;
  } else {
    paidAmount = rawPaid > 0 ? Math.min(total, rawPaid) : 0;
    dueAmount = isTerminalCancelled ? 0 : Math.max(0, total - paidAmount);
  }

  const safeItems: CustomerInvoiceItem[] = items.map((it) => ({
    name: it.product_name,
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.selling_price ?? it.unit_price ?? 0),
  }));

  const computedSubtotal =
    Number(order.subtotal || 0) > 0
      ? Number(order.subtotal)
      : safeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return {
    orderNumber: order.order_number,
    createdAt: order.created_at,
    status: order.status,
    customerName: order.customer_name,
    phone: order.phone,
    address: order.address,
    district: order.district,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    courierName: order.courier_name,
    trackingCode: order.tracking_code,
    subtotal: computedSubtotal,
    deliveryCharge: Number(order.delivery_charge_charged ?? order.delivery_charge ?? 0),
    discountAmount: Number(order.discount_amount || 0),
    total,
    paidAmount,
    dueAmount,
    items: safeItems,
  };
}

export function buildInvoiceFromTrackedOrder(
  tracked: TrackedOrderResult,
  phone?: string | null,
): CustomerInvoiceData {
  const total = Number(tracked.total || 0);
  const isTerminalCancelled = tracked.status === 'cancelled' || tracked.status === 'rejected';

  const paidAmount = tracked.payment_status === 'paid' ? total : 0;
  const dueAmount =
    tracked.payment_status === 'paid' || tracked.payment_status === 'refunded' || isTerminalCancelled
      ? 0
      : total;

  return {
    orderNumber: tracked.order_number,
    createdAt: tracked.created_at,
    status: tracked.status,
    phone: phone || null,
    district: tracked.district,
    paymentMethod: tracked.payment_method,
    paymentStatus: tracked.payment_status,
    courierName: tracked.courier_name,
    trackingCode: tracked.tracking_code,
    subtotal: Number(tracked.subtotal || 0),
    deliveryCharge: Number(tracked.delivery_charge || 0),
    discountAmount: Number(tracked.discount_amount || 0),
    total,
    paidAmount,
    dueAmount,
    items: (tracked.items || []).map((it) => ({
      name: it.product_name,
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unit_price || 0),
    })),
  };
}

function normalizeCustomerStatus(status: string): string {
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
}

const LABELS = {
  bn: {
    invoiceTitle: 'ইনভয়েস',
    orderNo: 'অর্ডার নং',
    date: 'তারিখ',
    statusLabel: 'স্ট্যাটাস',
    billTo: 'বিল টু',
    paymentDelivery: 'পেমেন্ট ও ডেলিভারি',
    customerFallback: 'সম্মানিত গ্রাহক',
    phone: 'ফোন',
    address: 'ঠিকানা',
    district: 'জেলা',
    method: 'পেমেন্ট মাধ্যম',
    paymentStatus: 'পেমেন্ট অবস্থা',
    courier: 'কুরিয়ার',
    tracking: 'ট্র্যাকিং কোড',
    notAssigned: 'শীঘ্রই নির্ধারিত হবে',
    colSl: '#',
    colProduct: 'পণ্যের বিবরণ',
    colQty: 'পরিমাণ',
    colUnit: 'দাম',
    colTotal: 'মোট',
    subtotal: 'সাবটোটাল',
    delivery: 'ডেলিভারি চার্জ',
    discount: 'মূল্যছাড়',
    grandTotal: 'সর্বমোট',
    paid: 'পরিশোধিত',
    dueCod: 'বকেয়া / COD',
    scanTrack: 'অর্ডার ট্র্যাক করতে স্ক্যান করুন',
    thankYou: 'মার্টবাড়ি থেকে কেনাকাটার জন্য ধন্যবাদ!',
    printBtn: 'প্রিন্ট করুন',
    pdfBtn: 'PDF ডাউনলোড',
    pdfHint: 'প্রিন্ট ডায়ালগে Destination হিসেবে "Save as PDF" বেছে নিন।',
    backBtn: 'ফিরে যান',
    closeBtn: 'বন্ধ করুন',
    statuses: {
      pending: 'পেন্ডিং',
      confirmed: 'কনফার্মড',
      shipped: 'কুরিয়ারে পাঠানো',
      delivered: 'ডেলিভারি সম্পন্ন',
      cancelled: 'বাতিল',
      returned: 'রিটার্নড',
    } as Record<string, string>,
    paymentMethods: {
      cod: 'ক্যাশ অন ডেলিভারি (COD)',
      bkash: 'বিকাশ',
      nagad: 'নগদ',
      advance: 'অগ্রিম পেমেন্ট',
    } as Record<string, string>,
    paymentStatuses: {
      paid: 'পরিশোধিত',
      unpaid: 'অপরিশোধিত',
      refunded: 'রিফান্ডেড',
    } as Record<string, string>,
  },
  en: {
    invoiceTitle: 'INVOICE',
    orderNo: 'Order No',
    date: 'Date',
    statusLabel: 'Status',
    billTo: 'Bill To',
    paymentDelivery: 'Payment & Delivery',
    customerFallback: 'Valued Customer',
    phone: 'Phone',
    address: 'Address',
    district: 'District',
    method: 'Method',
    paymentStatus: 'Payment',
    courier: 'Courier',
    tracking: 'Tracking Code',
    notAssigned: 'To be assigned',
    colSl: '#',
    colProduct: 'Item Description',
    colQty: 'Qty',
    colUnit: 'Unit Price',
    colTotal: 'Total',
    subtotal: 'Subtotal',
    delivery: 'Delivery Charge',
    discount: 'Discount',
    grandTotal: 'Grand Total',
    paid: 'Paid',
    dueCod: 'Due / COD',
    scanTrack: 'Scan to track order',
    thankYou: 'Thank you for shopping with MartBari!',
    printBtn: 'Print Invoice',
    pdfBtn: 'Download PDF',
    pdfHint: 'Choose "Save as PDF" as the destination in your print dialog.',
    backBtn: 'Back',
    closeBtn: 'Close',
    statuses: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
    } as Record<string, string>,
    paymentMethods: {
      cod: 'Cash on Delivery (COD)',
      bkash: 'bKash',
      nagad: 'Nagad',
      advance: 'Advance Payment',
    } as Record<string, string>,
    paymentStatuses: {
      paid: 'Paid',
      unpaid: 'Unpaid',
      refunded: 'Refunded',
    } as Record<string, string>,
  },
};

export interface CustomerInvoiceProps {
  data: CustomerInvoiceData;
  lang: SupportedLanguage;
  onClose?: () => void;
  closeVariant?: 'back' | 'close';
  showActions?: boolean;
  allowLanguageToggle?: boolean;
}

export const CustomerInvoice: React.FC<CustomerInvoiceProps> = ({
  data,
  lang: initialLang,
  onClose,
  closeVariant = 'back',
  showActions = true,
  allowLanguageToggle = true,
}) => {
  const { settings } = useSettings();
  const [invoiceLang, setInvoiceLang] = useState<SupportedLanguage>(initialLang);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showPdfHint, setShowPdfHint] = useState(false);

  useEffect(() => {
    setInvoiceLang(initialLang);
  }, [initialLang]);

  const l = LABELS[invoiceLang];
  const orderNumberLatin = keepLatinDigits(data.orderNumber);
  const cleanPhone = data.phone ? keepLatinDigits(data.phone) : '';
  const cleanTracking = data.trackingCode ? keepLatinDigits(data.trackingCode) : '';

  const siteOrigin = useMemo(() => {
    try {
      const origin = resolveCanonicalOrigin();
      return origin || DEFAULT_SITE_ORIGIN;
    } catch {
      return DEFAULT_SITE_ORIGIN;
    }
  }, []);

  const siteHost = useMemo(() => {
    try {
      return new URL(siteOrigin).host;
    } catch {
      return 'martbari.pages.dev';
    }
  }, [siteOrigin]);

  const trackingUrl = useMemo(() => {
    const params = new URLSearchParams({ order: orderNumberLatin });
    if (cleanPhone) params.set('phone', cleanPhone);
    return `${siteOrigin}/${invoiceLang}/track-order?${params.toString()}`;
  }, [siteOrigin, invoiceLang, orderNumberLatin, cleanPhone]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(trackingUrl, {
      width: 144,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F1A2C',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [trackingUrl]);

  const triggerPrintWithTitle = (isPdf: boolean) => {
    if (typeof window === 'undefined') return;
    const prevTitle = document.title;
    document.title = `MartBari-Invoice-${orderNumberLatin}`;
    if (isPdf) {
      setShowPdfHint(true);
    }

    const restoreTitle = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        document.title = prevTitle;
      }, 1500);
    }, 60);
  };

  const storeName =
    (invoiceLang === 'bn' ? settings.store_name_bn : settings.store_name_en) ||
    STORE_DEFAULTS.brandName;
  const storePhone = keepLatinDigits(settings.phone || STORE_DEFAULTS.phone);
  const storeEmail = settings.email || STORE_DEFAULTS.email;
  const logoSrc = settings.logo_url?.trim() || '/logo-icon.png';

  const normalizedStatus = normalizeCustomerStatus(data.status);
  const statusText = l.statuses[normalizedStatus] || data.status;

  const statusBadgeStyle = (() => {
    switch (normalizedStatus) {
      case 'delivered':
        return 'border-[#16A34A]/40 bg-[#16A34A]/10 text-[#15803D]';
      case 'shipped':
        return 'border-[#F47125]/40 bg-[#F47125]/10 text-[#C2410C]';
      case 'confirmed':
        return 'border-[#17263E]/30 bg-[#17263E]/10 text-[#17263E]';
      case 'cancelled':
      case 'returned':
        return 'border-[#DC2626]/40 bg-[#DC2626]/10 text-[#B91C1C]';
      default:
        return 'border-[#64748B]/40 bg-[#F1F5F9] text-[#334155]';
    }
  })();

  const paymentMethodLabel =
    l.paymentMethods[data.paymentMethod?.toLowerCase()] || data.paymentMethod.toUpperCase();
  const paymentStatusLabel =
    l.paymentStatuses[data.paymentStatus?.toLowerCase()] || data.paymentStatus;

  const paidAmount = Math.max(0, Number(data.paidAmount ?? (data.paymentStatus === 'paid' ? data.total : 0)));
  const dueAmount = Math.max(
    0,
    Number(
      data.dueAmount ??
        (data.paymentStatus === 'paid' ||
        data.paymentStatus === 'refunded' ||
        normalizedStatus === 'cancelled'
          ? 0
          : data.total - paidAmount),
    ),
  );

  const formattedDate = data.createdAt
    ? formatDate(data.createdAt, invoiceLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : formatDate(new Date(), invoiceLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  return (
    <div
      lang={invoiceLang}
      className={`mx-auto w-full max-w-[800px] print:max-w-none print:w-full print:mx-0 ${
        invoiceLang === 'bn' ? 'font-bangla' : 'font-english'
      }`}
    >
      {/* Top Action Bar (Hidden in Print) */}
      {showActions && (
        <div className="mb-3 space-y-2 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#17263E]/12 bg-white px-3.5 py-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#17263E]/15 bg-[#FAF8F5] px-3 py-1.5 text-xs font-semibold text-[#0F1A2C] hover:bg-[#EEF2F6] transition-colors cursor-pointer"
                >
                  {closeVariant === 'close' ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowLeft className="h-3.5 w-3.5" />
                  )}
                  <span>{closeVariant === 'close' ? l.closeBtn : l.backBtn}</span>
                </button>
              )}

              {allowLanguageToggle && (
                <div
                  role="group"
                  aria-label="Invoice Language"
                  className="inline-flex items-center rounded-lg border border-[#17263E]/12 bg-[#F5F7FA] p-0.5 text-[11px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => setInvoiceLang('bn')}
                    className={`rounded-md px-2 py-1 transition-colors cursor-pointer ${
                      invoiceLang === 'bn'
                        ? 'bg-[#17263E] text-white'
                        : 'text-[#5B6577] hover:text-[#0F1A2C]'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceLang('en')}
                    className={`rounded-md px-2 py-1 transition-colors cursor-pointer ${
                      invoiceLang === 'en'
                        ? 'bg-[#17263E] text-white'
                        : 'text-[#5B6577] hover:text-[#0F1A2C]'
                    }`}
                  >
                    EN
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => triggerPrintWithTitle(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#17263E] bg-[#17263E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0F1A2C] transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{l.printBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerPrintWithTitle(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F47125] bg-[#F47125] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#D95F18] transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{l.pdfBtn}</span>
              </button>
            </div>
          </div>

          {showPdfHint && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#F47125]/30 bg-[#FFF4EC] px-3 py-2 text-xs text-[#0F1A2C]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#F47125] shrink-0" />
                <span>{l.pdfHint}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfHint(false)}
                aria-label={l.closeBtn}
                className="text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Printable Invoice Card */}
      <article className="invoice-sheet overflow-hidden rounded-xl border border-[#17263E]/15 bg-white text-[#0F1A2C] shadow-[0_6px_24px_-8px_rgba(15,26,44,0.12)] print:rounded-none print:border-0 print:shadow-none">
        {/* Top Brand Accent Bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#17263E] via-[#F47125] to-[#F47125]" />

        {/* 1. Compact Header Row */}
        <header className="invoice-no-break flex items-start justify-between gap-3 border-b border-[#17263E]/12 px-4 py-3.5 sm:px-6 sm:py-4 print:px-0 print:pt-2.5 print:pb-3">
          {/* Store Logo + Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={logoSrc}
              alt={storeName}
              width={36}
              height={36}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-icon.png';
              }}
              className="h-9 w-9 shrink-0 rounded-md object-contain"
            />
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold tracking-tight text-[#17263E] leading-tight">
                {storeName}
              </div>
              <div className="text-[11px] text-[#5B6577] leading-snug truncate">
                {siteHost} · {storePhone}
              </div>
            </div>
          </div>

          {/* Invoice Title + Number + Date + Status */}
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-[#F47125] leading-none">
                {l.invoiceTitle}
              </h1>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold leading-tight ${statusBadgeStyle}`}
              >
                {statusText}
              </span>
            </div>
            <div className="mt-1 text-xs font-bold font-mono text-[#0F1A2C] tabular-nums">
              #{orderNumberLatin}
            </div>
            <div className="text-[11px] text-[#5B6577] tabular-nums">
              {l.date}: {formattedDate}
            </div>
          </div>
        </header>

        {/* 2. Two-Column Customer & Delivery Info Row */}
        <section className="invoice-no-break grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 border-b border-[#17263E]/12 bg-[#FAF8F5] px-4 py-3 sm:px-6 print:bg-white print:px-0 print:py-2.5 text-xs">
          {/* Left: Bill To */}
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#17263E] mb-1">
              {l.billTo}
            </h2>
            <p className="font-bold text-[#0F1A2C] leading-snug">
              {data.customerName?.trim() || l.customerFallback}
            </p>
            {cleanPhone && (
              <p className="text-[#0F1A2C] tabular-nums">
                <span className="text-[#5B6577]">{l.phone}:</span>{' '}
                <span className="font-mono font-semibold">{cleanPhone}</span>
              </p>
            )}
            {(data.address || data.district) && (
              <p className="text-[#5B6577] leading-snug break-words">
                <span className="text-[#5B6577]">{l.address}:</span>{' '}
                <span className="text-[#0F1A2C]">
                  {[data.address?.trim(), data.district?.trim()].filter(Boolean).join(', ')}
                </span>
              </p>
            )}
          </div>

          {/* Right: Payment & Delivery */}
          <div className="space-y-0.5 sm:border-l sm:border-[#17263E]/10 sm:pl-4 print:border-l print:border-[#17263E]/12 print:pl-4 min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#17263E] mb-1">
              {l.paymentDelivery}
            </h2>
            <p className="text-[#5B6577]">
              {l.method}:{' '}
              <strong className="font-semibold text-[#0F1A2C]">{paymentMethodLabel}</strong>
            </p>
            <p className="text-[#5B6577]">
              {l.paymentStatus}:{' '}
              <strong
                className={`font-semibold ${
                  data.paymentStatus === 'paid' ? 'text-[#15803D]' : 'text-[#0F1A2C]'
                }`}
              >
                {paymentStatusLabel}
              </strong>
            </p>
            <p className="text-[#5B6577]">
              {l.courier}:{' '}
              <strong className="font-semibold text-[#0F1A2C]">
                {data.courierName?.trim() || l.notAssigned}
              </strong>
            </p>
            {cleanTracking && (
              <p className="text-[#5B6577]">
                {l.tracking}:{' '}
                <strong className="font-mono font-semibold text-[#0F1A2C]">
                  {cleanTracking}
                </strong>
              </p>
            )}
          </div>
        </section>

        {/* 3. Compact Items Table (Responsive without horizontal scroll) */}
        <section className="px-4 py-3 sm:px-6 print:px-0 print:py-2.5">
          <table className="invoice-table w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="bg-[#17263E] text-white border border-[#17263E]">
                <th className="w-7 sm:w-9 py-1.5 px-1.5 sm:px-2 text-center font-semibold text-[11px]">
                  {l.colSl}
                </th>
                <th className="py-1.5 px-2 text-left font-semibold text-[11px]">
                  {l.colProduct}
                </th>
                <th className="w-11 sm:w-14 py-1.5 px-1.5 text-center font-semibold text-[11px]">
                  {l.colQty}
                </th>
                <th className="w-[66px] sm:w-24 py-1.5 px-1.5 sm:px-2 text-right font-semibold text-[11px]">
                  {l.colUnit}
                </th>
                <th className="w-[74px] sm:w-24 py-1.5 px-1.5 sm:px-2 text-right font-semibold text-[11px]">
                  {l.colTotal}
                </th>
              </tr>
            </thead>
            <tbody className="border-x border-[#17263E]/12">
              {data.items.map((item, idx) => {
                const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
                return (
                  <tr
                    key={`${item.name}-${idx}`}
                    className="border-b border-[#17263E]/10 even:bg-[#FAF8F5] print:even:bg-[#F8FAFC]"
                  >
                    <td className="py-1.5 px-1.5 sm:px-2 text-center text-[#5B6577] tabular-nums align-top">
                      {formatNumber(idx + 1, invoiceLang)}
                    </td>
                    <td className="py-1.5 px-2 text-[#0F1A2C] font-medium align-top break-words">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            aria-hidden="true"
                            width={24}
                            height={24}
                            className="hidden sm:block print:block h-6 w-6 shrink-0 rounded border border-[#17263E]/10 object-cover"
                          />
                        )}
                        <span className="leading-snug break-words">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-1.5 text-center text-[#0F1A2C] font-semibold tabular-nums align-top">
                      {formatNumber(item.quantity, invoiceLang)}
                    </td>
                    <td className="py-1.5 px-1.5 sm:px-2 text-right text-[#5B6577] tabular-nums whitespace-nowrap align-top">
                      {formatPrice(item.unitPrice, invoiceLang)}
                    </td>
                    <td className="py-1.5 px-1.5 sm:px-2 text-right font-bold text-[#0F1A2C] tabular-nums whitespace-nowrap align-top">
                      {formatPrice(lineTotal, invoiceLang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* 4. Compact Bottom Summary Box + QR Code */}
        <section className="invoice-summary-box flex flex-col-reverse sm:flex-row print:flex-row items-stretch sm:items-end print:items-end justify-between gap-3 px-4 pb-3.5 sm:px-6 sm:pb-4 print:px-0 print:pb-3">
          {/* Compact QR Code */}
          <div className="flex items-center gap-2.5 self-start sm:self-end print:self-end pt-1">
            {qrDataUrl && (
              <div className="rounded border border-[#17263E]/15 bg-white p-1 shrink-0">
                <img
                  src={qrDataUrl}
                  alt={`QR ${orderNumberLatin}`}
                  width={64}
                  height={64}
                  className="block h-14 w-14 sm:h-16 sm:w-16 print:h-16 print:w-16"
                />
              </div>
            )}
            <div className="text-[10px] leading-tight text-[#5B6577] space-y-0.5">
              <p className="font-semibold text-[#0F1A2C]">{l.scanTrack}</p>
              <p className="font-mono text-[#5B6577]">#{orderNumberLatin}</p>
              <p className="text-[#5B6577]">{siteHost}</p>
            </div>
          </div>

          {/* Right-Aligned Summary Box */}
          <div className="w-full sm:w-64 print:w-64 rounded-lg border border-[#17263E]/15 overflow-hidden text-xs">
            <div className="divide-y divide-[#17263E]/10 bg-white">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[#5B6577]">{l.subtotal}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">
                  {formatPrice(data.subtotal, invoiceLang)}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[#5B6577]">{l.delivery}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">
                  {formatPrice(data.deliveryCharge, invoiceLang)}
                </span>
              </div>

              {data.discountAmount > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 text-[#15803D]">
                  <span>{l.discount}</span>
                  <span className="font-semibold tabular-nums">
                    -{formatPrice(data.discountAmount, invoiceLang)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between bg-[#FFF4EC] px-3 py-2 border-y border-[#F47125]/35">
                <span className="font-bold text-[#0F1A2C]">{l.grandTotal}</span>
                <span className="text-sm font-extrabold text-[#F47125] tabular-nums">
                  {formatPrice(data.total, invoiceLang)}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[#5B6577]">{l.paid}</span>
                <span className="font-semibold text-[#15803D] tabular-nums">
                  {formatPrice(paidAmount, invoiceLang)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-[#FAF8F5] print:bg-white px-3 py-1.5">
                <span className="font-bold text-[#0F1A2C]">{l.dueCod}</span>
                <span className="font-bold text-[#0F1A2C] tabular-nums">
                  {formatPrice(dueAmount, invoiceLang)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Single-Line Footer */}
        <footer className="invoice-no-break flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[#17263E]/12 bg-[#FAF8F5] print:bg-white px-4 py-2.5 sm:px-6 print:px-0 print:pt-2 print:pb-0 text-[11px] text-[#5B6577]">
          <span className="font-semibold text-[#0F1A2C]">{l.thankYou}</span>
          <span className="tabular-nums">
            {storePhone} · {storeEmail} · {siteHost}
          </span>
        </footer>
      </article>
    </div>
  );
};

import React from 'react';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { cn } from '../../lib/utils';
import type { OrderStatus, PaymentStatus, SupplierOrderStatus } from '../../types';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | SupplierOrderStatus | string;
  type?: 'order' | 'payment' | 'supplier';
  className?: string;
}

const ORDER_STATUS_CLASSES: Record<string, { bg: string; text: string; key: string }> = {
  pending: { bg: 'bg-[#F5F7FA] border-[#17263E]/15', text: 'text-[#5B6577]', key: 'status.pending' },
  confirmed: { bg: 'bg-[#17263E]/10 border-[#17263E]/20', text: 'text-[#17263E]', key: 'status.confirmed' },
  placed_with_supplier: {
    bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25',
    text: 'text-[#7C3AED]',
    key: 'status.placed_with_supplier',
  },
  ordered_from_supplier: {
    bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25',
    text: 'text-[#7C3AED]',
    key: 'status.ordered_from_supplier',
  },
  shipped: { bg: 'bg-[#F47125]/10 border-[#F47125]/25', text: 'text-[#D95F18]', key: 'status.shipped' },
  delivered: { bg: 'bg-[#16A34A]/10 border-[#16A34A]/25', text: 'text-[#16A34A]', key: 'status.delivered' },
  courier_paid: { bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700', key: 'status.courier_paid' },
  supplier_paid: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', key: 'status.supplier_paid' },
  cancelled: { bg: 'bg-[#DC2626]/10 border-[#DC2626]/25', text: 'text-[#DC2626]', key: 'status.cancelled' },
  rejected: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', key: 'status.rejected' },
  returned: { bg: 'bg-[#DC2626]/10 border-[#DC2626]/25', text: 'text-[#DC2626]', key: 'status.returned' },
};

const PAYMENT_STATUS_CLASSES: Record<string, { bg: string; text: string; key: string }> = {
  unpaid: { bg: 'bg-[#DC2626]/10 border-[#DC2626]/25', text: 'text-[#DC2626]', key: 'status.unpaid' },
  paid: { bg: 'bg-[#16A34A]/10 border-[#16A34A]/25', text: 'text-[#16A34A]', key: 'status.paid' },
  refunded: { bg: 'bg-[#F5F7FA] border-[#17263E]/20', text: 'text-[#5B6577]', key: 'status.refunded' },
};

const SUPPLIER_STATUS_CLASSES: Record<string, { bg: string; text: string; key: string }> = {
  not_ordered: { bg: 'bg-[#F5F7FA] border-[#17263E]/15', text: 'text-[#5B6577]', key: 'status.not_ordered' },
  ordered: { bg: 'bg-[#F47125]/10 border-[#F47125]/25', text: 'text-[#D95F18]', key: 'status.ordered' },
  placed: { bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25', text: 'text-[#7C3AED]', key: 'status.placed_with_supplier' },
  dispatched: { bg: 'bg-[#F47125]/10 border-[#F47125]/25', text: 'text-[#D95F18]', key: 'status.shipped' },
  delivered: { bg: 'bg-[#16A34A]/10 border-[#16A34A]/25', text: 'text-[#16A34A]', key: 'status.delivered' },
  received: { bg: 'bg-[#16A34A]/10 border-[#16A34A]/25', text: 'text-[#16A34A]', key: 'status.received' },
  returned: { bg: 'bg-[#DC2626]/10 border-[#DC2626]/25', text: 'text-[#DC2626]', key: 'status.returned' },
  cancelled: { bg: 'bg-[#DC2626]/10 border-[#DC2626]/25', text: 'text-[#DC2626]', key: 'status.cancelled' },
  failed: { bg: 'bg-[#DC2626]/10 border-[#DC2626]/25', text: 'text-[#DC2626]', key: 'status.failed' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'order',
  className,
}) => {
  const { at } = useAdminLanguage();

  const map =
    type === 'payment'
      ? PAYMENT_STATUS_CLASSES
      : type === 'supplier'
      ? SUPPLIER_STATUS_CLASSES
      : ORDER_STATUS_CLASSES;

  const conf = map[status];
  const bg = conf?.bg ?? 'bg-[#F5F7FA] border-[#17263E]/10';
  const text = conf?.text ?? 'text-[#5B6577]';
  const label = conf ? at(conf.key) : status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] border px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap',
        bg,
        text,
        className,
      )}
    >
      {label}
    </span>
  );
};

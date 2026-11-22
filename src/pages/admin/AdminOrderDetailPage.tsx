import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Truck,
  Copy,
  Printer,
  CheckCircle2,
  Clock,
  Ban,
  DollarSign,
  AlertTriangle,
  Send,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import {
  Order,
  OrderItem,
  OrderStatusHistory,
  Customer,
  OrderStatus,
  PaymentStatus,
  Supplier,
} from '../../types/database';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { at, formatAdminPrice, formatAdminDate } = useAdminLanguage();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});

  // Status transition state
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Payment edit state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Courier edit state
  const [courierName, setCourierName] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [isSavingCourier, setIsSavingCourier] = useState(false);

  // Admin notes
  const [adminNote, setAdminNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Block customer dialog
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const fetchOrderDetails = async () => {
    if (!supabase || !id) return;
    setLoading(true);
    try {
      // 1. Fetch Order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      if (orderErr) throw orderErr;
      const ord = orderData as Order;
      setOrder(ord);
      setPaymentStatus(ord.payment_status);
      setSenderNumber(ord.payment_sender_number || '');
      setTrxId(ord.payment_trx_id || '');
      setCourierName(ord.courier_name || '');
      setTrackingCode(ord.tracking_code || '');
      setTrackingUrl(ord.tracking_url || '');
      setAdminNote(ord.admin_note || '');

      // 2. Fetch Order Items
      const { data: itemData } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);
      setItems((itemData || []) as OrderItem[]);

      // 3. Fetch History
      const { data: histData } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });
      setHistory((histData || []) as OrderStatusHistory[]);

      // 4. Fetch Customer info if phone exists
      if (ord.phone) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', ord.phone)
          .maybeSingle();
        if (custData) setCustomer(custData as Customer);
      }

      // 5. Fetch Suppliers for dropshipping
      const { data: suppData } = await supabase.from('suppliers').select('*');
      if (suppData) {
        const sMap: Record<string, Supplier> = {};
        suppData.forEach((s) => {
          sMap[s.id] = s as Supplier;
        });
        setSuppliers(sMap);
      }
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Failed to load order',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrderDetails();
  }, [id]);

  // Update Status handler (with inventory restock on cancel/return)
  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!supabase || !order) return;
    setIsUpdatingStatus(true);
    try {
      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updErr) throw updErr;

      // Log status transition history
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: newStatus,
        note: statusNote.trim() || `Status changed to ${newStatus}`,
        changed_by: user?.id || null,
      });

      // If cancelling or returning, restore stock back to products table
      if (
        (newStatus === 'cancelled' || newStatus === 'returned') &&
        order.status !== 'cancelled' &&
        order.status !== 'returned'
      ) {
        for (const item of items) {
          if (item.product_id) {
            const { data: prod } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();
            if (prod) {
              await supabase
                .from('products')
                .update({ stock: (prod.stock || 0) + item.quantity })
                .eq('id', item.product_id);
            }
          }
        }
      }

      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      setStatusNote('');
      showToast({
        type: 'success',
        title: 'Order Status Updated',
        description: `Order ${order.order_number} marked as ${newStatus}.`,
      });
      void fetchOrderDetails();

      await logActivity('UPDATE_ORDER_STATUS', 'orders', order.id, {
        from: order.status,
        to: newStatus,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save payment details
  const handleSavePayment = async () => {
    if (!supabase || !order) return;
    setIsSavingPayment(true);
    try {
      const payload = {
        payment_status: paymentStatus,
        payment_sender_number: senderNumber.trim() || null,
        payment_trx_id: trxId.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('orders').update(payload).eq('id', order.id);
      if (error) throw error;
      setOrder((prev) => (prev ? { ...prev, ...payload } : null));
      showToast({ type: 'success', title: 'Payment details saved' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Payment save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Save courier & tracking details
  const handleSaveCourier = async () => {
    if (!supabase || !order) return;
    setIsSavingCourier(true);
    try {
      // Auto build courier tracking URL if standard BD courier
      let autoUrl = trackingUrl.trim();
      if (!autoUrl && trackingCode.trim()) {
        const c = courierName.toLowerCase();
        if (c.includes('steadfast')) {
          autoUrl = `https://steadfast.com.bd/tracking?consignment_id=${trackingCode.trim()}`;
        } else if (c.includes('pathao')) {
          autoUrl = `https://pathao.com/courier/tracking/?consignment_id=${trackingCode.trim()}`;
        } else if (c.includes('redx')) {
          autoUrl = `https://redx.com.bd/tracking/${trackingCode.trim()}`;
        }
      }

      const payload = {
        courier_name: courierName.trim() || null,
        tracking_code: trackingCode.trim() || null,
        tracking_url: autoUrl || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('orders').update(payload).eq('id', order.id);
      if (error) throw error;
      setTrackingUrl(autoUrl);
      setOrder((prev) => (prev ? { ...prev, ...payload } : null));
      showToast({ type: 'success', title: 'Courier information saved' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Courier save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingCourier(false);
    }
  };

  // Save admin notes
  const handleSaveAdminNote = async () => {
    if (!supabase || !order) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ admin_note: adminNote.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      showToast({ type: 'success', title: 'Admin note saved' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Note save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Block customer action
  const handleBlockCustomer = async () => {
    if (!supabase || !order) return;
    try {
      if (customer) {
        await supabase
          .from('customers')
          .update({
            is_blocked: true,
            block_reason: blockReason.trim() || 'Blocked by staff',
          })
          .eq('id', customer.id);
      } else {
        await supabase.from('customers').insert({
          name: order.customer_name,
          phone: order.phone,
          district: order.district,
          default_address: order.address,
          is_blocked: true,
          block_reason: blockReason.trim() || 'Blocked by staff',
        });
      }

      showToast({
        type: 'warning',
        title: 'Customer Blocked',
        description: `${order.phone} has been added to the blocked list.`,
      });
      setIsBlockModalOpen(false);
      void fetchOrderDetails();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Block failed', description: (err as Error)?.message });
    }
  };

  // Generate Dropshipping Supplier WhatsApp Order Message
  const copySupplierOrderMessage = (supplierIdKey: string | null) => {
    if (!order) return;
    const relevantItems = items.filter((it) => (supplierIdKey ? it.supplier_id === supplierIdKey : true));
    const supp = supplierIdKey ? suppliers[supplierIdKey] : null;

    const itemsText = relevantItems
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product_name} - Qty: ${it.quantity} (Ref SKU: ${it.product_id || 'N/A'})`
      )
      .join('\n');

    const msg = `*NEW DROPSHIP ORDER - MARTBARI*
Order ID: #${order.order_number}

*Items to Ship:*
${itemsText}

*Customer Shipping Address:*
Recipient Name: ${order.customer_name}
Phone: ${order.phone}
Address: ${order.address}
District: ${order.district}
COD Amount to Collect: ৳${order.total}

Please confirm order placement and provide tracking number once dispatched. Thank you!`;

    navigator.clipboard.writeText(msg);
    showToast({
      type: 'success',
      title: 'Copied to Clipboard!',
      description: `Formatted WhatsApp message ready to paste to ${supp?.name || 'Supplier'}.`,
    });
  };

  // Mark all items as ordered from supplier
  const handleMarkSupplierOrdered = async () => {
    if (!supabase || !order) return;
    try {
      await supabase
        .from('order_items')
        .update({ supplier_order_status: 'ordered' })
        .eq('order_id', order.id);

      await handleUpdateStatus('ordered_from_supplier');
      showToast({
        type: 'success',
        title: 'Supplier Order Recorded',
        description: 'All items marked as ordered from supplier.',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to update', description: (err as Error)?.message });
    }
  };

  // Customer Message Copy Templates (Bilingual)
  const copyCustomerConfirmationMsg = () => {
    if (!order) return;
    const msg = `আসসালামু আলাইকুম ${order.customer_name}, মার্টবাড়ি (MartBari) থেকে আপনার #${order.order_number} অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে। মোট বিল: ৳${order.total} (ক্যাশ অন ডেলিভারি)। দ্রুততম সময়ে ডেলিভারি পেতে আমাদের সাথেই থাকুন। হেল্পলাইন: 01700000000`;
    navigator.clipboard.writeText(msg);
    showToast({ type: 'success', title: 'Copied Confirmation SMS/WhatsApp' });
  };

  const copyCustomerShippedMsg = () => {
    if (!order) return;
    const msg = `প্রিয় ${order.customer_name}, আপনার মার্টবাড়ি অর্ডার #${order.order_number} কুরিয়ারে (${order.courier_name || 'কুরিয়ার'}) হস্তান্তর করা হয়েছে। ট্র্যাকিং কোড: ${order.tracking_code || 'শীঘ্রই এসএমএস করা হবে'}। ইনবক্সে থাকুন। ধন্যবাদ!`;
    navigator.clipboard.writeText(msg);
    showToast({ type: 'success', title: 'Copied Shipped SMS/WhatsApp' });
  };

  // Profit calculation
  const totalCost = items.reduce((sum, it) => sum + (it.cost_price || 0) * (it.quantity || 1), 0);
  const totalRevenue = order?.subtotal || 0;
  const netOrderProfit = totalRevenue - totalCost;

  if (loading || !order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" className="text-[#F47125]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E4EA] bg-white text-[#5B6577] hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#0F1A2C] font-mono">
                {at('orderDetail.orderLabel', { num: order.order_number })}
              </h1>
              <StatusBadge type="order" status={order.status} />
              <StatusBadge type="payment" status={order.payment_status} />
            </div>
            <p className="text-xs text-[#5B6577]">
              {at('orderDetail.placedOn', { date: formatAdminDate(order.created_at, true) })} • {at('orderDetail.source')}:{' '}
              <span className="font-semibold uppercase">{order.source}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" />
            {at('orderDetail.printInvoice')}
          </Button>
        </div>
      </div>

      {/* Status Transition Action Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5B6577]">
            {at('orderDetail.updateStatusTitle')}
          </span>
          <span className="text-xs text-[#5B6577]">
            {at('orderDetail.current')} <strong className="text-[#0F1A2C]">{at(`status.${order.status}`)}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { status: 'confirmed', label: at('orderDetail.step1'), color: 'bg-blue-600 hover:bg-blue-700' },
              {
                status: 'ordered_from_supplier',
                label: at('orderDetail.step2'),
                color: 'bg-purple-600 hover:bg-purple-700',
              },
              { status: 'shipped', label: at('orderDetail.step3'), color: 'bg-indigo-600 hover:bg-indigo-700' },
              { status: 'delivered', label: at('orderDetail.step4'), color: 'bg-emerald-600 hover:bg-emerald-700' },
              { status: 'cancelled', label: at('orderDetail.cancelOrder'), color: 'bg-red-600 hover:bg-red-700' },
              { status: 'returned', label: at('orderDetail.returnOrder'), color: 'bg-gray-600 hover:bg-gray-700' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.status}
              type="button"
              disabled={isUpdatingStatus || order.status === btn.status}
              onClick={() => void handleUpdateStatus(btn.status)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-40 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Optional note with status change */}
        <div className="pt-2">
          <input
            type="text"
            placeholder={at('orderDetail.auditPlaceholder')}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full rounded-xl border border-[#E1E4EA] px-3 py-1.5 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Order Items & Dropshipping Fulfillment */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items Table */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#E1E4EA] bg-[#F8FAFC] px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F1A2C]">{at('orderDetail.orderedItems', { count: items.length })}</h2>
              <div className="text-xs font-semibold text-emerald-600 tabular-nums">
                {at('orderDetail.netProfit')} {formatAdminPrice(netOrderProfit)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">{at('orderDetail.col.item')}</th>
                    <th className="py-2.5 px-4 font-semibold">{at('orderDetail.col.price')}</th>
                    <th className="py-2.5 px-4 font-semibold">{at('orderDetail.col.cost')}</th>
                    <th className="py-2.5 px-4 font-semibold">{at('orderDetail.col.qty')}</th>
                    <th className="py-2.5 px-4 font-semibold">{at('orderDetail.col.total')}</th>
                    <th className="py-2.5 px-4 font-semibold">{at('orderDetail.col.profit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {items.map((item) => {
                    const lineRevenue = item.unit_price * item.quantity;
                    const lineCost = (item.cost_price || 0) * item.quantity;
                    const lineProfit = lineRevenue - lineCost;

                    return (
                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F1A2C]">{item.product_name}</div>
                          {item.supplier_id && (
                            <div className="text-[11px] text-[#5B6577]">
                              {at('products.col.supplier')}: {suppliers[item.supplier_id]?.name || '—'}
                            </div>
                          )}
                          <div className="mt-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                item.supplier_order_status === 'ordered'
                                  ? 'bg-purple-50 text-purple-700'
                                  : item.supplier_order_status === 'received'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {at('products.col.supplier')}: {at(`status.${item.supplier_order_status}`)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F1A2C] tabular-nums">
                          {formatAdminPrice(item.unit_price)}
                        </td>
                        <td className="py-3 px-4 text-[#5B6577] tabular-nums">
                          {formatAdminPrice(item.cost_price || 0)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0F1A2C]">{item.quantity}</td>
                        <td className="py-3 px-4 font-bold text-[#0F1A2C] tabular-nums">
                          {formatAdminPrice(lineRevenue)}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600 tabular-nums">
                          {formatAdminPrice(lineProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="border-t border-[#E1E4EA] bg-[#F8FAFC] p-4 text-xs space-y-1.5">
              <div className="flex justify-between text-[#5B6577]">
                <span>{at('orderDetail.subtotal')}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">{formatAdminPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5B6577]">
                <span>{at('orderDetail.deliveryCharge')}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">{formatAdminPrice(order.delivery_charge)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-[#F47125]">
                  <span>{at('orderDetail.discount', { code: order.coupon_code || 'Coupon' })}</span>
                  <span className="font-semibold tabular-nums">-{formatAdminPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E1E4EA] text-sm font-black text-[#0F1A2C]">
                <span>{at('orderDetail.totalAmount')}</span>
                <span className="text-base text-[#F47125] tabular-nums">{formatAdminPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Dropshipping Fulfillment Card */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-700" />
                <h2 className="text-sm font-bold text-purple-950 uppercase tracking-wider">
                  {at('orderDetail.dropshipTitle')}
                </h2>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleMarkSupplierOrdered}
                className="bg-purple-700 text-white hover:bg-purple-800"
              >
                {at('orderDetail.markSupplierOrdered')}
              </Button>
            </div>

            <p className="text-xs text-purple-900">
              {at('orderDetail.dropshipDesc')}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copySupplierOrderMessage(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-white px-3 py-1.5 text-xs font-bold text-purple-900 shadow-xs hover:bg-purple-50"
              >
                <Copy className="h-3.5 w-3.5 text-purple-600" />
                {at('orderDetail.copySupplierMsg')}
              </button>
            </div>
          </div>

          {/* Customer Message Automation (Bilingual SMS/WhatsApp) */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.smsTitle')}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={copyCustomerConfirmationMsg}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4EA] bg-white px-3 py-1.5 font-semibold text-[#0F1A2C] hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5 text-[#F47125]" />
                {at('orderDetail.copyConfirmSms')}
              </button>

              <button
                type="button"
                onClick={copyCustomerShippedMsg}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4EA] bg-white px-3 py-1.5 font-semibold text-[#0F1A2C] hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5 text-indigo-600" />
                {at('orderDetail.copyShippedSms')}
              </button>
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('orderDetail.timelineTitle')}
            </h2>
            <div className="space-y-3 text-xs">
              {history.map((h, i) => (
                <div key={h.id || i} className="flex items-start gap-3 border-l-2 border-[#F47125] pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-[#0F1A2C]">
                        {at(`status.${h.status}`)}
                      </span>
                      <span className="text-[11px] text-[#5B6577]">
                        {formatAdminDate(h.created_at, true)}
                      </span>
                    </div>
                    {h.note && <p className="text-[#5B6577] mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer Details, Courier, and Payment */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.customerProfile')}
              </h2>
              {customer?.is_blocked ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  {at('orderDetail.blockedBadge')}
                </span>
              ) : null}
            </div>

            <div>
              <div className="font-bold text-sm text-[#0F1A2C]">{order.customer_name}</div>
              <div className="text-xs font-mono text-[#5B6577]">{order.phone}</div>
              {order.email && <div className="text-xs text-[#5B6577]">{order.email}</div>}
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`tel:${order.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E1E4EA] bg-white py-2 text-xs font-bold text-[#0F1A2C] hover:bg-gray-50"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                {at('orderDetail.callCustomer')}
              </a>
              <a
                href={`https://wa.me/88${order.phone.replace(/^0/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp
              </a>
            </div>

            {/* Address */}
            <div className="pt-2 border-t border-[#F1F3F5] text-xs">
              <div className="font-semibold text-[#0F1A2C]">{at('orderDetail.deliveryAddress')}</div>
              <p className="text-[#5B6577] mt-0.5">{order.address}</p>
              <div className="mt-1 font-bold text-[#F47125]">{at('orderDetail.districtLabel')} {order.district}</div>
            </div>

            {/* Customer order statistics */}
            {customer && (
              <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-[#5B6577] flex justify-between">
                <div>
                  {at('orderDetail.lifetimeOrders')} <strong className="text-[#0F1A2C]">{customer.total_orders}</strong>
                </div>
                <div>
                  {at('orderDetail.spentLabel')} <strong className="text-[#0F1A2C] tabular-nums">{formatAdminPrice(customer.total_spent)}</strong>
                </div>
              </div>
            )}

            {/* Block Customer toggle */}
            {!customer?.is_blocked && (
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline pt-1"
              >
                <Ban className="h-3 w-3" /> {at('orderDetail.blockPhone')}
              </button>
            )}
          </div>

          {/* Courier & Shipping Card */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.courierTitle')}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSavingCourier}
                onClick={handleSaveCourier}
              >
                {isSavingCourier ? at('common.saving') : at('common.save')}
              </Button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('orderDetail.courierService')}
              </label>
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="">{at('orderDetail.selectCourier')}</option>
                <option value="Steadfast Courier">Steadfast Courier</option>
                <option value="Pathao Courier">Pathao Courier</option>
                <option value="RedX">RedX Logistics</option>
                <option value="Paperfly">Paperfly</option>
                <option value="Sundarban Courier">Sundarban Courier</option>
                <option value="SA Paribahan">SA Paribahan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('orderDetail.trackingCode')}
              </label>
              <Input
                type="text"
                placeholder="e.g. STF-123456"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {trackingUrl && (
              <div>
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#F47125] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {at('orderDetail.liveTracking')}
                </a>
              </div>
            )}
          </div>

          {/* Payment Details Card */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.paymentTitle')}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSavingPayment}
                onClick={handleSavePayment}
              >
                {isSavingPayment ? at('common.saving') : at('common.save')}
              </Button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('orderDetail.paymentTitle')}
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="unpaid">{at('status.unpaid')}</option>
                <option value="paid">{at('status.paid')}</option>
                <option value="refunded">{at('status.refunded')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('orderDetail.senderNumber')}
              </label>
              <Input
                type="text"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('orderDetail.trxId')}
              </label>
              <Input
                type="text"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                placeholder="e.g. 9J28DA10K"
                className="font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Internal Staff Notes */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.staffNoteTitle')}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSavingNote}
                onClick={handleSaveAdminNote}
              >
                {isSavingNote ? at('common.saving') : at('common.save')}
              </Button>
            </div>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={at('orderDetail.staffNotePlaceholder')}
              className="w-full rounded-xl border border-[#E1E4EA] p-2.5 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Block Customer Confirmation Dialog */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> {at('orderDetail.blockModalTitle')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {order.phone}
            </p>
            <input
              type="text"
              placeholder={at('orderDetail.blockReasonPlaceholder')}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full rounded-xl border border-[#E1E4EA] p-2 text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsBlockModalOpen(false)}>
                {at('common.cancel')}
              </Button>
              <Button size="sm" className="bg-red-600 text-white" onClick={handleBlockCustomer}>
                {at('orderDetail.confirmBlock')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

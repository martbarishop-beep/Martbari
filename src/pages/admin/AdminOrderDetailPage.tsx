import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Calculator,
  Copy,
  Edit2,
  ExternalLink,
  MessageCircle,
  Phone,
  Printer,
  Truck,
} from 'lucide-react';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { isNonNegativeNumber } from '../../lib/validation';
import type {
  Courier,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PaymentStatus,
  Supplier,
} from '../../types/database';

const FALLBACK_COURIERS = [
  'Steadfast Courier',
  'Pathao Courier',
  'RedX',
  'Paperfly',
  'Sundarban Courier',
  'SA Paribahan',
];

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { adminLang, at, formatAdminPrice, formatAdminDate } = useAdminLanguage();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [couriers, setCouriers] = useState<Courier[]>([]);

  // Status transition
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Payment edit
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [senderNumber, setSenderNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Courier & charges edit
  const [courierId, setCourierId] = useState<string>('');
  const [courierName, setCourierName] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [courierCharge, setCourierCharge] = useState<string>('0');
  const [codFee, setCodFee] = useState<string>('0');
  const [codAmount, setCodAmount] = useState<string>('0');
  const [returnAdjustment, setReturnAdjustment] = useState<string>('0');
  const [isSavingCourier, setIsSavingCourier] = useState(false);

  // Item inline cost editing
  const [editingCostItemId, setEditingCostItemId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState<string>('0');
  const [savingItemCost, setSavingItemCost] = useState(false);

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
      const [orderRes, itemRes, histRes, suppRes, courRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
        supabase
          .from('order_status_history')
          .select('*')
          .eq('order_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*'),
        supabase.from('couriers').select('*').eq('is_active', true).order('name'),
      ]);

      if (orderRes.error) throw orderRes.error;
      const ord = orderRes.data as Order;
      setOrder(ord);
      setPaymentStatus(ord.payment_status);
      setSenderNumber(ord.payment_sender_number || '');
      setTrxId(ord.payment_trx_id || '');
      setCourierId(ord.courier_id || '');
      setCourierName(ord.courier_name || '');
      setTrackingCode(ord.tracking_code || '');
      setTrackingUrl(ord.tracking_url || '');
      setCourierCharge(String(ord.delivery_charge_courier ?? ord.courier_fee ?? 0));
      setCodFee(String(ord.cod_charge ?? 0));
      setCodAmount(
        String(ord.cod_amount ?? (ord.payment_method === 'cod' ? ord.total : 0)),
      );
      setReturnAdjustment(String(ord.return_adjustment ?? 0));
      setAdminNote(ord.admin_note || '');

      setItems((itemRes.data || []) as OrderItem[]);

      const histList = (histRes.data || []) as OrderStatusHistory[];
      setHistory(histList);

      // Load profile display names for audit trail
      const userIds = Array.from(
        new Set(histList.map((h) => h.changed_by).filter((v): v is string => Boolean(v))),
      );
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profs) {
          const pMap: Record<string, string> = {};
          for (const p of profs as Array<{ id: string; full_name: string | null }>) {
            pMap[p.id] = p.full_name || 'Staff';
          }
          setProfileNames(pMap);
        }
      }

      if (ord.phone) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', ord.phone)
          .maybeSingle();
        if (custData) setCustomer(custData as Customer);
      }

      if (suppRes.data) {
        const sMap: Record<string, Supplier> = {};
        suppRes.data.forEach((s) => {
          sMap[s.id] = s as Supplier;
        });
        setSuppliers(sMap);
      }

      if (!courRes.error && courRes.data) {
        setCouriers(courRes.data as Courier[]);
      }
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অর্ডার লোড ব্যর্থ' : 'Failed to load order',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrderDetails();
  }, [id]);

  // Update Status handler
  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!supabase || !order) return;
    setIsUpdatingStatus(true);
    try {
      const nowIso = new Date().toISOString();
      const payload: Record<string, unknown> = {
        status: newStatus,
        updated_at: nowIso,
      };
      if (newStatus === 'delivered' && !order.delivered_at) {
        payload.delivered_at = nowIso;
      } else if (newStatus === 'courier_paid') {
        payload.courier_paid_at = nowIso;
        payload.payment_status = 'paid';
        payload.courier_settlement_status = 'received';
        payload.payment_received_at = nowIso;
      } else if (newStatus === 'supplier_paid') {
        payload.supplier_paid_at = nowIso;
      }

      const { error: updErr } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', order.id);
      if (updErr) throw updErr;

      if (newStatus === 'placed_with_supplier' || newStatus === 'ordered_from_supplier') {
        await supabase
          .from('order_items')
          .update({ supplier_order_status: 'ordered' })
          .eq('order_id', order.id)
          .eq('supplier_order_status', 'not_ordered');
      }

      await supabase.from('order_status_history').insert({
        order_id: order.id,
        status: newStatus,
        note: statusNote.trim() || `Status changed to ${newStatus}`,
        changed_by: user?.id || null,
      });

      // Restore stock on cancel/reject/return if not already in terminal negative state
      if (
        (newStatus === 'cancelled' || newStatus === 'rejected' || newStatus === 'returned') &&
        order.status !== 'cancelled' &&
        order.status !== 'rejected' &&
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

      setStatusNote('');
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Order Status Updated',
        description: `${order.order_number} → ${at(`status.${newStatus}`)}`,
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

  // Save inline supplier cost on an order item
  const handleSaveItemCost = async (item: OrderItem) => {
    if (!supabase) return;
    if (!isNonNegativeNumber(editingCostValue)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ক্রয়মূল্য ০ বা তার বেশি হতে হবে' : 'Cost must be >= 0',
      });
      return;
    }

    const newCost = Number(editingCostValue);
    setSavingItemCost(true);
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ cost_price: newCost })
        .eq('id', item.id);
      if (error) throw error;

      const updatedItems = items.map((it) =>
        it.id === item.id ? { ...it, cost_price: newCost } : it,
      );
      setItems(updatedItems);
      setEditingCostItemId(null);

      // Sync non-voided supplier_orders amount if exists
      const totalNewCost = updatedItems.reduce(
        (s, it) => s + Number(it.cost_price || 0) * Number(it.quantity || 1),
        0,
      );
      if (item.supplier_id && order) {
        const suppItemsCost = updatedItems
          .filter((it) => it.supplier_id === item.supplier_id)
          .reduce((s, it) => s + Number(it.cost_price || 0) * Number(it.quantity || 1), 0);
        await supabase
          .from('supplier_orders')
          .update({ supplier_amount: suppItemsCost })
          .eq('order_id', order.id)
          .eq('supplier_id', item.supplier_id)
          .eq('is_void', false);
      }

      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'সাপ্লায়ার ক্রয়মূল্য আপডেট হয়েছে' : 'Supplier cost updated',
        description: adminLang === 'bn' ? `মোট কেনা খরচ: ${formatAdminPrice(totalNewCost)}` : undefined,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to update cost', description: (err as Error)?.message });
    } finally {
      setSavingItemCost(false);
    }
  };

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
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'পেমেন্ট তথ্য সংরক্ষিত' : 'Payment details saved',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Payment save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleCourierSelect = (selectedName: string) => {
    setCourierName(selectedName);
    const matched = couriers.find((c) => c.name === selectedName);
    if (matched) {
      setCourierId(matched.id);
      const isDhaka = (order?.district || '').toLowerCase().includes('dhaka') || (order?.district || '').includes('ঢাকা');
      const suggested = isDhaka ? matched.default_charge_dhaka : matched.default_charge_outside;
      if (Number(courierCharge) === 0 && suggested > 0) {
        setCourierCharge(String(suggested));
      }
      if (Number(codFee) === 0 && matched.cod_fee_percent > 0 && Number(codAmount) > 0) {
        setCodFee(String(Math.round((Number(codAmount) * matched.cod_fee_percent) / 100)));
      }
      if (trackingCode.trim() && matched.tracking_url_template) {
        setTrackingUrl(matched.tracking_url_template.replace('{tracking_code}', trackingCode.trim()));
      }
    } else {
      setCourierId('');
    }
  };

  const handleSaveCourier = async () => {
    if (!supabase || !order) return;

    if (
      !isNonNegativeNumber(courierCharge) ||
      !isNonNegativeNumber(codFee) ||
      !isNonNegativeNumber(codAmount) ||
      !isNonNegativeNumber(returnAdjustment)
    ) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সঠিক সংখ্যা দিন' : 'Charges cannot be negative',
      });
      return;
    }

    setIsSavingCourier(true);
    try {
      let autoUrl = trackingUrl.trim();
      const matched = couriers.find((c) => c.id === courierId || c.name === courierName);
      if (trackingCode.trim()) {
        if (matched?.tracking_url_template) {
          autoUrl = matched.tracking_url_template.replace('{tracking_code}', trackingCode.trim());
        } else if (!autoUrl) {
          const c = courierName.toLowerCase();
          if (c.includes('steadfast')) {
            autoUrl = `https://steadfast.com.bd/t/${trackingCode.trim()}`;
          } else if (c.includes('pathao')) {
            autoUrl = `https://merchant.pathao.com/tracking?consignment_id=${trackingCode.trim()}`;
          } else if (c.includes('redx')) {
            autoUrl = `https://redx.com.bd/track-global-parcel/?trackingId=${trackingCode.trim()}`;
          }
        }
      }

      const chg = Number(courierCharge);
      const fee = Number(codFee);
      const cod = Number(codAmount);
      const ret = Number(returnAdjustment);

      const payload: Record<string, unknown> = {
        courier_id: matched?.id || courierId || null,
        courier_name: courierName.trim() || null,
        tracking_code: trackingCode.trim() || null,
        tracking_url: autoUrl || null,
        delivery_charge_courier: chg,
        courier_fee: chg,
        cod_charge: fee,
        cod_amount: cod,
        return_adjustment: ret,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('orders').update(payload).eq('id', order.id);
      if (error) throw error;

      setTrackingUrl(autoUrl);
      setOrder((prev) => (prev ? ({ ...prev, ...payload } as Order) : null));
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'কুরিয়ার ও চার্জ সংরক্ষিত হয়েছে' : 'Courier & charges saved',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Courier save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingCourier(false);
    }
  };

  const handleSaveAdminNote = async () => {
    if (!supabase || !order) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ admin_note: adminNote.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'নোট সংরক্ষিত হয়েছে' : 'Admin note saved',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Note save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingNote(false);
    }
  };

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
        title: adminLang === 'bn' ? 'কাস্টমার ব্লক করা হয়েছে' : 'Customer Blocked',
      });
      setIsBlockModalOpen(false);
      void fetchOrderDetails();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Block failed', description: (err as Error)?.message });
    }
  };

  const copySupplierOrderMessage = async (supplierIdKey: string | null) => {
    if (!order) return;
    const relevantItems = items.filter((it) => (supplierIdKey ? it.supplier_id === supplierIdKey : true));
    const supp = supplierIdKey ? suppliers[supplierIdKey] : null;

    const itemsText = relevantItems
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product_name} — Qty: ${it.quantity} (Cost: ৳${it.cost_price || 0})`,
      )
      .join('\n');

    const msg = `*NEW DROPSHIP ORDER - MARTBARI*
Order ID: #${order.order_number}

*Items:*
${itemsText}

*Customer Shipping Address:*
Name: ${order.customer_name}
Phone: ${order.phone}
Address: ${order.address}
District: ${order.district}
COD Amount: ৳${order.cod_amount ?? order.total}

Please confirm & share tracking code once dispatched.`;

    await navigator.clipboard.writeText(msg);
    showToast({
      type: 'success',
      title: adminLang === 'bn' ? 'কপি হয়েছে!' : 'Copied to Clipboard!',
      description: `${supp?.name || 'Supplier'}`,
    });
  };

  const handleMarkSupplierOrdered = async () => {
    if (!supabase || !order) return;
    try {
      await supabase
        .from('order_items')
        .update({ supplier_order_status: 'ordered' })
        .eq('order_id', order.id);

      // Group items by supplier to ensure supplier_orders rows exist
      const groupedCost: Record<string, number> = {};
      for (const it of items) {
        const key = it.supplier_id || '__none__';
        groupedCost[key] = (groupedCost[key] || 0) + Number(it.cost_price || 0) * Number(it.quantity || 1);
      }

      for (const [suppKey, amt] of Object.entries(groupedCost)) {
        const suppId = suppKey === '__none__' ? null : suppKey;
        try {
          const { data: existing } = await supabase
            .from('supplier_orders')
            .select('id')
            .eq('order_id', order.id)
            .eq('is_void', false);
          if (!existing || existing.length === 0) {
            await supabase.from('supplier_orders').insert({
              supplier_id: suppId,
              order_id: order.id,
              status: 'placed',
              supplier_amount: amt,
              is_test: Boolean(order.is_test),
              created_by: user?.id || null,
            });
          }
        } catch {
          // Ignore if supplier_orders migration isn't run yet
        }
      }

      await handleUpdateStatus('placed_with_supplier');
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to update', description: (err as Error)?.message });
    }
  };

  const copyCustomerConfirmationMsg = async () => {
    if (!order) return;
    const msg = `আসসালামু আলাইকুম ${order.customer_name}, মার্টবাড়ি (MartBari) থেকে আপনার #${order.order_number} অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে। মোট বিল: ৳${order.total}। দ্রুত ডেলিভারির জন্য আমাদের সাথেই থাকুন।`;
    await navigator.clipboard.writeText(msg);
    showToast({ type: 'success', title: adminLang === 'bn' ? 'কনফার্মেশন মেসেজ কপি হয়েছে' : 'Copied Confirmation SMS' });
  };

  const copyCustomerShippedMsg = async () => {
    if (!order) return;
    const msg = `প্রিয় ${order.customer_name}, আপনার মার্টবাড়ি অর্ডার #${order.order_number} কুরিয়ারে (${order.courier_name || 'কুরিয়ার'}) পাঠানো হয়েছে। ট্র্যাকিং কোড: ${order.tracking_code || 'শীঘ্রই পাবেন'}। ধন্যবাদ!`;
    await navigator.clipboard.writeText(msg);
    showToast({ type: 'success', title: adminLang === 'bn' ? 'কুরিয়ার মেসেজ কপি হয়েছে' : 'Copied Shipped SMS' });
  };

  if (loading || !order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" className="text-[#F47125]" />
      </div>
    );
  }

  // Exact Profit Formula:
  // (itemsRevenue - discount) + customerDeliveryCharge - supplierCost - actualCourierCharge - codFee
  const itemsRevenue =
    items.length > 0
      ? items.reduce((sum, it) => sum + Number(it.selling_price ?? it.unit_price ?? 0) * Number(it.quantity || 1), 0)
      : Number(order.subtotal || 0);
  const discountAmt = Number(order.discount_amount || 0);
  const customerDeliveryCharge = Number(order.delivery_charge_charged ?? order.delivery_charge ?? 0);
  const supplierCost = items.reduce(
    (sum, it) => sum + Number(it.cost_price || 0) * Number(it.quantity || 1),
    0,
  );
  const actualCourierCharge = Number(courierCharge || 0);
  const actualCodFee = Number(codFee || 0);
  const returnAdj = Number(returnAdjustment || 0);

  const isNegativeTerminal = order.status === 'cancelled' || order.status === 'rejected';
  const isReturned = order.status === 'returned';
  const netOrderProfit = isNegativeTerminal
    ? 0
    : isReturned
      ? -(actualCourierCharge + actualCodFee + returnAdj)
      : itemsRevenue - discountAmt + customerDeliveryCharge - supplierCost - actualCourierCharge - actualCodFee;

  const courierOptionsList =
    couriers.length > 0 ? couriers.map((c) => c.name) : FALLBACK_COURIERS;

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-[#0F1A2C] font-mono">
                {at('orderDetail.orderLabel', { num: order.order_number })}
              </h1>
              <StatusBadge type="order" status={order.status} />
              <StatusBadge type="payment" status={order.payment_status} />
              {order.is_test && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {at('orders.testBadge')}
                </span>
              )}
              {order.source === 'ai_chat' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  AI Chat
                </span>
              )}
            </div>
            <p className="text-xs text-[#5B6577]">
              {at('orderDetail.placedOn', { date: formatAdminDate(order.created_at, true) })} •{' '}
              {at('orderDetail.source')}:{' '}
              <span className="font-semibold uppercase">{order.source}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" />
            {at('orderDetail.printInvoice')}
          </Button>
        </div>
      </div>

      {/* 7-Step Lifecycle Transition Action Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#5B6577]">
            {at('orderDetail.updateStatusTitle')}
          </span>
          <span className="text-xs text-[#5B6577]">
            {at('orderDetail.current')}{' '}
            <strong className="text-[#0F1A2C]">{at(`status.${order.status}`)}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { status: 'confirmed', label: at('orderDetail.step1'), color: 'bg-blue-600 hover:bg-blue-700' },
              { status: 'placed_with_supplier', label: at('orderDetail.step2New'), color: 'bg-purple-600 hover:bg-purple-700' },
              { status: 'shipped', label: at('orderDetail.step3'), color: 'bg-indigo-600 hover:bg-indigo-700' },
              { status: 'delivered', label: at('orderDetail.step4'), color: 'bg-emerald-600 hover:bg-emerald-700' },
              { status: 'courier_paid', label: at('orderDetail.step5'), color: 'bg-teal-600 hover:bg-teal-700' },
              { status: 'supplier_paid', label: at('orderDetail.step6'), color: 'bg-cyan-700 hover:bg-cyan-800' },
              { status: 'rejected', label: at('status.rejected'), color: 'bg-rose-600 hover:bg-rose-700' },
              { status: 'cancelled', label: at('orderDetail.cancelOrder'), color: 'bg-red-600 hover:bg-red-700' },
              { status: 'returned', label: at('orderDetail.returnOrder'), color: 'bg-gray-600 hover:bg-gray-700' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.status}
              type="button"
              disabled={isUpdatingStatus || order.status === btn.status}
              onClick={() => void handleUpdateStatus(btn.status)}
              className={`rounded-xl px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-40 cursor-pointer ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="pt-1">
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
        {/* Left 2 Cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items Table with Inline Cost Edit */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#E1E4EA] bg-[#F8FAFC] px-5 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F1A2C]">
                {at('orderDetail.orderedItems', { count: items.length })}
              </h2>
              <div
                className={`text-xs font-bold tabular-nums ${
                  netOrderProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
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
                    const sellUnit = Number(item.selling_price ?? item.unit_price ?? 0);
                    const lineRevenue = sellUnit * item.quantity;
                    const lineCost = Number(item.cost_price || 0) * item.quantity;
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
                          {formatAdminPrice(sellUnit)}
                        </td>
                        <td className="py-3 px-4 text-[#5B6577] tabular-nums">
                          {editingCostItemId === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={editingCostValue}
                                onChange={(e) => setEditingCostValue(e.target.value)}
                                className="w-20 rounded border border-[#F47125] px-1.5 py-0.5 text-xs font-mono text-[#0F1A2C]"
                              />
                              <button
                                type="button"
                                disabled={savingItemCost}
                                onClick={() => void handleSaveItemCost(item)}
                                className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white cursor-pointer"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCostItemId(null)}
                                className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCostItemId(item.id);
                                setEditingCostValue(String(item.cost_price || 0));
                              }}
                              className="inline-flex items-center gap-1 hover:text-[#F47125] cursor-pointer"
                              title={adminLang === 'bn' ? 'ক্রয়মূল্য পরিবর্তন করুন' : 'Edit agreed cost price'}
                            >
                              <span>{formatAdminPrice(item.cost_price || 0)}</span>
                              <Edit2 className="h-3 w-3 opacity-60" />
                            </button>
                          )}
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

            {/* Accounting & Net Profit Breakdown */}
            <div className="border-t border-[#E1E4EA] bg-[#F8FAFC] p-4 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#0F1A2C] pb-1">
                <Calculator className="h-3.5 w-3.5 text-[#F47125]" />
                {at('orderDetail.profitCardTitle')}
              </div>
              <div className="flex justify-between text-[#5B6577]">
                <span>{at('orderDetail.subtotal')}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">
                  {formatAdminPrice(itemsRevenue)}
                </span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-[#F47125]">
                  <span>{at('orderDetail.discount', { code: order.coupon_code || 'Coupon' })}</span>
                  <span className="font-semibold tabular-nums">-{formatAdminPrice(discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#5B6577]">
                <span>{at('orderDetail.deliveryCharge')}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">
                  +{formatAdminPrice(customerDeliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E1E4EA] pt-1.5 font-bold text-[#0F1A2C]">
                <span>{at('orderDetail.totalAmount')}</span>
                <span className="text-sm text-[#F47125] tabular-nums">{formatAdminPrice(order.total)}</span>
              </div>

              <div className="pt-2 space-y-1 border-t border-dashed border-[#CBD5E1]">
                <div className="flex justify-between text-[#5B6577]">
                  <span>(-) {at('orderDetail.supplierPurchaseCost')}</span>
                  <span className="font-semibold text-rose-700 tabular-nums">
                    -{formatAdminPrice(supplierCost)}
                  </span>
                </div>
                <div className="flex justify-between text-[#5B6577]">
                  <span>(-) {at('orderDetail.courierChargeCost')}</span>
                  <span className="font-semibold text-rose-700 tabular-nums">
                    -{formatAdminPrice(actualCourierCharge)}
                  </span>
                </div>
                <div className="flex justify-between text-[#5B6577]">
                  <span>(-) {at('orderDetail.codFeeCost')}</span>
                  <span className="font-semibold text-rose-700 tabular-nums">
                    -{formatAdminPrice(actualCodFee)}
                  </span>
                </div>
                {isReturned && returnAdj > 0 && (
                  <div className="flex justify-between text-[#5B6577]">
                    <span>(-) {at('orderDetail.returnAdj')}</span>
                    <span className="font-semibold text-rose-700 tabular-nums">
                      -{formatAdminPrice(returnAdj)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-[#E1E4EA] pt-2 text-sm font-black">
                <span className="text-[#0F1A2C]">{at('orderDetail.netProfit')}</span>
                <span className={netOrderProfit >= 0 ? 'text-emerald-700 tabular-nums' : 'text-rose-700 tabular-nums'}>
                  {formatAdminPrice(netOrderProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Dropshipping Fulfillment Card */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-700" />
                <h2 className="text-sm font-bold text-purple-950 uppercase tracking-wider">
                  {at('orderDetail.dropshipTitle')}
                </h2>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleMarkSupplierOrdered()}
                className="bg-purple-700 text-white hover:bg-purple-800"
              >
                {at('orderDetail.markSupplierOrdered')}
              </Button>
            </div>

            <p className="text-xs text-purple-900">{at('orderDetail.dropshipDesc')}</p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copySupplierOrderMessage(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-white px-3 py-1.5 text-xs font-bold text-purple-900 shadow-xs hover:bg-purple-50 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-purple-600" />
                {at('orderDetail.copySupplierMsg')}
              </button>
            </div>
          </div>

          {/* Customer Message Automation */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.smsTitle')}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => void copyCustomerConfirmationMsg()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4EA] bg-white px-3 py-1.5 font-semibold text-[#0F1A2C] hover:bg-gray-50 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-[#F47125]" />
                {at('orderDetail.copyConfirmSms')}
              </button>

              <button
                type="button"
                onClick={() => void copyCustomerShippedMsg()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E4EA] bg-white px-3 py-1.5 font-semibold text-[#0F1A2C] hover:bg-gray-50 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-indigo-600" />
                {at('orderDetail.copyShippedSms')}
              </button>
            </div>
          </div>

          {/* Status Timeline & Audit History */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('orderDetail.timelineTitle')}
            </h2>

            {(order.delivered_at || order.courier_paid_at || order.supplier_paid_at) && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-xl bg-[#F8FAFC] p-3 text-[11px] border border-[#E1E4EA]">
                <div>
                  <span className="text-[#5B6577] block">
                    {adminLang === 'bn' ? 'ডেলিভারি সময়:' : 'Delivered At:'}
                  </span>
                  <strong className="text-[#0F1A2C]">
                    {order.delivered_at ? formatAdminDate(order.delivered_at, true) : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-[#5B6577] block">
                    {adminLang === 'bn' ? 'কুরিয়ার টাকা দিয়েছে:' : 'Courier Settled At:'}
                  </span>
                  <strong className="text-[#0F1A2C]">
                    {order.courier_paid_at ? formatAdminDate(order.courier_paid_at, true) : '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-[#5B6577] block">
                    {adminLang === 'bn' ? 'সাপ্লায়ার পরিশোধ:' : 'Supplier Paid At:'}
                  </span>
                  <strong className="text-[#0F1A2C]">
                    {order.supplier_paid_at ? formatAdminDate(order.supplier_paid_at, true) : '—'}
                  </strong>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {history.map((h, i) => (
                <div key={h.id || i} className="flex items-start gap-3 border-l-2 border-[#F47125] pl-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold uppercase text-[#0F1A2C]">
                        {at(`status.${h.status}`)}
                      </span>
                      <span className="text-[11px] text-[#5B6577]">
                        {formatAdminDate(h.created_at, true)}
                      </span>
                      {h.changed_by && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#5B6577]">
                          {at('orderDetail.changedBy')}: {profileNames[h.changed_by] || 'Admin'}
                        </span>
                      )}
                    </div>
                    {h.note && <p className="text-[#5B6577] mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer, Courier & Accounting, Payment, Notes */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderDetail.customerProfile')}
              </h2>
              {customer?.is_blocked && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  {at('orderDetail.blockedBadge')}
                </span>
              )}
            </div>

            <div>
              <div className="font-bold text-sm text-[#0F1A2C]">{order.customer_name}</div>
              <div className="text-xs font-mono text-[#5B6577]">{order.phone}</div>
              {order.email && <div className="text-xs text-[#5B6577]">{order.email}</div>}
            </div>

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

            <div className="pt-2 border-t border-[#F1F3F5] text-xs">
              <div className="font-semibold text-[#0F1A2C]">{at('orderDetail.deliveryAddress')}</div>
              <p className="text-[#5B6577] mt-0.5">{order.address}</p>
              <div className="mt-1 font-bold text-[#F47125]">
                {at('orderDetail.districtLabel')} {order.district}
              </div>
            </div>

            {customer && (
              <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-[#5B6577] flex justify-between">
                <div>
                  {at('orderDetail.lifetimeOrders')}{' '}
                  <strong className="text-[#0F1A2C]">{customer.total_orders}</strong>
                </div>
                <div>
                  {at('orderDetail.spentLabel')}{' '}
                  <strong className="text-[#0F1A2C] tabular-nums">
                    {formatAdminPrice(customer.total_spent)}
                  </strong>
                </div>
              </div>
            )}

            {!customer?.is_blocked && (
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline pt-1 cursor-pointer"
              >
                <Ban className="h-3 w-3" /> {at('orderDetail.blockPhone')}
              </button>
            )}
          </div>

          {/* Courier & Shipping Charges Card */}
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
                onClick={() => void handleSaveCourier()}
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
                onChange={(e) => handleCourierSelect(e.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="">{at('orderDetail.selectCourier')}</option>
                {courierOptionsList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
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

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#0F1A2C] mb-1">
                  {at('orderDetail.courierChargeCost')}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={courierCharge}
                  onChange={(e) => setCourierCharge(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#0F1A2C] mb-1">
                  {at('orderDetail.codFeeCost')}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={codFee}
                  onChange={(e) => setCodFee(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#0F1A2C] mb-1">
                  {at('orderDetail.codToCollect')}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={codAmount}
                  onChange={(e) => setCodAmount(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#0F1A2C] mb-1">
                  {at('orderDetail.returnAdj')}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={returnAdjustment}
                  onChange={(e) => setReturnAdjustment(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
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
                onClick={() => void handleSavePayment()}
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
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C]"
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
                onClick={() => void handleSaveAdminNote()}
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

      {/* Block Customer Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> {at('orderDetail.blockModalTitle')}
            </h3>
            <p className="text-xs text-[#5B6577]">{order.phone}</p>
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
              <Button size="sm" className="bg-red-600 text-white" onClick={() => void handleBlockCustomer()}>
                {at('orderDetail.confirmBlock')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

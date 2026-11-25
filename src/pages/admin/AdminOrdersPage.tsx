import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Download,
  Package,
  Phone,
  Plus,
  Printer,
  Search,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../lib/auth';
import { exportToCsv } from '../../lib/exportCsv';
import { supabase } from '../../lib/supabase';
import type { Order, OrderStatus, Supplier } from '../../types/database';

type FilterTab =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'placed_with_supplier'
  | 'shipped'
  | 'delivered'
  | 'courier_paid'
  | 'supplier_paid'
  | 'rejected'
  | 'cancelled'
  | 'returned';

const NEXT_STATUS_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'placed_with_supplier',
  placed_with_supplier: 'shipped',
  ordered_from_supplier: 'shipped',
  shipped: 'delivered',
  delivered: 'courier_paid',
  courier_paid: 'supplier_paid',
};

export const AdminOrdersPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { adminLang, at, formatAdminPrice, formatAdminDate } = useAdminLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orderSupplierMap, setOrderSupplierMap] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  const initialTabParam = searchParams.get('status') as FilterTab | 'needs_supplier' | 'ordered_from_supplier' | null;
  const resolvedInitialTab: FilterTab =
    initialTabParam === 'needs_supplier'
      ? 'confirmed'
      : initialTabParam === 'ordered_from_supplier'
        ? 'placed_with_supplier'
        : (initialTabParam as FilterTab) || 'all';

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<FilterTab>(resolvedInitialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [hideTestOrders, setHideTestOrders] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fetchOrders = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [ordRes, suppRes, itemRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('order_items').select('order_id, supplier_id'),
      ]);

      if (ordRes.error) throw ordRes.error;
      setOrders((ordRes.data || []) as Order[]);
      if (suppRes.data) setSuppliers(suppRes.data as Supplier[]);

      const map: Record<string, Set<string>> = {};
      if (itemRes.data) {
        for (const row of itemRes.data as Array<{ order_id: string; supplier_id: string | null }>) {
          if (row.supplier_id) {
            if (!map[row.order_id]) map[row.order_id] = new Set();
            map[row.order_id].add(row.supplier_id);
          }
        }
      }
      setOrderSupplierMap(map);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অর্ডার লোড হয়নি' : 'Failed to load orders',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const baseVisibleOrders = useMemo(
    () => (hideTestOrders ? orders.filter((o) => !o.is_test) : orders),
    [orders, hideTestOrders],
  );

  // Compute status counts for tabs
  const counts = useMemo(() => {
    const c: Record<FilterTab, number> = {
      all: baseVisibleOrders.length,
      pending: 0,
      confirmed: 0,
      placed_with_supplier: 0,
      shipped: 0,
      delivered: 0,
      courier_paid: 0,
      supplier_paid: 0,
      rejected: 0,
      cancelled: 0,
      returned: 0,
    };
    baseVisibleOrders.forEach((o) => {
      if (o.status === 'ordered_from_supplier' || o.status === 'placed_with_supplier') {
        c.placed_with_supplier++;
      } else if (o.status in c) {
        c[o.status as FilterTab]++;
      }
    });
    return c;
  }, [baseVisibleOrders]);

  const pendingOrdersList = useMemo(
    () => baseVisibleOrders.filter((o) => o.status === 'pending'),
    [baseVisibleOrders],
  );

  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    baseVisibleOrders.forEach((o) => {
      if (o.district) set.add(o.district);
    });
    return Array.from(set).sort();
  }, [baseVisibleOrders]);

  const uniqueCouriers = useMemo(() => {
    const set = new Set<string>();
    baseVisibleOrders.forEach((o) => {
      if (o.courier_name) set.add(o.courier_name);
    });
    return Array.from(set).sort();
  }, [baseVisibleOrders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return baseVisibleOrders.filter((o) => {
      if (activeTab === 'placed_with_supplier') {
        if (o.status !== 'placed_with_supplier' && o.status !== 'ordered_from_supplier') return false;
      } else if (activeTab !== 'all' && o.status !== activeTab) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = o.order_number.toLowerCase().includes(q);
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.phone.toLowerCase().includes(q);
        const matchTracking = (o.tracking_code || '').toLowerCase().includes(q);
        if (!matchNumber && !matchName && !matchPhone && !matchTracking) return false;
      }

      if (paymentStatusFilter !== 'all' && o.payment_status !== paymentStatusFilter) {
        return false;
      }

      if (paymentMethodFilter !== 'all' && o.payment_method !== paymentMethodFilter) {
        return false;
      }

      if (districtFilter !== 'all' && o.district !== districtFilter) {
        return false;
      }

      if (courierFilter !== 'all' && o.courier_name !== courierFilter) {
        return false;
      }

      if (supplierFilter !== 'all') {
        const suppSet = orderSupplierMap[o.id];
        if (!suppSet || !suppSet.has(supplierFilter)) return false;
      }

      if (sourceFilter !== 'all' && o.source !== sourceFilter) {
        return false;
      }

      if (dateFrom && o.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && o.created_at.slice(0, 10) > dateTo) return false;

      return true;
    });
  }, [
    baseVisibleOrders,
    activeTab,
    searchQuery,
    paymentStatusFilter,
    paymentMethodFilter,
    districtFilter,
    courierFilter,
    supplierFilter,
    orderSupplierMap,
    sourceFilter,
    dateFrom,
    dateTo,
  ]);

  const buildUpdatePayloadForStatus = (newStatus: OrderStatus) => {
    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status: newStatus,
      updated_at: nowIso,
    };
    if (newStatus === 'delivered') {
      payload.delivered_at = nowIso;
    } else if (newStatus === 'courier_paid') {
      payload.courier_paid_at = nowIso;
      payload.payment_status = 'paid';
      payload.courier_settlement_status = 'received';
      payload.payment_received_at = nowIso;
    } else if (newStatus === 'supplier_paid') {
      payload.supplier_paid_at = nowIso;
    }
    return payload;
  };

  // Bulk Status Update
  const handleBulkStatusChange = async () => {
    if (!supabase || !bulkStatus || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const payload = buildUpdatePayloadForStatus(bulkStatus);
      const { error } = await supabase.from('orders').update(payload).in('id', ids);

      if (error) throw error;

      const historyRows = ids.map((orderId) => ({
        order_id: orderId,
        status: bulkStatus,
        note: `Bulk updated to ${bulkStatus} by staff`,
        changed_by: user?.id || null,
      }));
      await supabase.from('order_status_history').insert(historyRows);

      setOrders((prev) =>
        prev.map((o) => (selectedIds.has(o.id) ? ({ ...o, ...payload } as Order) : o)),
      );
      setSelectedIds(new Set());
      setBulkStatus('');
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'অর্ডার আপডেট হয়েছে' : 'Orders Updated',
        description:
          adminLang === 'bn'
            ? `${ids.length}টি অর্ডার আপডেট করা হয়েছে।`
            : `Successfully updated ${ids.length} orders.`,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'আপডেট ব্যর্থ' : 'Bulk update failed',
        description: (err as Error)?.message,
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Single Order Next Status / Approve / Reject
  const handleSingleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!supabase) return;
    setUpdatingOrderId(orderId);
    try {
      const payload = buildUpdatePayloadForStatus(newStatus);
      const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
      if (error) throw error;

      if (newStatus === 'placed_with_supplier') {
        await supabase
          .from('order_items')
          .update({ supplier_order_status: 'ordered' })
          .eq('order_id', orderId)
          .eq('supplier_order_status', 'not_ordered');
      }

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        note:
          newStatus === 'confirmed'
            ? 'Order approved by admin'
            : newStatus === 'rejected' || newStatus === 'cancelled'
              ? 'Order rejected by admin'
              : `Order moved to ${newStatus}`,
        changed_by: user?.id || null,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? ({ ...o, ...payload } as Order) : o)),
      );

      showToast({
        type: 'success',
        title: at(`status.${newStatus}`),
        description:
          adminLang === 'bn'
            ? `অর্ডারটি "${at(`status.${newStatus}`)}" ধাপে নেওয়া হয়েছে।`
            : `Order updated to ${at(`status.${newStatus}`)}.`,
      });
      await logActivity('UPDATE_ORDER_STATUS', 'orders', orderId, { to: newStatus });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'আপডেট ব্যর্থ হয়েছে' : 'Failed to update order',
        description: (err as Error)?.message,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleExportCsv = () => {
    const listToExport =
      selectedIds.size > 0
        ? orders.filter((o) => selectedIds.has(o.id))
        : filteredOrders;

    const rows = listToExport.map((o) => ({
      'Order Number': o.order_number,
      Date: new Date(o.created_at).toLocaleDateString('en-US'),
      Customer: o.customer_name,
      Phone: o.phone,
      Address: o.address,
      District: o.district,
      Subtotal: o.subtotal,
      'Delivery Charge': o.delivery_charge,
      Discount: o.discount_amount,
      Total: o.total,
      'Payment Method': o.payment_method.toUpperCase(),
      'Payment Status': o.payment_status.toUpperCase(),
      'Order Status': o.status.toUpperCase(),
      Courier: o.courier_name || '',
      'Tracking Code': o.tracking_code || '',
      Source: o.source,
    }));

    exportToCsv(`martbari-orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({
      type: 'success',
      title: adminLang === 'bn' ? `${rows.length}টি অর্ডার CSV ডাউনলোড হয়েছে` : `Exported ${rows.length} orders to CSV`,
    });
  };

  const getSourceLabel = (src: string) => {
    if (src === 'manual') return at('orders.source.manual');
    if (src === 'messenger') return at('orders.source.messenger');
    if (src === 'ai_chat') return 'AI Chat';
    return src;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('orders.title')}</h1>
          <p className="text-sm text-[#5B6577]">{at('orders.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            {at('common.exportCsv')}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/admin/orders/create')}
            className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
          >
            <Plus className="h-4 w-4" />
            {at('orders.createManual')}
          </Button>
        </div>
      </div>

      {/* Dedicated Pending Orders Quick-Review Panel */}
      {!loading && pendingOrdersList.length > 0 && activeTab !== 'pending' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-[#0F1A2C]">
                {adminLang === 'bn'
                  ? `অপেক্ষমাণ অর্ডার (${pendingOrdersList.length}টি)`
                  : `Pending Orders (${pendingOrdersList.length})`}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className="text-xs font-bold text-[#F47125] hover:underline cursor-pointer"
            >
              {adminLang === 'bn' ? 'সব পেন্ডিং অর্ডার দেখুন →' : 'View pending tab →'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {pendingOrdersList.slice(0, 6).map((po) => (
              <div
                key={po.id}
                className="flex flex-col justify-between gap-2 rounded-xl border border-[#E1E4EA] bg-white p-3 text-xs shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={`/admin/orders/${po.id}`}
                        className="font-mono font-bold text-[#0F1A2C] hover:text-[#F47125]"
                      >
                        {po.order_number}
                      </Link>
                      {po.source === 'ai_chat' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                          <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                          AI Chat
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-[#0F1A2C] mt-0.5">{po.customer_name}</p>
                    <p className="text-[11px] font-mono text-[#5B6577]">{po.phone}</p>
                  </div>
                  <div className="text-right font-black text-[#0F1A2C] tabular-nums">
                    {formatAdminPrice(po.total)}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1.5 border-t border-[#F1F3F5] pt-2">
                  <span className="truncate text-[11px] text-[#5B6577]" title={po.address}>
                    {po.district}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleSingleStatusUpdate(po.id, 'confirmed')}
                      disabled={updatingOrderId === po.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      {adminLang === 'bn' ? 'অ্যাপ্রুভ' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSingleStatusUpdate(po.id, 'rejected')}
                      disabled={updatingOrderId === po.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 cursor-pointer disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      {adminLang === 'bn' ? 'রিজেক্ট' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full 7-Step Lifecycle Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#E1E4EA]">
        {(
          [
            { id: 'all', label: at('orders.tab.all'), count: counts.all, alert: false },
            { id: 'pending', label: at('status.pending'), count: counts.pending, alert: counts.pending > 0 },
            { id: 'confirmed', label: at('status.confirmed'), count: counts.confirmed, alert: false },
            { id: 'placed_with_supplier', label: at('status.placed_with_supplier'), count: counts.placed_with_supplier, alert: false },
            { id: 'shipped', label: at('status.shipped'), count: counts.shipped, alert: false },
            { id: 'delivered', label: at('status.delivered'), count: counts.delivered, alert: false },
            { id: 'courier_paid', label: at('status.courier_paid'), count: counts.courier_paid, alert: false },
            { id: 'supplier_paid', label: at('status.supplier_paid'), count: counts.supplier_paid, alert: false },
            { id: 'returned', label: at('status.returned'), count: counts.returned, alert: false },
            { id: 'cancelled', label: at('status.cancelled'), count: counts.cancelled, alert: false },
            { id: 'rejected', label: at('status.rejected'), count: counts.rejected, alert: false },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#F47125] text-[#F47125]'
                : 'border-transparent text-[#5B6577] hover:text-[#0F1A2C]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === tab.id
                  ? 'bg-orange-100 text-[#F47125]'
                  : tab.alert
                    ? 'bg-amber-100 text-amber-700 animate-pulse'
                    : 'bg-gray-100 text-[#5B6577]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
            <Input
              type="text"
              placeholder={at('orders.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
          >
            <option value="all">{at('orders.allSuppliers')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={courierFilter}
            onChange={(e) => setCourierFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
          >
            <option value="all">{adminLang === 'bn' ? 'সকল কুরিয়ার' : 'All Couriers'}</option>
            {uniqueCouriers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 items-center">
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#E1E4EA] bg-white px-2.5 text-xs text-[#0F1A2C]"
          >
            <option value="all">{at('orders.allPaymentStatuses')}</option>
            <option value="unpaid">{at('status.unpaid')}</option>
            <option value="paid">{at('status.paid')}</option>
            <option value="refunded">{at('status.refunded')}</option>
          </select>

          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#E1E4EA] bg-white px-2.5 text-xs text-[#0F1A2C]"
          >
            <option value="all">{at('orders.allPaymentMethods')}</option>
            <option value="cod">COD</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="advance">{at('orders.advancePayment')}</option>
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#E1E4EA] bg-white px-2.5 text-xs text-[#0F1A2C]"
          >
            <option value="all">{at('orders.allDistricts')}</option>
            {uniqueDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#E1E4EA] bg-white px-2.5 text-xs text-[#0F1A2C]"
          >
            <option value="all">{at('orders.allSources')}</option>
            <option value="website">Website</option>
            <option value="manual">{at('orders.source.manual')}</option>
            <option value="messenger">{at('orders.source.messenger')}</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="ai_chat">AI Chat</option>
            <option value="facebook">Facebook</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#E1E4EA] px-2.5 text-xs text-[#0F1A2C]"
            title={at('orders.dateFrom')}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#E1E4EA] px-2.5 text-xs text-[#0F1A2C]"
            title={at('orders.dateTo')}
          />

          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6577] cursor-pointer">
            <input
              type="checkbox"
              checked={hideTestOrders}
              onChange={(e) => setHideTestOrders(e.target.checked)}
              className="rounded text-[#F47125]"
            />
            <span className="truncate">{at('orders.testOnly')}</span>
          </label>
        </div>
      </div>

      {/* Bulk Action Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#17263E] px-4 py-2.5 text-xs text-white shadow-md">
          <span className="font-semibold">
            {at('orders.selectedCount', { count: selectedIds.size })}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
              className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white border border-white/20 focus:outline-none"
            >
              <option value="" className="text-gray-900">{at('orders.changeStatusTo')}</option>
              <option value="confirmed" className="text-gray-900">{at('status.confirmed')}</option>
              <option value="placed_with_supplier" className="text-gray-900">{at('status.placed_with_supplier')}</option>
              <option value="shipped" className="text-gray-900">{at('status.shipped')}</option>
              <option value="delivered" className="text-gray-900">{at('status.delivered')}</option>
              <option value="courier_paid" className="text-gray-900">{at('status.courier_paid')}</option>
              <option value="supplier_paid" className="text-gray-900">{at('status.supplier_paid')}</option>
              <option value="rejected" className="text-gray-900">{at('status.rejected')}</option>
              <option value="cancelled" className="text-gray-900">{at('status.cancelled')}</option>
            </select>

            <button
              type="button"
              onClick={() => void handleBulkStatusChange()}
              disabled={!bulkStatus || isBulkUpdating}
              className="rounded-lg bg-[#F47125] px-3 py-1 font-semibold text-white hover:bg-[#e05e13] disabled:opacity-50 cursor-pointer"
            >
              {isBulkUpdating ? at('common.updating') : at('common.apply')}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 gap-1 inline-flex items-center cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> {at('common.printSelected')}
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 text-white/70 hover:text-white cursor-pointer"
            >
              {at('common.clear')}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[#5B6577]">
            <Package className="h-10 w-10 text-gray-300 mb-2" />
            <p className="font-semibold text-[#0F1A2C]">{at('orders.noneFound')}</p>
            <p className="text-xs text-[#5B6577] mt-1">{at('orders.noneFoundSub')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredOrders.length > 0 &&
                        filteredOrders.every((o) => selectedIds.has(o.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="rounded border-[#E1E4EA]"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold">{at('orders.col.order')}</th>
                  <th className="py-3 px-3 font-semibold">{at('orders.col.customer')}</th>
                  <th className="py-3 px-3 font-semibold">{at('orders.col.location')}</th>
                  <th className="py-3 px-3 font-semibold">{at('orders.col.total')}</th>
                  <th className="py-3 px-3 font-semibold">{at('orders.col.payment')}</th>
                  <th className="py-3 px-3 font-semibold">{at('orders.col.fulfillment')}</th>
                  <th className="py-3 px-3 text-right font-semibold">{at('orders.col.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredOrders.map((order) => {
                  const nextStatus = NEXT_STATUS_MAP[order.status];
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        selectedIds.has(order.id) ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(order.id);
                            else newSet.delete(order.id);
                            setSelectedIds(newSet);
                          }}
                          className="rounded border-[#E1E4EA]"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="font-bold text-[#0F1A2C] hover:text-[#F47125] font-mono"
                          >
                            {order.order_number}
                          </Link>
                          {order.is_test && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                              {at('orders.testBadge')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#5B6577]">
                          {formatAdminDate(order.created_at, true)}
                        </div>
                        {order.source === 'ai_chat' ? (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                            AI Chat
                          </span>
                        ) : order.source !== 'website' ? (
                          <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#5B6577]">
                            {getSourceLabel(order.source)}
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#0F1A2C]">{order.customer_name}</div>
                        <div className="text-[11px] text-[#5B6577] flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {order.phone}
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="font-medium text-[#0F1A2C]">{order.district}</div>
                        <div className="truncate text-[11px] text-[#5B6577]" title={order.address}>
                          {order.address}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-[#0F1A2C] tabular-nums whitespace-nowrap">
                        {formatAdminPrice(order.total)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold uppercase text-[10px] text-[#5B6577] bg-gray-100 px-1.5 py-0.5 rounded">
                            {order.payment_method}
                          </span>
                          <StatusBadge type="payment" status={order.payment_status} />
                        </div>
                        {order.payment_trx_id && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            Trx: {order.payment_trx_id}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge type="order" status={order.status} />
                        {order.courier_name && (
                          <div className="text-[10px] text-[#5B6577] mt-0.5 flex items-center gap-1">
                            <Truck className="h-3 w-3 text-gray-400" />
                            <span>{order.courier_name}</span>
                            {order.tracking_code && (
                              <span className="font-mono text-[#0F1A2C]">({order.tracking_code})</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {order.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleSingleStatusUpdate(order.id, 'confirmed')}
                              disabled={updatingOrderId === order.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              {adminLang === 'bn' ? 'অ্যাপ্রুভ' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSingleStatusUpdate(order.id, 'rejected')}
                              disabled={updatingOrderId === order.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 cursor-pointer disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              {adminLang === 'bn' ? 'রিজেক্ট' : 'Reject'}
                            </button>
                            <Link
                              to={`/admin/orders/${order.id}`}
                              className="p-1 rounded-md text-[#5B6577] hover:text-[#0F1A2C] hover:bg-gray-100"
                              title={at('common.manage')}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {nextStatus && (
                              <button
                                type="button"
                                onClick={() => void handleSingleStatusUpdate(order.id, nextStatus)}
                                disabled={updatingOrderId === order.id}
                                title={`${at('orders.nextStep')}: ${at(`status.${nextStatus}`)}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#17263E] hover:bg-[#F47125] px-2 py-1 text-[10px] font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <ArrowRight className="h-3 w-3" />
                                {at(`status.${nextStatus}`)}
                              </button>
                            )}
                            <Link
                              to={`/admin/orders/${order.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E1E4EA] px-2 py-1 font-bold text-[#17263E] hover:border-[#F47125] hover:text-[#F47125]"
                            >
                              {at('common.manage')} <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

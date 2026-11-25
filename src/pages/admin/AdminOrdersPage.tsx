import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  Printer,
  ChevronRight,
  ExternalLink,
  Phone,
  Clock,
  CheckCircle,
  Truck,
  RotateCcw,
  AlertCircle,
  Package,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../types/database';

export const AdminOrdersPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { at, formatAdminPrice, formatAdminDate } = useAdminLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const initialTabParam = searchParams.get('status') as OrderStatus | 'all' | 'needs_supplier' | null;
  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all' | 'needs_supplier'>(
    initialTabParam || 'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fetchOrders = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Failed to load orders',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  // Compute status counts for tabs
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      ordered_from_supplier: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      rejected: 0,
      returned: 0,
    };
    orders.forEach((o) => {
      if (c[o.status] !== undefined) {
        c[o.status]++;
      }
    });
    return c;
  }, [orders]);

  const pendingOrdersList = useMemo(
    () => orders.filter((o) => o.status === 'pending'),
    [orders],
  );

  // Unique list of districts for filter dropdown
  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.district) set.add(o.district);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (activeTab === 'needs_supplier') {
        if (o.status !== 'confirmed') return false;
      } else if (activeTab !== 'all' && o.status !== activeTab) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = o.order_number.toLowerCase().includes(q);
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.phone.toLowerCase().includes(q);
        if (!matchNumber && !matchName && !matchPhone) return false;
      }

      // Payment Status
      if (paymentStatusFilter !== 'all' && o.payment_status !== paymentStatusFilter) {
        return false;
      }

      // Payment Method
      if (paymentMethodFilter !== 'all' && o.payment_method !== paymentMethodFilter) {
        return false;
      }

      // District
      if (districtFilter !== 'all' && o.district !== districtFilter) {
        return false;
      }

      // Courier
      if (courierFilter !== 'all' && o.courier_name !== courierFilter) {
        return false;
      }

      // Source Filter (e.g. ai_chat)
      if (sourceFilter !== 'all' && o.source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery, paymentStatusFilter, paymentMethodFilter, districtFilter, courierFilter, sourceFilter]);

  // Bulk Status Update
  const handleBulkStatusChange = async () => {
    if (!supabase || !bulkStatus || selectedIds.size === 0) return;
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('orders')
        .update({ status: bulkStatus, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      // Log status histories
      const historyRows = ids.map((orderId) => ({
        order_id: orderId,
        status: bulkStatus,
        note: `Bulk updated to ${bulkStatus} by staff`,
        changed_by: user?.id || null,
      }));
      await supabase.from('order_status_history').insert(historyRows);

      setOrders((prev) =>
        prev.map((o) => (selectedIds.has(o.id) ? { ...o, status: bulkStatus } : o))
      );
      setSelectedIds(new Set());
      setBulkStatus('');
      showToast({
        type: 'success',
        title: 'Orders Updated',
        description: `Successfully updated ${ids.length} orders to ${bulkStatus}.`,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Bulk update failed', description: (err as Error)?.message });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Single Order Status Change (Quick Approve / Reject for Pending Orders)
  const handleSingleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!supabase) return;
    setUpdatingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      // Log status history
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        note:
          newStatus === 'confirmed'
            ? 'Order approved by admin'
            : newStatus === 'rejected' || newStatus === 'cancelled'
              ? 'Order rejected by admin'
              : `Order updated to ${newStatus}`,
        changed_by: user?.id || null,
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );

      showToast({
        type: 'success',
        title: newStatus === 'confirmed' ? 'Order Approved' : 'Order Rejected',
        description: `Order has been marked as ${newStatus}.`,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Failed to update order',
        description: (err as Error)?.message,
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Export to CSV
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
    }));

    exportToCsv(`martbari-orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({ type: 'success', title: `Exported ${rows.length} orders to CSV` });
  };

  // Print bulk packing slips
  const handleBulkPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('orders.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('orders.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5"
          >
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
                Pending Orders ({pendingOrdersList.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className="text-xs font-bold text-[#F47125] hover:underline cursor-pointer"
            >
              View pending tab →
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
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSingleStatusUpdate(po.id, 'rejected')}
                      disabled={updatingOrderId === po.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 cursor-pointer disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[#E1E4EA]">
        {(
          [
            { id: 'all', label: at('orders.tab.all'), count: counts.all, alert: false },
            { id: 'pending', label: at('status.pending'), count: counts.pending, alert: counts.pending > 0 },
            { id: 'confirmed', label: at('status.confirmed'), count: counts.confirmed, alert: false },
            { id: 'ordered_from_supplier', label: at('status.ordered_from_supplier'), count: counts.ordered_from_supplier, alert: false },
            { id: 'shipped', label: at('status.shipped'), count: counts.shipped, alert: false },
            { id: 'delivered', label: at('status.delivered'), count: counts.delivered, alert: false },
            { id: 'rejected', label: at('status.rejected'), count: counts.rejected, alert: false },
            { id: 'cancelled', label: at('status.cancelled'), count: counts.cancelled, alert: false },
            { id: 'returned', label: at('status.returned'), count: counts.returned, alert: false },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
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

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search box */}
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

          {/* Payment Status */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="all">{at('orders.allPaymentStatuses')}</option>
              <option value="unpaid">{at('status.unpaid')}</option>
              <option value="paid">{at('status.paid')}</option>
              <option value="refunded">{at('status.refunded')}</option>
            </select>
          </div>

          {/* District filter */}
          <div>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="all">{at('orders.allDistricts')}</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method filter */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="all">{at('orders.allPaymentMethods')}</option>
              <option value="cod">{at('orders.cod')}</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </select>
          </div>

          {/* Order Source filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none font-medium"
            >
              <option value="all">All Sources</option>
              <option value="ai_chat">✨ AI Chat</option>
              <option value="website">Website</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#17263E] px-4 py-2.5 text-xs text-white shadow-md animate-in fade-in">
          <span className="font-semibold">
            {at('orders.selectedCount', { count: selectedIds.size })}
          </span>

          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
              className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white border border-white/20 focus:outline-none"
            >
              <option value="" className="text-gray-900">{at('orders.changeStatusTo')}</option>
              <option value="confirmed" className="text-gray-900">{at('status.confirmed')}</option>
              <option value="ordered_from_supplier" className="text-gray-900">{at('status.ordered_from_supplier')}</option>
              <option value="shipped" className="text-gray-900">{at('status.shipped')}</option>
              <option value="delivered" className="text-gray-900">{at('status.delivered')}</option>
              <option value="rejected" className="text-gray-900">{at('status.rejected')}</option>
              <option value="cancelled" className="text-gray-900">{at('status.cancelled')}</option>
            </select>

            <button
              onClick={() => void handleBulkStatusChange()}
              disabled={!bulkStatus || isBulkUpdating}
              className="rounded-lg bg-[#F47125] px-3 py-1 font-semibold text-white hover:bg-[#e05e13] disabled:opacity-50"
            >
              {isBulkUpdating ? at('common.updating') : at('common.apply')}
            </button>

            <button
              onClick={handleBulkPrint}
              className="rounded-lg bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 gap-1 inline-flex items-center"
            >
              <Printer className="h-3.5 w-3.5" /> {at('common.printSelected')}
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 text-white/70 hover:text-white"
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
            <p className="text-xs text-[#5B6577] mt-1">
              {at('orders.noneFoundSub')}
            </p>
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
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-[#F8FAFC] transition-colors ${
                      selectedIds.has(order.id) ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
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

                    {/* Order Number & Date */}
                    <td className="py-3 px-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-bold text-[#0F1A2C] hover:text-[#F47125] block font-mono"
                      >
                        {order.order_number}
                      </Link>
                      <span className="text-[11px] text-[#5B6577]">
                        {formatAdminDate(order.created_at, true)}
                      </span>
                      {order.source === 'ai_chat' ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 shadow-2xs">
                          <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                          AI Chat
                        </span>
                      ) : order.source !== 'website' ? (
                        <span className="ml-1.5 inline-block rounded-xs bg-gray-100 px-1 py-0.2 text-[9px] font-bold uppercase text-[#5B6577]">
                          {order.source}
                        </span>
                      ) : null}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#0F1A2C]">{order.customer_name}</div>
                      <div className="text-[11px] text-[#5B6577] flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {order.phone}
                      </div>
                    </td>

                    {/* District */}
                    <td className="py-3 px-3 max-w-[160px]">
                      <div className="font-medium text-[#0F1A2C]">{order.district}</div>
                      <div className="truncate text-[11px] text-[#5B6577]" title={order.address}>
                        {order.address}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-3 font-bold text-[#0F1A2C] tabular-nums">
                      {formatAdminPrice(order.total)}
                    </td>

                    {/* Payment */}
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

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <StatusBadge type="order" status={order.status} />
                      {order.courier_name && (
                        <div className="text-[10px] text-[#5B6577] mt-0.5 flex items-center gap-1">
                          <Truck className="h-3 w-3 text-gray-400" />
                          {order.courier_name}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      {order.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleSingleStatusUpdate(order.id, 'confirmed')}
                            disabled={updatingOrderId === order.id}
                            title="Approve Order"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSingleStatusUpdate(order.id, 'rejected')}
                            disabled={updatingOrderId === order.id}
                            title="Reject Order"
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            Reject
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
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 font-bold text-[#17263E] hover:text-[#F47125]"
                        >
                          {at('common.manage')} <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

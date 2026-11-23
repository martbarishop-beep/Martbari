import React, { useEffect, useState, useMemo } from 'react';
import { CreditCard, DollarSign, Truck, CheckCircle, AlertCircle, Clock, Download, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { exportToCsv } from '../../lib/exportCsv';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Order } from '../../types/database';

export const AdminPaymentsPage: React.FC = () => {
  const { at, formatAdminPrice, formatAdminDate } = useAdminLanguage();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'awaiting_collection' | 'waiting_settlement' | 'received' | 'problem' | 'all'>('awaiting_collection');
  const [searchQuery, setSearchQuery] = useState('');

  // Settlement modal editing
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [courierFee, setCourierFee] = useState<number>(60);
  const [codCharge, setCodCharge] = useState<number>(0);
  const [settlementStatus, setSettlementStatus] = useState<string>('waiting_settlement');
  const [paymentStatus, setPaymentStatus] = useState<string>('paid');
  const [updating, setUpdating] = useState(false);

  const fetchOrdersPayments = async () => {
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
      showToast({ type: 'error', title: 'Failed to load payments data', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrdersPayments();
  }, []);

  const handleSavePaymentDetails = async () => {
    if (!supabase || !editingOrder) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          courier_fee: Number(courierFee) || 0,
          cod_charge: Number(codCharge) || 0,
          courier_settlement_status: settlementStatus,
          payment_status: paymentStatus,
          payment_received_at: paymentStatus === 'paid' && !editingOrder.payment_received_at ? new Date().toISOString() : editingOrder.payment_received_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingOrder.id);

      if (error) throw error;

      showToast({ type: 'success', title: 'Payment & settlement updated successfully' });
      setEditingOrder(null);
      await fetchOrdersPayments();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === 'awaiting_collection') {
        if (o.status !== 'delivered' || o.payment_status === 'paid') return false;
      } else if (activeTab === 'waiting_settlement') {
        if (o.courier_settlement_status !== 'waiting_settlement' && o.courier_settlement_status !== 'pending') return false;
      } else if (activeTab === 'received') {
        if (o.payment_status !== 'paid' && o.courier_settlement_status !== 'received') return false;
      } else if (activeTab === 'problem') {
        if (o.courier_settlement_status !== 'problem' && o.status !== 'returned') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = o.order_number.toLowerCase().includes(q);
        const matchCustomer = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.phone.toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Financial metrics
  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalPendingSettlement = 0;

    orders.forEach((o) => {
      if (o.status !== 'cancelled' && o.status !== 'returned') {
        totalRevenue += o.total;
        if (o.payment_status === 'paid' || o.courier_settlement_status === 'received') {
          totalCollected += o.total;
        } else {
          totalPendingSettlement += o.total;
        }
      }
    });

    return { totalRevenue, totalCollected, totalPendingSettlement };
  }, [orders]);

  const handleExportCsv = () => {
    const rows = filteredOrders.map((o) => ({
      'Order Number': o.order_number,
      Date: new Date(o.created_at).toLocaleDateString('en-US'),
      Customer: o.customer_name,
      Phone: o.phone,
      Total: o.total,
      'Payment Method': o.payment_method.toUpperCase(),
      'Payment Status': o.payment_status.toUpperCase(),
      'Courier Settlement': o.courier_settlement_status || 'pending',
      'Courier Fee': o.courier_fee || 0,
      'COD Charge': o.cod_charge || 0,
    }));
    exportToCsv(`martbari-payments-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({ type: 'success', title: `Exported ${rows.length} payment records` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">Payments & Courier Settlements</h1>
          <p className="text-sm text-[#5B6577]">
            Track Cash on Delivery (COD) collections, courier cash payouts, settlement statuses, and net revenue.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" /> Export Payments CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6577]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Order Volume</span>
            <DollarSign className="h-5 w-5 text-[#F47125]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0F1A2C] font-mono">
            {formatAdminPrice(totals.totalRevenue)}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6577]">
            <span className="text-xs font-bold uppercase tracking-wider">Collected / Settled</span>
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono">
            {formatAdminPrice(totals.totalCollected)}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6577]">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Collection / Settlement</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-mono">
            {formatAdminPrice(totals.totalPendingSettlement)}
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-[#E1E4EA] shadow-xs">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'awaiting_collection', label: 'Awaiting COD Collection', count: orders.filter((o) => o.status === 'delivered' && o.payment_status !== 'paid').length },
              { id: 'waiting_settlement', label: 'Waiting Settlement', count: orders.filter((o) => o.courier_settlement_status === 'waiting_settlement' || o.courier_settlement_status === 'pending').length },
              { id: 'received', label: 'Received / Settled', count: orders.filter((o) => o.payment_status === 'paid' || o.courier_settlement_status === 'received').length },
              { id: 'problem', label: 'Problems / Returns', count: orders.filter((o) => o.courier_settlement_status === 'problem' || o.status === 'returned').length },
              { id: 'all', label: 'All Orders', count: orders.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#17263E] text-white'
                  : 'bg-gray-100 text-[#5B6577] hover:bg-gray-200 hover:text-[#0F1A2C]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
          <Input
            type="text"
            placeholder="Search order or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      {/* Orders Payments Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[#5B6577]">
            <CreditCard className="h-10 w-10 text-gray-300 mb-2" />
            <p className="font-semibold text-[#0F1A2C]">No payment records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Order Number</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Payment Method & Status</th>
                  <th className="py-3 px-4 font-semibold">Courier Settlement</th>
                  <th className="py-3 px-4 font-semibold">Deductions (Fee / COD)</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredOrders.map((order) => {
                  const isPaid = order.payment_status === 'paid' || order.courier_settlement_status === 'received';
                  return (
                    <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-[#0F1A2C] block">#{order.order_number}</span>
                        <span className="text-[10px] text-[#5B6577]">{formatAdminDate(order.created_at)}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F1A2C]">{order.customer_name}</div>
                        <div className="text-[10px] text-[#5B6577] font-mono">{order.phone}</div>
                      </td>

                      <td className="py-3 px-4 font-bold text-[#0F1A2C] font-mono text-sm">
                        {formatAdminPrice(order.total)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                            {order.payment_method}
                          </span>
                          <StatusBadge type="payment" status={order.payment_status} />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            order.courier_settlement_status === 'received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.courier_settlement_status === 'waiting_settlement'
                              ? 'bg-blue-100 text-blue-800'
                              : order.courier_settlement_status === 'problem'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.courier_settlement_status || 'pending'}
                        </span>
                        {order.courier_name && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{order.courier_name}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-[#5B6577]">
                        Fee: ৳{order.courier_fee || 0} | COD: ৳{order.cod_charge || 0}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingOrder(order);
                            setCourierFee(order.courier_fee || 60);
                            setCodCharge(order.cod_charge || 0);
                            setSettlementStatus(order.courier_settlement_status || 'waiting_settlement');
                            setPaymentStatus(order.payment_status || 'paid');
                          }}
                          className="h-8 px-3 text-xs bg-[#17263E] text-white hover:bg-[#0F1A2C]"
                        >
                          Manage Payment
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1A2C]/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#0F1A2C]">
              Manage Payment & Settlement — #{editingOrder.order_number}
            </h3>
            <p className="text-xs text-[#5B6577]">
              Customer: <strong className="text-[#0F1A2C]">{editingOrder.customer_name}</strong> | Total: <strong className="text-[#0F1A2C]">{formatAdminPrice(editingOrder.total)}</strong>
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid (Collected)</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Courier Settlement Status</label>
                <select
                  value={settlementStatus}
                  onChange={(e) => setSettlementStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="waiting_settlement">Waiting Settlement from Courier</option>
                  <option value="received">Received from Courier / Settled</option>
                  <option value="problem">Problem / Return Dispute</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Courier Fee (৳)</label>
                  <Input
                    type="number"
                    min="0"
                    value={courierFee}
                    onChange={(e) => setCourierFee(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">COD Charge (৳)</label>
                  <Input
                    type="number"
                    min="0"
                    value={codCharge}
                    onChange={(e) => setCodCharge(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E1E4EA]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingOrder(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSavePaymentDetails()}
                disabled={updating}
                className="bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                {updating ? 'Saving...' : 'Save Payment Info'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

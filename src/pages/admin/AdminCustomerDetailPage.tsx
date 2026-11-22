import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  ShoppingBag,
  DollarSign,
  Ban,
  CheckCircle,
  Save,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Customer, Order } from '../../types/database';

export const AdminCustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { at, formatAdminPrice, formatAdminDate } = useAdminLanguage();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Notes
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Block Modal
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isUpdatingBlock, setIsUpdatingBlock] = useState(false);

  const fetchCustomer = async () => {
    if (!supabase || !id) return;
    setLoading(true);
    try {
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (custErr) throw custErr;
      const c = custData as Customer;
      setCustomer(c);
      setNotes(c.notes || '');

      // Fetch customer orders by phone
      const { data: ordData } = await supabase
        .from('orders')
        .select('*')
        .eq('phone', c.phone)
        .order('created_at', { ascending: false });

      setOrders((ordData || []) as Order[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load customer', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomer();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!supabase || !customer) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ notes: notes.trim() || null })
        .eq('id', customer.id);
      if (error) throw error;
      showToast({ type: 'success', title: 'Customer notes saved' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!supabase || !customer) return;
    setIsUpdatingBlock(true);
    try {
      const newStatus = !customer.is_blocked;
      const payload = {
        is_blocked: newStatus,
        block_reason: newStatus ? blockReason.trim() || 'Blocked by staff' : null,
      };

      const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
      if (error) throw error;

      setCustomer((prev) => (prev ? { ...prev, ...payload } : null));
      setIsBlockModalOpen(false);
      showToast({
        type: newStatus ? 'warning' : 'success',
        title: newStatus ? 'Customer Blocked' : 'Customer Unblocked',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setIsUpdatingBlock(false);
    }
  };

  if (loading || !customer) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" className="text-[#F47125]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/customers"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E4EA] bg-white text-[#5B6577] hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#0F1A2C]">{customer.name}</h1>
              {customer.is_blocked ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {at('orderDetail.blockedBadge')}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {at('common.active')}
                </span>
              )}
            </div>
            <p className="text-xs text-[#5B6577]">{at('suppliers.phone')}: {customer.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {customer.is_blocked ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleBlock}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              {at('customerDetail.unblock')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsBlockModalOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Ban className="h-3.5 w-3.5 mr-1" /> {at('customerDetail.block')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Order History Table */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#E1E4EA] bg-[#F8FAFC] px-5 py-3">
              <h2 className="text-sm font-bold text-[#0F1A2C]">
                {at('customerDetail.orderHistory', { count: orders.length })}
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5B6577]">
                {at('customerDetail.noOrders')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">{at('dashboard.col.order')}</th>
                      <th className="py-2.5 px-4 font-semibold">{at('activity.col.timestamp')}</th>
                      <th className="py-2.5 px-4 font-semibold">{at('orders.col.total')}</th>
                      <th className="py-2.5 px-4 font-semibold">{at('orders.col.payment')}</th>
                      <th className="py-2.5 px-4 font-semibold">{at('common.status')}</th>
                      <th className="py-2.5 px-4 text-right font-semibold">{at('orders.col.action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-bold text-[#0F1A2C]">
                          {o.order_number}
                        </td>
                        <td className="py-3 px-4 text-[#5B6577]">
                          {formatAdminDate(o.created_at)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0F1A2C] tabular-nums">
                          {formatAdminPrice(o.total)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="payment" status={o.payment_status} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="order" status={o.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/admin/orders/${o.id}`}
                            className="inline-flex items-center gap-1 font-bold text-[#17263E] hover:text-[#F47125]"
                          >
                            {at('common.view')} <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Profile details & notes */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('customerDetail.details')}
            </h2>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#5B6577]">{at('orderCreate.fullName')}</span>
                <p className="font-bold text-[#0F1A2C]">{customer.name}</p>
              </div>
              <div>
                <span className="text-[#5B6577]">{at('suppliers.phone')}:</span>
                <p className="font-mono font-bold text-[#0F1A2C]">{customer.phone}</p>
              </div>
              <div>
                <span className="text-[#5B6577]">{at('customerDetail.defaultAddress')}</span>
                <p className="text-[#0F1A2C]">{customer.default_address || '—'}</p>
              </div>
              <div>
                <span className="text-[#5B6577]">{at('orderDetail.districtLabel')}</span>
                <p className="font-bold text-[#F47125]">{customer.district || '—'}</p>
              </div>
            </div>

            {/* Quick Contact */}
            <div className="flex gap-2 pt-2 border-t border-[#F1F3F5]">
              <a
                href={`tel:${customer.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E1E4EA] py-2 text-xs font-bold text-[#0F1A2C] hover:bg-gray-50"
              >
                <Phone className="h-3.5 w-3.5 text-emerald-600" /> {at('suppliers.call')}
              </a>
              <a
                href={`https://wa.me/88${customer.phone.replace(/^0/, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
              </a>
            </div>

            {customer.is_blocked && customer.block_reason && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-800">
                <strong>{at('customerDetail.blockReason')}</strong> {customer.block_reason}
              </div>
            )}
          </div>

          {/* Internal Admin Notes */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('customerDetail.staffNotes')}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingNotes}
                onClick={handleSaveNotes}
              >
                {savingNotes ? at('common.saving') : at('common.save')}
              </Button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={at('orderDetail.staffNotePlaceholder')}
              className="w-full rounded-xl border border-[#E1E4EA] p-2 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Block Dialog */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" /> {at('customerDetail.block')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {customer.phone}
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
              <Button size="sm" className="bg-red-600 text-white" onClick={handleToggleBlock}>
                {isUpdatingBlock ? at('common.updating') : at('orderDetail.confirmBlock')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

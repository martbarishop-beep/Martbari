import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign, Calendar, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Coupon, CouponType } from '../../types/database';

export const AdminCouponsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { at, formatAdminPrice, formatAdminDate } = useAdminLanguage();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<CouponType>('percent');
  const [value, setValue] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(500);
  const [maxDiscount, setMaxDiscount] = useState<number | null>(null);
  const [usageLimit, setUsageLimit] = useState<number | null>(null);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteCandidate, setDeleteCandidate] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCoupons = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load coupons', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCoupons();
  }, []);

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code);
      setType(coupon.type);
      setValue(coupon.value);
      setMinOrderAmount(coupon.min_order_amount);
      setMaxDiscount(coupon.max_discount);
      setUsageLimit(coupon.usage_limit);
      setStartsAt(coupon.starts_at ? coupon.starts_at.slice(0, 16) : '');
      setEndsAt(coupon.ends_at ? coupon.ends_at.slice(0, 16) : '');
      setIsActive(coupon.is_active);
    } else {
      setEditingCoupon(null);
      setCode('');
      setType('percent');
      setValue(10);
      setMinOrderAmount(500);
      setMaxDiscount(null);
      setUsageLimit(null);
      setStartsAt('');
      setEndsAt('');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !code.trim() || value <= 0) return;

    setSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        min_order_amount: Number(minOrderAmount) || 0,
        max_discount: maxDiscount ? Number(maxDiscount) : null,
        usage_limit: usageLimit ? Number(usageLimit) : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: isActive,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
      }

      showToast({
        type: 'success',
        title: editingCoupon ? 'Coupon Updated' : 'Coupon Created',
      });
      setIsModalOpen(false);
      void fetchCoupons();
      await logActivity(
        editingCoupon ? 'UPDATE_COUPON' : 'CREATE_COUPON',
        'coupons',
        editingCoupon?.id || null,
        { code: code.toUpperCase() }
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!supabase || !deleteCandidate) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', deleteCandidate.id);
      if (error) throw error;
      showToast({ type: 'success', title: 'Coupon deleted' });
      setCoupons((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Delete failed', description: (err as Error)?.message });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('coupons.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('coupons.subtitle')}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => openModal()}
          className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
        >
          <Plus className="h-4 w-4" />
          {at('coupons.add')}
        </Button>
      </div>

      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">{at('coupons.noneFound')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">{at('coupons.col.code')}</th>
                  <th className="py-3 px-4 font-semibold">{at('coupons.col.discount')}</th>
                  <th className="py-3 px-4 font-semibold">{at('coupons.col.minOrder')}</th>
                  <th className="py-3 px-4 font-semibold">{at('coupons.col.maxCap')}</th>
                  <th className="py-3 px-4 font-semibold">{at('coupons.col.used')}</th>
                  <th className="py-3 px-4 font-semibold">{at('coupons.col.validity')}</th>
                  <th className="py-3 px-4 font-semibold">{at('common.status')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{at('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F1A2C]">
                      <span className="rounded bg-orange-50 px-2 py-1 text-[#F47125] border border-orange-200">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0F1A2C]">
                      {c.type === 'percent' ? `${c.value}%` : formatAdminPrice(c.value)}
                    </td>
                    <td className="py-3 px-4 text-[#5B6577] tabular-nums">{formatAdminPrice(c.min_order_amount)}</td>
                    <td className="py-3 px-4 text-[#5B6577] tabular-nums">
                      {c.max_discount ? formatAdminPrice(c.max_discount) : at('coupons.noCap')}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0F1A2C]">
                      {c.used_count} {c.usage_limit ? `/ ${c.usage_limit}` : ''}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#5B6577]">
                      {c.ends_at
                        ? at('coupons.until', { date: formatAdminDate(c.ends_at) })
                        : at('coupons.noExpiry')}
                    </td>
                    <td className="py-3 px-4">
                      {c.is_active ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {at('common.active')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                          {at('common.disabled')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(c)}
                          className="rounded p-1 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(c)}
                          className="rounded p-1 text-[#5B6577] hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveCoupon}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingCoupon ? at('coupons.edit') : at('coupons.create')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('coupons.col.code')} *</label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. MART10, EID2024"
                required
                className="font-mono text-xs font-bold uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('coupons.col.discount')}</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CouponType)}
                  className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C]"
                >
                  <option value="percent">%</option>
                  <option value="fixed">৳</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('coupons.col.discount')} *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  required
                  className="text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('coupons.col.minOrder')} (৳)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('coupons.col.maxCap')} (৳) <span className="text-[#5B6577]">({at('common.optional')})</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={maxDiscount ?? ''}
                  onChange={(e) =>
                    setMaxDiscount(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="%"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('coupons.col.used')} <span className="text-[#5B6577]">({at('common.optional')})</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={usageLimit ?? ''}
                  onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : null)}
                  placeholder="∞"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('coupons.col.validity')} <span className="text-[#5B6577]">({at('common.optional')})</span>
                </label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0F1A2C]">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#F47125]"
                />
                <span>{at('common.active')}</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E4EA]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                {at('common.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                {saving ? at('common.saving') : at('coupons.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('coupons.deleteTitle')}
          message={`${at('common.confirmProceed')} (${deleteCandidate.code})`}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteCoupon()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};

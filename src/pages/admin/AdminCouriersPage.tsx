import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  ExternalLink,
  Navigation,
  Phone,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../lib/auth';
import { formatPrice } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { isNonNegativeNumber, isValidBdPhone, normalizeBdPhone } from '../../lib/validation';
import type { Courier } from '../../types/database';

export const AdminCouriersPage: React.FC = () => {
  const { canAccess } = useAdminAuth();
  const { adminLang, at } = useAdminLanguage();
  const { showToast } = useToast();
  const canManage = canAccess('catalog');

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dhakaCharge, setDhakaCharge] = useState('70');
  const [outsideCharge, setOutsideCharge] = useState('130');
  const [codPercent, setCodPercent] = useState('1');
  const [trackingTemplate, setTrackingTemplate] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isTest, setIsTest] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteCandidate, setDeleteCandidate] = useState<Courier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    setTableMissing(false);
    try {
      const [cRes, oRes] = await Promise.all([
        supabase.from('couriers').select('*').order('name'),
        supabase.from('orders').select('courier_id, courier_name'),
      ]);

      if (cRes.error) {
        if (
          cRes.error.code === '42P01' ||
          cRes.error.message?.toLowerCase().includes('couriers')
        ) {
          setTableMissing(true);
          setCouriers([]);
          return;
        }
        throw cRes.error;
      }

      const list = (cRes.data || []) as Courier[];
      setCouriers(list);

      const counts: Record<string, number> = {};
      if (oRes.data) {
        for (const o of oRes.data as Array<{ courier_id?: string | null; courier_name?: string | null }>) {
          if (o.courier_id) {
            counts[o.courier_id] = (counts[o.courier_id] || 0) + 1;
          } else if (o.courier_name) {
            const matched = list.find(
              (c) => c.name.toLowerCase() === o.courier_name?.toLowerCase(),
            );
            if (matched) counts[matched.id] = (counts[matched.id] || 0) + 1;
          }
        }
      }
      setOrderCounts(counts);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'কুরিয়ার লোড হয়নি' : 'Failed to load couriers',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const openModal = (courier?: Courier) => {
    if (courier) {
      setEditingCourier(courier);
      setName(courier.name);
      setPhone(courier.phone || '');
      setDhakaCharge(String(courier.default_charge_dhaka ?? 70));
      setOutsideCharge(String(courier.default_charge_outside ?? 130));
      setCodPercent(String(courier.cod_fee_percent ?? 1));
      setTrackingTemplate(courier.tracking_url_template || '');
      setNotes(courier.notes || '');
      setIsActive(courier.is_active);
      setIsTest(Boolean(courier.is_test));
    } else {
      setEditingCourier(null);
      setName('');
      setPhone('');
      setDhakaCharge('70');
      setOutsideCharge('130');
      setCodPercent('1');
      setTrackingTemplate('https://steadfast.com.bd/t/{tracking_code}');
      setNotes('');
      setIsActive(true);
      setIsTest(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !name.trim()) return;

    const cleanPhone = phone.trim();
    if (cleanPhone && !isValidBdPhone(cleanPhone)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সঠিক ফোন নম্বর দিন' : 'Invalid BD phone number',
        description: adminLang === 'bn' ? '০১ দিয়ে শুরু ১১ ডিজিটের মোবাইল নম্বর দিন।' : 'Enter a valid 11-digit 01XXXXXXXXX number.',
      });
      return;
    }

    if (
      !isNonNegativeNumber(dhakaCharge) ||
      !isNonNegativeNumber(outsideCharge) ||
      !isNonNegativeNumber(codPercent) ||
      Number(codPercent) > 100
    ) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সঠিক চার্জ ও COD % দিন' : 'Invalid charges or COD %',
        description: adminLang === 'bn' ? 'সব চার্জ ০ বা তার বেশি এবং COD ফি ০-১০০% হতে হবে।' : 'Charges must be >= 0 and COD % between 0 and 100.',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: cleanPhone ? normalizeBdPhone(cleanPhone) : null,
        default_charge_dhaka: Number(dhakaCharge),
        default_charge_outside: Number(outsideCharge),
        cod_fee_percent: Number(codPercent),
        tracking_url_template: trackingTemplate.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
        is_test: isTest,
      };

      if (editingCourier) {
        const { error } = await supabase
          .from('couriers')
          .update(payload)
          .eq('id', editingCourier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('couriers').insert(payload);
        if (error) throw error;
      }

      showToast({
        type: 'success',
        title: editingCourier
          ? adminLang === 'bn' ? 'কুরিয়ার আপডেট হয়েছে' : 'Courier Updated'
          : adminLang === 'bn' ? 'নতুন কুরিয়ার যোগ হয়েছে' : 'Courier Added',
      });
      setIsModalOpen(false);
      void fetchData();
      await logActivity(
        editingCourier ? 'UPDATE_COURIER' : 'CREATE_COURIER',
        'couriers',
        editingCourier?.id || null,
        { name: payload.name },
      );
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সংরক্ষণ ব্যর্থ' : 'Save failed',
        description: (err as Error)?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (courier: Courier) => {
    if (!supabase || !canManage) return;
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ is_active: !courier.is_active })
        .eq('id', courier.id);
      if (error) throw error;
      setCouriers((prev) =>
        prev.map((c) => (c.id === courier.id ? { ...c, is_active: !c.is_active } : c)),
      );
      showToast({
        type: 'success',
        title: !courier.is_active
          ? adminLang === 'bn' ? 'কুরিয়ার সক্রিয় করা হয়েছে' : 'Courier activated'
          : adminLang === 'bn' ? 'কুরিয়ার নিষ্ক্রিয় করা হয়েছে' : 'Courier deactivated',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    }
  };

  const handleDelete = async () => {
    if (!supabase || !deleteCandidate) return;
    const linked = orderCounts[deleteCandidate.id] || 0;
    if (linked > 0 && !deleteCandidate.is_test) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'মুছে ফেলা যাবে না' : 'Cannot Delete Courier',
        description:
          adminLang === 'bn'
            ? `এই কুরিয়ারে ${linked}টি অর্ডার যুক্ত আছে। মুছে ফেলার বদলে নিষ্ক্রিয় (Inactive) করুন।`
            : `This courier has ${linked} linked order(s). Deactivate it instead.`,
      });
      setDeleteCandidate(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('couriers').delete().eq('id', deleteCandidate.id);
      if (error) throw error;
      setCouriers((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'কুরিয়ার মুছে ফেলা হয়েছে' : 'Courier Deleted',
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'মুছে ফেলা ব্যর্থ' : 'Delete failed',
        description: (err as Error)?.message,
      });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('couriers.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">{at('couriers.subtitle')}</p>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={() => openModal()}
            className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
          >
            <Plus className="h-4 w-4" />
            {at('couriers.add')}
          </Button>
        )}
      </div>

      {tableMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
          <p className="font-bold">
            {adminLang === 'bn'
              ? 'Supabase-এ এখনো couriers টেবিল তৈরি করা হয়নি'
              : 'Database migration pending: couriers table not found'}
          </p>
          <p>
            {adminLang === 'bn'
              ? 'Supabase SQL Editor-এ Part 1–4 SQL স্ক্রিপ্ট রান করলে কুরিয়ার তালিকা ও সেটেলমেন্ট সিস্টেম চালু হবে।'
              : 'Please execute SQL Parts 1–4 in your Supabase SQL Editor to enable Courier tracking and settlements.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : couriers.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-[#E1E4EA] bg-white py-12 text-center text-sm text-[#5B6577]">
            {at('couriers.noneFound')}
          </div>
        ) : (
          couriers.map((c) => {
            const linked = orderCounts[c.id] || 0;
            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[#0F1A2C]">{c.name}</h3>
                        {c.is_test && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {at('orders.testBadge')}
                          </span>
                        )}
                      </div>
                      <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {adminLang === 'bn' ? `${linked}টি অর্ডার` : `${linked} linked orders`}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => void handleToggleActive(c)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                        c.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.is_active ? at('common.active') : at('common.inactive')}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] p-2.5 text-center border border-[#E1E4EA]">
                    <div>
                      <p className="text-[10px] text-[#5B6577]">
                        {adminLang === 'bn' ? 'ঢাকা' : 'Dhaka'}
                      </p>
                      <p className="text-xs font-bold text-[#0F1A2C] tabular-nums">
                        {formatPrice(Number(c.default_charge_dhaka || 0), adminLang)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#5B6577]">
                        {adminLang === 'bn' ? 'বাইরে' : 'Outside'}
                      </p>
                      <p className="text-xs font-bold text-[#0F1A2C] tabular-nums">
                        {formatPrice(Number(c.default_charge_outside || 0), adminLang)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#5B6577]">COD %</p>
                      <p className="text-xs font-bold text-[#F47125] tabular-nums">
                        {c.cod_fee_percent}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#5B6577]">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-mono">{c.phone}</span>
                      </div>
                    )}
                    {c.tracking_url_template && (
                      <div className="flex items-center gap-2">
                        <Navigation className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{c.tracking_url_template}</span>
                      </div>
                    )}
                    {c.notes && (
                      <p className="rounded-lg bg-gray-50 p-2 text-[11px] text-[#5B6577]">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#F1F3F5] pt-3">
                  {c.phone ? (
                    <a
                      href={`tel:${c.phone}`}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-[#0F1A2C] hover:bg-gray-200"
                    >
                      {at('suppliers.call')}
                    </a>
                  ) : c.tracking_url_template ? (
                    <a
                      href={c.tracking_url_template.replace('{tracking_code}', '')}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      {adminLang === 'bn' ? 'পোর্টাল' : 'Portal'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span />
                  )}

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openModal(c)}
                        className="rounded p-1.5 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C] cursor-pointer"
                        title={at('common.edit')}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(c)}
                        className="rounded p-1.5 text-[#5B6577] hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        title={at('common.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingCourier ? at('couriers.edit') : at('couriers.add')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                {at('couriers.nameLabel')}
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Steadfast Courier"
                required
                className="text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                  {at('suppliers.phone')}
                </label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                  {at('couriers.codPercent')}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={codPercent}
                  onChange={(e) => setCodPercent(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                  {at('couriers.dhakaCharge')}
                </label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={dhakaCharge}
                  onChange={(e) => setDhakaCharge(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                  {at('couriers.outsideCharge')}
                </label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={outsideCharge}
                  onChange={(e) => setOutsideCharge(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                {at('couriers.trackingTemplate')}
              </label>
              <Input
                type="text"
                value={trackingTemplate}
                onChange={(e) => setTrackingTemplate(e.target.value)}
                placeholder="https://steadfast.com.bd/t/{tracking_code}"
                className="font-mono text-xs"
              />
              <p className="mt-1 text-[10px] text-[#5B6577]">
                {adminLang === 'bn'
                  ? 'ট্র্যাকিং কোডের জায়গায় {tracking_code} ব্যবহার করুন'
                  : 'Use {tracking_code} placeholder to auto-generate tracking links'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                {at('suppliers.notes')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={adminLang === 'bn' ? 'হাব ঠিকানা বা পেমেন্ট শর্ত...' : 'Merchant hub / payout schedule...'}
                className="w-full rounded-xl border border-[#E1E4EA] p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1 text-xs">
              <label className="flex items-center gap-2 font-semibold text-[#0F1A2C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#F47125]"
                />
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {at('common.active')}
              </label>

              <label className="flex items-center gap-2 font-semibold text-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTest}
                  onChange={(e) => setIsTest(e.target.checked)}
                  className="rounded text-amber-600"
                />
                {adminLang === 'bn' ? 'টেস্ট এন্ট্রি (is_test)' : 'Mark as Test (is_test)'}
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E1E4EA] pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                {at('common.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                {saving ? at('common.saving') : at('couriers.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={adminLang === 'bn' ? 'কুরিয়ার মুছবেন?' : 'Delete Courier?'}
          message={`${deleteCandidate.name} — ${at('common.confirmProceed')}`}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};

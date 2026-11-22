import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Truck,
  Phone,
  MessageCircle,
  Globe,
  Mail,
  MapPin,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Supplier } from '../../types/database';

export const AdminSuppliersPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { at } = useAdminLanguage();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('products').select('supplier_id'),
      ]);

      if (sRes.error) throw sRes.error;
      setSuppliers((sRes.data || []) as Supplier[]);

      const counts: Record<string, number> = {};
      if (pRes.data) {
        pRes.data.forEach((p) => {
          if (p.supplier_id) counts[p.supplier_id] = (counts[p.supplier_id] || 0) + 1;
        });
      }
      setProductCounts(counts);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load suppliers', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setPhone(supplier.phone || '');
      setWhatsapp(supplier.whatsapp || '');
      setEmail(supplier.email || '');
      setWebsite(supplier.website || '');
      setAddress(supplier.address || '');
      setNotes(supplier.notes || '');
      setIsActive(supplier.is_active);
    } else {
      setEditingSupplier(null);
      setName('');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setWebsite('');
      setAddress('');
      setNotes('');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', editingSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert(payload);
        if (error) throw error;
      }

      showToast({
        type: 'success',
        title: editingSupplier ? 'Supplier Updated' : 'Supplier Added',
      });
      setIsModalOpen(false);
      void fetchData();
      await logActivity(
        editingSupplier ? 'UPDATE_SUPPLIER' : 'CREATE_SUPPLIER',
        'suppliers',
        editingSupplier?.id || null,
        { name }
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supabase || !deleteCandidate) return;

    const count = productCounts[deleteCandidate.id] || 0;
    if (count > 0) {
      showToast({
        type: 'error',
        title: 'Cannot Delete Supplier',
        description: `This supplier has ${count} assigned product(s). Please reassign or update them first.`,
      });
      setDeleteCandidate(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', deleteCandidate.id);
      if (error) throw error;

      showToast({ type: 'success', title: 'Supplier Deleted' });
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteCandidate.id));
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
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('suppliers.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">
            {at('suppliers.subtitle')}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => openModal()}
          className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
        >
          <Plus className="h-4 w-4" />
          {at('suppliers.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-[#5B6577]">
            {at('suppliers.noneFound')}
          </div>
        ) : (
          suppliers.map((s) => {
            const count = productCounts[s.id] || 0;
            return (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-[#0F1A2C] text-base">{s.name}</h3>
                      <span className="text-[10px] text-[#5B6577] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                        {at('suppliers.linkedCount', { count })}
                      </span>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        s.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                      title={s.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>

                  {/* Contact details */}
                  <div className="mt-4 space-y-1.5 text-xs text-[#5B6577]">
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-mono">{s.phone}</span>
                      </div>
                    )}
                    {s.whatsapp && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-mono text-emerald-700">{s.whatsapp}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span>{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{s.address}</span>
                      </div>
                    )}
                  </div>

                  {s.notes && (
                    <p className="mt-3 rounded-lg bg-gray-50 p-2 text-[11px] text-[#5B6577]">
                      {s.notes}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between border-t border-[#F1F3F5] pt-3">
                  <div className="flex items-center gap-1.5">
                    {s.whatsapp && (
                      <a
                        href={`https://wa.me/88${s.whatsapp.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        WhatsApp
                      </a>
                    )}
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-[#0F1A2C] hover:bg-gray-200"
                      >
                        {at('suppliers.call')}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openModal(s)}
                      className="rounded p-1 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCandidate(s)}
                      className="rounded p-1 text-[#5B6577] hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingSupplier ? at('suppliers.edit') : at('suppliers.add')}
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
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('suppliers.nameLabel')}
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dhaka Gadget Wholesale"
                required
                className="text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('suppliers.phone')}</label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">WhatsApp</label>
                <Input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('suppliers.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@gmail.com"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('suppliers.website')}
              </label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('suppliers.address')}</label>
              <Input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Stadium Market, Dhaka"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('suppliers.notes')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, delivery cutoff time..."
                className="w-full rounded-xl border border-[#E1E4EA] p-2 text-xs"
              />
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
                {saving ? at('common.saving') : at('suppliers.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('suppliers.deleteTitle')}
          message={`${deleteCandidate.name} — ${at('common.confirmProceed')}`}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteSupplier()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};

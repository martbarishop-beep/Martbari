import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Brand } from '../../types/database';

export const AdminBrandsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { at } = useAdminLanguage();
  const { showToast } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteCandidate, setDeleteCandidate] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        supabase.from('brands').select('*').order('name'),
        supabase.from('products').select('brand_id'),
      ]);

      if (bRes.error) throw bRes.error;
      setBrands((bRes.data || []) as Brand[]);

      const counts: Record<string, number> = {};
      if (pRes.data) {
        pRes.data.forEach((p) => {
          if (p.brand_id) counts[p.brand_id] = (counts[p.brand_id] || 0) + 1;
        });
      }
      setProductCounts(counts);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load brands', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const openModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setName(brand.name);
      setSlug(brand.slug);
      setLogoUrl(brand.logo_url || '');
      setIsActive(brand.is_active);
    } else {
      setEditingBrand(null);
      setName('');
      setSlug('');
      setLogoUrl('');
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingBrand) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !name.trim()) return;

    setSaving(true);
    try {
      const finalSlug =
        slug.trim() ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const payload = {
        name: name.trim(),
        slug: finalSlug,
        logo_url: logoUrl || null,
        is_active: isActive,
      };

      if (editingBrand) {
        const { error } = await supabase.from('brands').update(payload).eq('id', editingBrand.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('brands').insert(payload);
        if (error) throw error;
      }

      showToast({
        type: 'success',
        title: editingBrand ? 'Brand Updated' : 'Brand Created',
      });
      setIsModalOpen(false);
      void fetchData();
      await logActivity(
        editingBrand ? 'UPDATE_BRAND' : 'CREATE_BRAND',
        'brands',
        editingBrand?.id || null,
        { name }
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!supabase || !deleteCandidate) return;

    const count = productCounts[deleteCandidate.id] || 0;
    if (count > 0) {
      showToast({
        type: 'error',
        title: 'Cannot Delete Brand',
        description: `This brand is assigned to ${count} product(s). Please reassign them first.`,
      });
      setDeleteCandidate(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('brands').delete().eq('id', deleteCandidate.id);
      if (error) throw error;
      showToast({ type: 'success', title: 'Brand deleted' });
      setBrands((prev) => prev.filter((b) => b.id !== deleteCandidate.id));
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
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('brands.title')}</h1>
          <p className="text-sm text-[#5B6577]">{at('brands.subtitle')}</p>
        </div>

        <Button
          size="sm"
          onClick={() => openModal()}
          className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
        >
          <Plus className="h-4 w-4" />
          {at('brands.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : brands.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-[#5B6577]">
            {at('brands.noneFound')}
          </div>
        ) : (
          brands.map((b) => {
            const count = productCounts[b.id] || 0;
            return (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E1E4EA] bg-gray-50 flex items-center justify-center p-1">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain" />
                    ) : (
                      <Tag className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-[#0F1A2C]">{b.name}</h3>
                    <p className="text-[11px] font-mono text-gray-400">/{b.slug}</p>
                    <span className="text-[10px] text-[#5B6577] bg-gray-100 px-1.5 py-0.2 rounded mt-1 inline-block">
                      {at('categories.productCount', { count })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-1 border-t border-[#F1F3F5] pt-3">
                  <button
                    onClick={() => openModal(b)}
                    className="rounded p-1 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(b)}
                    className="rounded p-1 text-[#5B6577] hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveBrand}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingBrand ? at('brands.edit') : at('brands.add')}
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
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('brands.nameLabel')}</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Xiaomi, Baseus, Anker"
                required
                className="text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Slug</label>
              <Input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="xiaomi"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('brands.logoLabel')}</label>
              <ImageUploader
                bucket="brands"
                images={logoUrl ? [logoUrl] : []}
                onChange={(imgs) => setLogoUrl(imgs[0] || '')}
                maxImages={1}
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
                {saving ? at('common.saving') : at('brands.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('brands.deleteTitle')}
          message={`${deleteCandidate.name} — ${at('common.confirmProceed')}`}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteBrand()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Image as ImageIcon,
  Check,
  X,
  AlertTriangle,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { BilingualField } from '../../components/admin/BilingualField';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Category } from '../../types/database';

export const AdminCategoriesPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { at, tAdminField } = useAdminLanguage();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [seoTitleBn, setSeoTitleBn] = useState('');
  const [seoTitleEn, setSeoTitleEn] = useState('');
  const [seoDescBn, setSeoDescBn] = useState('');
  const [seoDescEn, setSeoDescEn] = useState('');

  // Delete State
  const [deleteCandidate, setDeleteCandidate] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('products').select('category_id'),
      ]);

      if (catRes.error) throw catRes.error;
      const cats = (catRes.data || []) as Category[];
      setCategories(cats);

      // Count products per category
      const counts: Record<string, number> = {};
      if (prodRes.data) {
        prodRes.data.forEach((p) => {
          if (p.category_id) {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
          }
        });
      }
      setProductCounts(counts);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load categories', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Open Add/Edit Modal
  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setNameBn(category.name_bn);
      setNameEn(category.name_en);
      setSlug(category.slug);
      setParentId(category.parent_id || '');
      setImageUrl(category.image_url || '');
      setSortOrder(category.sort_order || 0);
      setIsActive(category.is_active);
      setSeoTitleBn(category.seo_title_bn || '');
      setSeoTitleEn(category.seo_title_en || '');
      setSeoDescBn(category.seo_desc_bn || '');
      setSeoDescEn(category.seo_desc_en || '');
    } else {
      setEditingCategory(null);
      setNameBn('');
      setNameEn('');
      setSlug('');
      setParentId('');
      setImageUrl('');
      setSortOrder(categories.length);
      setIsActive(true);
      setSeoTitleBn('');
      setSeoTitleEn('');
      setSeoDescBn('');
      setSeoDescEn('');
    }
    setIsModalOpen(true);
  };

  const handleNameEnChange = (val: string) => {
    setNameEn(val);
    if (!editingCategory) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!nameEn.trim() || !nameBn.trim()) {
      showToast({ type: 'error', title: 'Both Bangla and English category names are required' });
      return;
    }

    setSaving(true);
    try {
      const finalSlug =
        slug.trim() ||
        nameEn
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const payload = {
        name_en: nameEn.trim(),
        name_bn: nameBn.trim(),
        slug: finalSlug,
        parent_id: parentId || null,
        image_url: imageUrl || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
        seo_title_en: seoTitleEn.trim() || null,
        seo_title_bn: seoTitleBn.trim() || null,
        seo_desc_en: seoDescEn.trim() || null,
        seo_desc_bn: seoDescBn.trim() || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }

      showToast({
        type: 'success',
        title: editingCategory ? 'Category Updated' : 'Category Created',
      });
      setIsModalOpen(false);
      void fetchData();
      await logActivity(
        editingCategory ? 'UPDATE_CATEGORY' : 'CREATE_CATEGORY',
        'categories',
        editingCategory?.id || null,
        { name: nameEn }
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  // Delete Category Check
  const handleDeleteCategory = async () => {
    if (!supabase || !deleteCandidate) return;

    const count = productCounts[deleteCandidate.id] || 0;
    if (count > 0) {
      showToast({
        type: 'error',
        title: 'Cannot Delete Category',
        description: `This category has ${count} assigned product(s). Please reassign or delete the products first.`,
      });
      setDeleteCandidate(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteCandidate.id);
      if (error) throw error;

      showToast({ type: 'success', title: 'Category Deleted' });
      setCategories((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Delete failed', description: (err as Error)?.message });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  // Group into Parents and Subcategories
  const parentCategories = categories.filter((c) => !c.parent_id);
  const subCategoriesByParent: Record<string, Category[]> = {};
  categories
    .filter((c) => c.parent_id)
    .forEach((sub) => {
      if (sub.parent_id) {
        if (!subCategoriesByParent[sub.parent_id]) {
          subCategoriesByParent[sub.parent_id] = [];
        }
        subCategoriesByParent[sub.parent_id].push(sub);
      }
    });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('categories.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('categories.subtitle')}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => openModal()}
          className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
        >
          <Plus className="h-4 w-4" />
          {at('categories.add')}
        </Button>
      </div>

      {/* Categories Tree Grid */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : parentCategories.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">{at('categories.noneFound')}</div>
        ) : (
          <div className="divide-y divide-[#E1E4EA]">
            {parentCategories.map((parent) => {
              const subs = subCategoriesByParent[parent.id] || [];
              const pCount = productCounts[parent.id] || 0;

              return (
                <div key={parent.id} className="p-4 sm:p-5">
                  {/* Parent Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E1E4EA] bg-gray-50 flex items-center justify-center">
                        {parent.image_url ? (
                          <img
                            src={parent.image_url}
                            alt={parent.name_en}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Folder className="h-5 w-5 text-[#F47125]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#0F1A2C]">{tAdminField(parent, 'name')}</h3>
                          <span className="text-xs text-[#5B6577]">({parent.name_bn === tAdminField(parent, 'name') ? parent.name_en : parent.name_bn})</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-[#5B6577]">
                            {at('categories.productCount', { count: pCount })}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-400">/category/{parent.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(parent)}
                        className="rounded-lg p-1.5 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]"
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(parent)}
                        className="rounded-lg p-1.5 text-[#5B6577] hover:bg-red-50 hover:text-red-600"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Child Subcategories */}
                  {subs.length > 0 && (
                    <div className="ml-12 mt-3 space-y-2 border-l-2 border-[#E1E4EA] pl-4">
                      {subs.map((sub) => {
                        const sCount = productCounts[sub.id] || 0;
                        return (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-xl bg-gray-50/70 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#0F1A2C]">{tAdminField(sub, 'name')}</span>
                              <span className="text-gray-400">({sub.name_bn === tAdminField(sub, 'name') ? sub.name_en : sub.name_bn})</span>
                              <span className="text-[10px] text-[#5B6577] bg-white border border-[#E1E4EA] px-1.5 py-0.2 rounded">
                                {at('categories.productCount', { count: sCount })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openModal(sub)}
                                className="p-1 text-[#5B6577] hover:text-[#0F1A2C]"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidate(sub)}
                                className="p-1 text-[#5B6577] hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveCategory}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingCategory ? at('categories.edit') : at('categories.addNew')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <BilingualField
              label="Category Name"
              required
              valueBn={nameBn}
              valueEn={nameEn}
              onChangeBn={setNameBn}
              onChangeEn={handleNameEnChange}
              placeholderBn="যেমন: স্মার্ট ওয়াচ"
              placeholderEn="e.g. Smart Watches"
            />

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Slug</label>
              <Input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="smart-watches"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('categories.parentLabel')} <span className="text-[#5B6577]">({at('common.optional')})</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="">{at('categories.topLevel')}</option>
                {parentCategories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {tAdminField(p, 'name')}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Image</label>
              <ImageUploader
                bucket="categories"
                images={imageUrl ? [imageUrl] : []}
                onChange={(imgs) => setImageUrl(imgs[0] || '')}
                maxImages={1}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('categories.sortOrder')}</label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center pt-5">
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
                {saving ? at('common.saving') : at('categories.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('categories.deleteTitle')}
          message={`${tAdminField(deleteCandidate, 'name')} — ${at('common.confirmProceed')}`}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteCategory()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};

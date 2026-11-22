import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, ExternalLink, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { isDemoBanner } from '../../config/demoCatalog';
import { Banner } from '../../types/database';

export const AdminBannersPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, tAdminField } = useAdminLanguage();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [labelBn, setLabelBn] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [subtitleBn, setSubtitleBn] = useState('');
  const [subtitleEn, setSubtitleEn] = useState('');
  const [priceBadgeBn, setPriceBadgeBn] = useState('');
  const [priceBadgeEn, setPriceBadgeEn] = useState('');
  const [buttonTextBn, setButtonTextBn] = useState('');
  const [buttonTextEn, setButtonTextEn] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [secondaryLinkUrl, setSecondaryLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteCandidate, setDeleteCandidate] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBanners = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBanners((data || []) as Banner[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load banners', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBanners();
  }, []);

  const openModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setImageUrl(banner.image_url);
      setLabelBn(banner.label_bn || '');
      setLabelEn(banner.label_en || '');
      setTitleBn(banner.title_bn || '');
      setTitleEn(banner.title_en || '');
      setSubtitleBn(banner.subtitle_bn || '');
      setSubtitleEn(banner.subtitle_en || '');
      setPriceBadgeBn(banner.price_badge_bn || '');
      setPriceBadgeEn(banner.price_badge_en || '');
      setButtonTextBn(banner.button_text_bn || '');
      setButtonTextEn(banner.button_text_en || '');
      setLinkUrl(banner.link_url || '');
      setSecondaryLinkUrl(banner.secondary_link_url || '');
      setSortOrder(banner.sort_order);
      setIsActive(banner.is_active);
    } else {
      setEditingBanner(null);
      setImageUrl('');
      setLabelBn('');
      setLabelEn('');
      setTitleBn('');
      setTitleEn('');
      setSubtitleBn('');
      setSubtitleEn('');
      setPriceBadgeBn('');
      setPriceBadgeEn('');
      setButtonTextBn('');
      setButtonTextEn('');
      setLinkUrl('');
      setSecondaryLinkUrl('');
      setSortOrder(banners.length);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !imageUrl) {
      showToast({ type: 'error', title: 'Banner image is required' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        image_url: imageUrl,
        label_bn: labelBn.trim() || null,
        label_en: labelEn.trim() || null,
        title_bn: titleBn.trim() || null,
        title_en: titleEn.trim() || null,
        subtitle_bn: subtitleBn.trim() || null,
        subtitle_en: subtitleEn.trim() || null,
        price_badge_bn: priceBadgeBn.trim() || null,
        price_badge_en: priceBadgeEn.trim() || null,
        button_text_bn: buttonTextBn.trim() || null,
        button_text_en: buttonTextEn.trim() || null,
        link_url: linkUrl.trim() || null,
        secondary_link_url: secondaryLinkUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(payload)
          .eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banners').insert(payload);
        if (error) throw error;
      }

      showToast({
        type: 'success',
        title: editingBanner ? 'Banner Updated' : 'Banner Added',
      });
      setIsModalOpen(false);
      void fetchBanners();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!supabase || !deleteCandidate) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('banners').delete().eq('id', deleteCandidate.id);
      if (error) throw error;
      showToast({ type: 'success', title: 'Banner deleted' });
      setBanners((prev) => prev.filter((b) => b.id !== deleteCandidate.id));
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Delete failed', description: (err as Error)?.message });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  const handleQuickToggleActive = async (banner: Banner) => {
    if (!supabase) return;
    const next = !banner.is_active;
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: next })
        .eq('id', banner.id);
      if (error) throw error;
      setBanners((prev) =>
        prev.map((item) => (item.id === banner.id ? { ...item, is_active: next } : item)),
      );
      showToast({ type: 'success', title: at('banners.toggleSuccess') });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('banners.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('banners.subtitle')}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => openModal()}
          className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
        >
          <Plus className="h-4 w-4" />
          {at('banners.add')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-[#5B6577]">
            {at('banners.noneFound')}
          </div>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className="overflow-hidden rounded-2xl border border-[#E1E4EA] bg-white shadow-xs flex flex-col justify-between"
            >
              <div className="relative aspect-21/9 w-full bg-gray-100 overflow-hidden">
                <img src={b.image_url} alt={tAdminField(b, 'title') || 'Banner'} className="h-full w-full object-cover" />
                <span className="absolute top-2 left-2 rounded-full bg-[#17263E]/80 text-white px-2 py-0.5 text-[10px] font-bold">
                  {at('categories.sortOrder')}: {b.sort_order} · {isDemoBanner(b) ? at('banners.demoBadge') : at('banners.customBadge')}
                </span>
                <button
                  type="button"
                  onClick={() => void handleQuickToggleActive(b)}
                  className={`absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                    b.is_active ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {b.is_active ? at('common.active') : at('common.inactive')}
                </button>
              </div>

              <div className="p-4 space-y-2">
                <div className="font-bold text-sm text-[#0F1A2C]">
                  {tAdminField(b, 'title') || at('banners.untitled')}
                </div>
                {b.title_bn && b.title_en && (
                  <div className="text-xs text-[#5B6577]">{b.title_bn} / {b.title_en}</div>
                )}
                {b.link_url && (
                  <div className="text-xs text-[#F47125] truncate">{b.link_url}</div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F3F5]">
                  <button
                    type="button"
                    onClick={() => openModal(b)}
                    className="p-1.5 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C] rounded-lg cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(b)}
                    className="p-1.5 text-[#5B6577] hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveBanner}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingBanner ? at('banners.edit') : at('banners.add')}
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
                Banner Image * <span className="font-normal text-[#5B6577]">({at('banners.recommendedSize')})</span>
              </label>
              <ImageUploader
                bucket="banners"
                images={imageUrl ? [imageUrl] : []}
                onChange={(imgs) => setImageUrl(imgs[0] || '')}
                maxImages={1}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Label (English)
                </label>
                <Input
                  type="text"
                  value={labelEn}
                  onChange={(e) => setLabelEn(e.target.value)}
                  placeholder="e.g. Smart Watches"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Label (Bangla)
                </label>
                <Input
                  type="text"
                  value={labelBn}
                  onChange={(e) => setLabelBn(e.target.value)}
                  placeholder="স্মার্ট ওয়াচ"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Title (English)
                </label>
                <Input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. AMOLED Smart Watches"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Title (Bangla)
                </label>
                <Input
                  type="text"
                  value={titleBn}
                  onChange={(e) => setTitleBn(e.target.value)}
                  placeholder="অ্যামোলেড স্মার্ট ওয়াচ"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Subtitle (English)
                </label>
                <Input
                  type="text"
                  value={subtitleEn}
                  onChange={(e) => setSubtitleEn(e.target.value)}
                  placeholder="One-line highlight"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Subtitle (Bangla)
                </label>
                <Input
                  type="text"
                  value={subtitleBn}
                  onChange={(e) => setSubtitleBn(e.target.value)}
                  placeholder="এক লাইনের বিবরণ"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Price Badge (English)
                </label>
                <Input
                  type="text"
                  value={priceBadgeEn}
                  onChange={(e) => setPriceBadgeEn(e.target.value)}
                  placeholder="From ৳990"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Price Badge (Bangla)
                </label>
                <Input
                  type="text"
                  value={priceBadgeBn}
                  onChange={(e) => setPriceBadgeBn(e.target.value)}
                  placeholder="শুরু ৳৯৯০ থেকে"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Button Text (English)
                </label>
                <Input
                  type="text"
                  value={buttonTextEn}
                  onChange={(e) => setButtonTextEn(e.target.value)}
                  placeholder="Shop Now"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Button Text (Bangla)
                </label>
                <Input
                  type="text"
                  value={buttonTextBn}
                  onChange={(e) => setButtonTextBn(e.target.value)}
                  placeholder="এখনই কিনুন"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Primary Link URL
                </label>
                <Input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/category/smart-watches"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Secondary Offers URL
                </label>
                <Input
                  type="text"
                  value={secondaryLinkUrl}
                  onChange={(e) => setSecondaryLinkUrl(e.target.value)}
                  placeholder="/shop?on_sale=true"
                  className="text-xs font-mono"
                />
              </div>
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
                  <span>{at('banners.displayOnHome')}</span>
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
                {saving ? at('common.saving') : at('banners.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('banners.deleteTitle')}
          message={at('common.confirmProceed')}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteBanner()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};

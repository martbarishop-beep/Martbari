import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  EyeOff,
  Image as ImageIcon,
  Pause,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { isDemoBanner } from '../../config/demoCatalog';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { clearHomeCache } from '../HomePage';
import type { Banner } from '../../types/database';

interface ProductOption {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
}

type BannerDisplayMode = 'cover-only' | 'with-overlay';

export const AdminBannersPage: React.FC = () => {
  const { showToast } = useToast();
  const { adminLang, at, tAdminField } = useAdminLanguage();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [displayMode, setDisplayMode] = useState<BannerDisplayMode>('cover-only');
  const [imageUrl, setImageUrl] = useState('');
  const [productId, setProductId] = useState<string>('');
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
      const [{ data: bannerData, error: bannerErr }, { data: prodData }] = await Promise.all([
        supabase.from('banners').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('public_products')
          .select('id, name_bn, name_en, slug')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (bannerErr) throw bannerErr;
      setBanners((bannerData || []) as Banner[]);
      if (prodData) {
        setProducts(prodData as ProductOption[]);
      }
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Failed to load banners',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBanners();
  }, []);

  const hasCustomBanners = useMemo(
    () => banners.some((b) => !isDemoBanner(b)),
    [banners],
  );
  const activeDemoBanners = useMemo(
    () => banners.filter((b) => isDemoBanner(b) && b.is_active),
    [banners],
  );

  const openModal = (banner?: Banner) => {
    if (banner) {
      const hasOverlayCopy = Boolean(
        banner.title_bn ||
          banner.title_en ||
          banner.subtitle_bn ||
          banner.subtitle_en ||
          banner.label_bn ||
          banner.label_en ||
          banner.button_text_bn ||
          banner.button_text_en,
      );
      setEditingBanner(banner);
      setDisplayMode(hasOverlayCopy ? 'with-overlay' : 'cover-only');
      setImageUrl(banner.image_url);
      setProductId(banner.product_id || '');
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
      const customCount = banners.filter((b) => !isDemoBanner(b)).length;
      setEditingBanner(null);
      setDisplayMode('cover-only');
      setImageUrl('');
      setProductId('');
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
      setSortOrder(customCount);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleProductChange = (selectedId: string) => {
    setProductId(selectedId);
    if (selectedId) {
      const matched = products.find((p) => p.id === selectedId);
      if (matched && (!linkUrl || linkUrl.startsWith('/product/'))) {
        setLinkUrl(`/product/${matched.slug}`);
      }
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !imageUrl.trim()) {
      showToast({ type: 'error', title: 'Banner image is required' });
      return;
    }

    setSaving(true);
    try {
      const isCoverOnly = displayMode === 'cover-only';
      const payload = {
        image_url: imageUrl.trim(),
        product_id: productId || null,
        label_bn: isCoverOnly ? null : labelBn.trim() || null,
        label_en: isCoverOnly ? null : labelEn.trim() || null,
        title_bn: isCoverOnly ? null : titleBn.trim() || null,
        title_en: isCoverOnly ? null : titleEn.trim() || null,
        subtitle_bn: isCoverOnly ? null : subtitleBn.trim() || null,
        subtitle_en: isCoverOnly ? null : subtitleEn.trim() || null,
        price_badge_bn: isCoverOnly ? null : priceBadgeBn.trim() || null,
        price_badge_en: isCoverOnly ? null : priceBadgeEn.trim() || null,
        button_text_bn: isCoverOnly ? null : buttonTextBn.trim() || null,
        button_text_en: isCoverOnly ? null : buttonTextEn.trim() || null,
        link_url: linkUrl.trim() || null,
        secondary_link_url: isCoverOnly ? null : secondaryLinkUrl.trim() || null,
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

      clearHomeCache();
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
      clearHomeCache();
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
      clearHomeCache();
      setBanners((prev) =>
        prev.map((item) => (item.id === banner.id ? { ...item, is_active: next } : item)),
      );
      showToast({ type: 'success', title: at('banners.toggleSuccess') });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    }
  };

  const handleHideAllDemoBanners = async () => {
    if (!supabase || activeDemoBanners.length === 0) return;
    try {
      const ids = activeDemoBanners.map((b) => b.id);
      const { error } = await supabase.from('banners').update({ is_active: false }).in('id', ids);
      if (error) throw error;
      clearHomeCache();
      setBanners((prev) =>
        prev.map((b) => (ids.includes(b.id) ? { ...b, is_active: false } : b)),
      );
      showToast({ type: 'success', title: at('banners.toggleSuccess') });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    }
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    if (!supabase) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const current = banners[index];
    const swapWith = banners[targetIdx];
    const nextCurrentOrder = swapWith.sort_order === current.sort_order ? targetIdx : swapWith.sort_order;
    const nextSwapOrder = current.sort_order === swapWith.sort_order ? index : current.sort_order;

    try {
      await Promise.all([
        supabase.from('banners').update({ sort_order: nextCurrentOrder }).eq('id', current.id),
        supabase.from('banners').update({ sort_order: nextSwapOrder }).eq('id', swapWith.id),
      ]);
      clearHomeCache();
      const updated = [...banners];
      updated[index] = { ...swapWith, sort_order: nextSwapOrder };
      updated[targetIdx] = { ...current, sort_order: nextCurrentOrder };
      setBanners(updated);
      showToast({ type: 'success', title: at('banners.orderUpdated') });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Reorder failed', description: (err as Error)?.message });
    }
  };

  const previewTitle = adminLang === 'bn' ? titleBn || titleEn : titleEn || titleBn;
  const previewLabel = adminLang === 'bn' ? labelBn || labelEn : labelEn || labelBn;
  const previewCta = adminLang === 'bn' ? buttonTextBn || buttonTextEn : buttonTextEn || buttonTextBn;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('banners.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">{at('banners.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          {hasCustomBanners && activeDemoBanners.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleHideAllDemoBanners()}
              className="gap-1.5"
            >
              <EyeOff className="h-4 w-4" />
              {adminLang === 'bn' ? 'ডেমো ব্যানার লুকান' : 'Hide Demo Banners'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => openModal()}
            className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
          >
            <Plus className="h-4 w-4" />
            {at('banners.add')}
          </Button>
        </div>
      </div>

      {hasCustomBanners && (
        <div className="rounded-xl border border-[#F47125]/25 bg-[#FFF4EC] px-4 py-2.5 text-xs font-medium text-[#0F1A2C]">
          {at('banners.customPriorityHint')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[#E1E4EA] bg-white py-12 text-center text-sm text-[#5B6577]">
            {at('banners.noneFound')}
          </div>
        ) : (
          banners.map((b, idx) => {
            const isDemo = isDemoBanner(b);
            const displayTitle = tAdminField(b, 'title');

            return (
              <div
                key={b.id}
                className="overflow-hidden rounded-2xl border border-[#E1E4EA] bg-white shadow-xs flex flex-col justify-between"
              >
                {/* Slim-Fit 16:5 Slideshow Cover Preview */}
                <div className="relative aspect-[16/5] w-full bg-[#17263E] overflow-hidden">
                  <img
                    src={b.image_url}
                    alt={displayTitle || 'Cover Banner'}
                    className="h-full w-full object-cover object-center"
                  />
                  <span className="absolute top-2.5 left-2.5 rounded-full bg-[#17263E]/85 text-white px-2.5 py-0.5 text-[10px] font-bold">
                    #{idx + 1} · {isDemo ? at('banners.demoBadge') : at('banners.customBadge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleQuickToggleActive(b)}
                    className={`absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                      b.is_active
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {b.is_active ? at('common.active') : at('common.inactive')}
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#0F1A2C] truncate">
                      {displayTitle || at('banners.coverOnlyLabel')}
                    </div>
                    {b.link_url ? (
                      <div className="text-xs text-[#F47125] truncate font-mono mt-0.5">
                        {b.link_url}
                      </div>
                    ) : (
                      <div className="text-xs text-[#5B6577] mt-0.5">
                        {at('banners.coverOnlyLabel')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => void handleMoveOrder(idx, -1)}
                      aria-label="Move slide up"
                      className="p-1.5 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C] rounded-lg disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === banners.length - 1}
                      onClick={() => void handleMoveOrder(idx, 1)}
                      aria-label="Move slide down"
                      className="p-1.5 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C] rounded-lg disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(b)}
                      aria-label={at('banners.edit')}
                      className="p-1.5 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C] rounded-lg cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(b)}
                      aria-label={at('banners.deleteTitle')}
                      className="p-1.5 text-[#5B6577] hover:bg-red-50 hover:text-red-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveBanner}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {editingBanner ? at('banners.edit') : at('banners.add')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Slim-Fit Slideshow Cover Preview */}
            <div>
              <span className="block text-xs font-semibold text-[#0F1A2C] mb-1.5">
                {at('banners.livePreview')}
              </span>
              <div className="relative aspect-[16/5] w-full overflow-hidden rounded-2xl border border-[#17263E]/15 bg-[#17263E]">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Slideshow Cover Preview"
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-white/60">
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-xs">{at('banners.recommendedSize')}</span>
                  </div>
                )}

                {displayMode === 'with-overlay' && (previewTitle || previewLabel || previewCta) && (
                  <div className="pointer-events-none absolute inset-0 flex items-center bg-gradient-to-r from-[#0F1A2C]/80 via-[#0F1A2C]/40 to-transparent px-12">
                    <div className="max-w-sm">
                      {previewLabel && (
                        <span className="inline-block rounded-full bg-[#F47125] px-2 py-0.5 text-[10px] font-bold text-white">
                          {previewLabel}
                        </span>
                      )}
                      {previewTitle && (
                        <p className="mt-1 text-base font-bold leading-tight text-white line-clamp-2">
                          {previewTitle}
                        </p>
                      )}
                      {previewCta && (
                        <span className="mt-2 inline-block rounded-full bg-[#F47125] px-3 py-1 text-[10px] font-bold text-white">
                          {previewCta}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview Arrows + Dots + Pause Matching Storefront */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0F1A2C] shadow"
                >
                  <ChevronLeft className="h-4 w-4" />
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0F1A2C] shadow"
                >
                  <ChevronRight className="h-4 w-4" />
                </span>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span className="h-1.5 w-5 rounded-full bg-white" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0F1A2C] shadow">
                    <Pause className="h-2.5 w-2.5 fill-current" />
                  </span>
                </div>
              </div>
            </div>

            {/* Image Uploader + Direct URL Option */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0F1A2C]">
                Banner Image *{' '}
                <span className="font-normal text-[#5B6577]">
                  ({at('banners.recommendedSize')})
                </span>
              </label>
              <ImageUploader
                bucket="banners"
                value={imageUrl}
                onChange={(val) => setImageUrl(Array.isArray(val) ? val[0] || '' : val || '')}
                maxImages={1}
              />
              <div>
                <label className="block text-[11px] font-medium text-[#5B6577] mb-1">
                  {at('banners.orPasteUrl')}
                </label>
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Link Destination & Product Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('banners.linkProduct')}
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="h-10 w-full rounded-[10px] border border-[#17263E]/20 bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="">{at('banners.noProductLinked')}</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {adminLang === 'bn' ? prod.name_bn : prod.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Click Link URL (Optional)
                </label>
                <Input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/category/home-appliances or /shop"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Display Style Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1.5">
                {at('banners.modeLabel')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode('cover-only')}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    displayMode === 'cover-only'
                      ? 'border-[#F47125] bg-[#FFF4EC] text-[#D95F18]'
                      : 'border-[#E1E4EA] bg-white text-[#0F1A2C] hover:border-[#17263E]/30'
                  }`}
                >
                  {at('banners.modeImageOnly')}
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('with-overlay')}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                    displayMode === 'with-overlay'
                      ? 'border-[#F47125] bg-[#FFF4EC] text-[#D95F18]'
                      : 'border-[#E1E4EA] bg-white text-[#0F1A2C] hover:border-[#17263E]/30'
                  }`}
                >
                  {at('banners.modeWithOverlay')}
                </button>
              </div>
            </div>

            {/* Optional Text Overlay Fields */}
            {displayMode === 'with-overlay' && (
              <div className="space-y-3 rounded-xl border border-[#E1E4EA] bg-[#FAF8F5] p-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                      Badge / Label (English)
                    </label>
                    <Input
                      type="text"
                      value={labelEn}
                      onChange={(e) => setLabelEn(e.target.value)}
                      placeholder="e.g. Best Value"
                      className="text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                      Badge / Label (Bangla)
                    </label>
                    <Input
                      type="text"
                      value={labelBn}
                      onChange={(e) => setLabelBn(e.target.value)}
                      placeholder="সেরা অফার"
                      className="text-xs bg-white"
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
                      placeholder="e.g. Trusted for Generations"
                      className="text-xs bg-white"
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
                      placeholder="বিশ্বস্ত মানের পণ্য"
                      className="text-xs bg-white"
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
                      className="text-xs bg-white"
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
                      className="text-xs bg-white"
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
                      className="text-xs bg-white"
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
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('categories.sortOrder')}
                </label>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
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

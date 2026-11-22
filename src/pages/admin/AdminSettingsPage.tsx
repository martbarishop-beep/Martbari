import React, { useEffect, useState } from 'react';
import {
  Save,
  Store,
  Truck,
  CreditCard,
  Share2,
  BarChart,
  AlertTriangle,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { BilingualField } from '../../components/admin/BilingualField';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { StoreSettings, Product } from '../../types/database';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { at } = useAdminLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'shipping' | 'payment' | 'social' | 'analytics'>('general');

  // Form Fields
  const [storeNameEn, setStoreNameEn] = useState('MartBari');
  const [storeNameBn, setStoreNameBn] = useState('মার্টবাড়ি');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [addressEn, setAddressEn] = useState('');
  const [addressBn, setAddressBn] = useState('');

  // Shipping
  const [dhakaCharge, setDhakaCharge] = useState<number>(60);
  const [outsideCharge, setOutsideCharge] = useState<number>(120);
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState<number | null>(null);

  // Payment
  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [paymentNoteEn, setPaymentNoteEn] = useState('');
  const [paymentNoteBn, setPaymentNoteBn] = useState('');

  // Social
  const [fbUrl, setFbUrl] = useState('');
  const [instaUrl, setInstaUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Marketing & System
  const [pixelId, setPixelId] = useState('');
  const [gaId, setGaId] = useState('');
  const [announcementEn, setAnnouncementEn] = useState('');
  const [announcementBn, setAnnouncementBn] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const fetchSettings = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const s = data as StoreSettings;
        setStoreNameEn(s.store_name_en);
        setStoreNameBn(s.store_name_bn);
        setLogoUrl(s.logo_url || '');
        setFaviconUrl(s.favicon_url || '');
        setPhone(s.phone || '');
        setWhatsapp(s.whatsapp || '');
        setEmail(s.email || '');
        setAddressEn(s.address_en || '');
        setAddressBn(s.address_bn || '');
        setDhakaCharge(s.delivery_charge_dhaka);
        setOutsideCharge(s.delivery_charge_outside);
        setFreeDeliveryAbove(s.free_delivery_above);
        setBkashNumber(s.bkash_number || '');
        setNagadNumber(s.nagad_number || '');
        setPaymentNoteEn(s.payment_note_en || '');
        setPaymentNoteBn(s.payment_note_bn || '');
        setFbUrl(s.facebook_url || '');
        setInstaUrl(s.instagram_url || '');
        setTiktokUrl(s.tiktok_url || '');
        setYoutubeUrl(s.youtube_url || '');
        setPixelId(s.facebook_pixel_id || '');
        setGaId(s.google_analytics_id || '');
        setAnnouncementEn(s.announcement_en || '');
        setAnnouncementBn(s.announcement_bn || '');
        setMaintenanceMode(s.maintenance_mode);
      }
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load settings', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    try {
      const payload = {
        id: 1,
        store_name_en: storeNameEn.trim(),
        store_name_bn: storeNameBn.trim(),
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        address_en: addressEn.trim() || null,
        address_bn: addressBn.trim() || null,
        delivery_charge_dhaka: Number(dhakaCharge) || 60,
        delivery_charge_outside: Number(outsideCharge) || 120,
        free_delivery_above: freeDeliveryAbove ? Number(freeDeliveryAbove) : null,
        bkash_number: bkashNumber.trim() || null,
        nagad_number: nagadNumber.trim() || null,
        payment_note_en: paymentNoteEn.trim() || null,
        payment_note_bn: paymentNoteBn.trim() || null,
        facebook_url: fbUrl.trim() || null,
        instagram_url: instaUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        facebook_pixel_id: pixelId.trim() || null,
        google_analytics_id: gaId.trim() || null,
        announcement_en: announcementEn.trim() || null,
        announcement_bn: announcementBn.trim() || null,
        maintenance_mode: maintenanceMode,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('settings').upsert(payload);
      if (error) throw error;

      showToast({ type: 'success', title: 'Store settings saved successfully' });
      await logActivity('UPDATE_SETTINGS', 'settings', '1', {
        maintenance_mode: maintenanceMode,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  // Facebook Catalog Feed CSV Export
  const handleExportFacebookCatalog = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('products').select('*').eq('is_active', true);
      if (!data) return;

      const rows = data.map((p) => ({
        id: p.sku,
        title: p.name_en,
        description: p.short_desc_en || p.name_en,
        availability: p.stock > 0 ? 'in stock' : 'out of stock',
        condition: 'new',
        price: `${p.sale_price ?? p.price} BDT`,
        link: `${window.location.origin}/en/product/${p.slug}`,
        image_link: `${window.location.origin}/logo.png`,
        brand: 'MartBari',
      }));

      exportToCsv('martbari-facebook-catalog.csv', rows);
      showToast({ type: 'success', title: `Exported Facebook Catalog (${rows.length} items)` });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Catalog export failed', description: (err as Error)?.message });
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" className="text-[#F47125]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('settings.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('settings.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportFacebookCatalog}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> {at('settings.fbCatalogCsv')}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F47125] text-white hover:bg-[#e05e13] gap-1.5"
          >
            <Save className="h-4 w-4" />
            {saving ? at('common.saving') : at('settings.saveAll')}
          </Button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-[#E1E4EA] pb-1 overflow-x-auto">
        {(
          [
            { id: 'general', label: at('settings.tab.general'), icon: Store },
            { id: 'shipping', label: at('settings.tab.shipping'), icon: Truck },
            { id: 'payment', label: at('settings.tab.payment'), icon: CreditCard },
            { id: 'social', label: at('settings.tab.social'), icon: Share2 },
            { id: 'analytics', label: at('settings.tab.analytics'), icon: BarChart },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#17263E] text-white shadow-xs'
                  : 'text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: General & Branding */}
        {activeTab === 'general' && (
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('settings.tab.general')}
            </h2>

            <BilingualField
              label="Store Name"
              required
              valueBn={storeNameBn}
              valueEn={storeNameEn}
              onChangeBn={setStoreNameBn}
              onChangeEn={setStoreNameEn}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Store Logo</label>
                <ImageUploader
                  bucket="settings"
                  images={logoUrl ? [logoUrl] : []}
                  onChange={(imgs) => setLogoUrl(imgs[0] || '')}
                  maxImages={1}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Favicon</label>
                <ImageUploader
                  bucket="settings"
                  images={faviconUrl ? [faviconUrl] : []}
                  onChange={(imgs) => setFaviconUrl(imgs[0] || '')}
                  maxImages={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Contact Phone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">WhatsApp Hotline</label>
                <Input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Support Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="support@martbari.com"
                  className="text-xs"
                />
              </div>
            </div>

            <BilingualField
              label="Physical Office / Warehouse Address"
              isTextarea
              rows={2}
              valueBn={addressBn}
              valueEn={addressEn}
              onChangeBn={setAddressBn}
              onChangeEn={setAddressEn}
            />
          </div>
        )}

        {/* Tab 2: Shipping & Delivery Rates */}
        {activeTab === 'shipping' && (
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('settings.tab.shipping')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Inside Dhaka (৳) *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={dhakaCharge}
                  onChange={(e) => setDhakaCharge(Number(e.target.value))}
                  required
                  className="font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Outside Dhaka (৳) *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={outsideCharge}
                  onChange={(e) => setOutsideCharge(Number(e.target.value))}
                  required
                  className="font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Free Delivery Minimum Order (৳)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={freeDeliveryAbove ?? ''}
                  onChange={(e) =>
                    setFreeDeliveryAbove(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="Leave empty for none"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Payment Configuration */}
        {activeTab === 'payment' && (
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('settings.tab.payment')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  bKash Personal / Merchant Number
                </label>
                <Input
                  type="text"
                  value={bkashNumber}
                  onChange={(e) => setBkashNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Nagad Personal / Merchant Number
                </label>
                <Input
                  type="text"
                  value={nagadNumber}
                  onChange={(e) => setNagadNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="font-mono text-xs font-bold"
                />
              </div>
            </div>

            <BilingualField
              label="Payment Instructions Note"
              isTextarea
              rows={2}
              valueBn={paymentNoteBn}
              valueEn={paymentNoteEn}
              onChangeBn={setPaymentNoteBn}
              onChangeEn={setPaymentNoteEn}
              placeholderBn="যেমন: বিকাশ সেন্ড মানি করে ট্রানজেকশন আইডি দিন"
              placeholderEn="e.g. Send money to the number above and enter your TrxID"
            />
          </div>
        )}

        {/* Tab 4: Social Links */}
        {activeTab === 'social' && (
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('settings.tab.social')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Facebook Page URL
                </label>
                <Input
                  type="url"
                  value={fbUrl}
                  onChange={(e) => setFbUrl(e.target.value)}
                  placeholder="https://facebook.com/martbari.bd"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Instagram URL</label>
                <Input
                  type="url"
                  value={instaUrl}
                  onChange={(e) => setInstaUrl(e.target.value)}
                  placeholder="https://instagram.com/martbari"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">TikTok Profile</label>
                <Input
                  type="url"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  placeholder="https://tiktok.com/@martbari"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">YouTube Channel</label>
                <Input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@martbari"
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Analytics & Maintenance */}
        {activeTab === 'analytics' && (
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('settings.tab.analytics')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Facebook Pixel ID
                </label>
                <Input
                  type="text"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Google Analytics 4 Measurement ID
                </label>
                <Input
                  type="text"
                  value={gaId}
                  onChange={(e) => setGaId(e.target.value)}
                  placeholder="e.g. G-XXXXXXXXXX"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <BilingualField
              label="Storefront Header Announcement Bar"
              valueBn={announcementBn}
              valueEn={announcementEn}
              onChangeBn={setAnnouncementBn}
              onChangeEn={setAnnouncementEn}
              placeholderBn="সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা!"
              placeholderEn="Free delivery on orders over ৳2,000 this week!"
            />

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 pt-3 mt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-[#F47125]"
                />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    {at('settings.maintenanceEnable')}
                  </span>
                  <span className="text-xs text-amber-800">
                    {at('settings.maintenanceDesc')}
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

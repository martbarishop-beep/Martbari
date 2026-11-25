import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_SUPPLIER_NAMES,
  DEMO_SUPPLIERS,
  isDemoBanner,
  isDemoBrand,
  isDemoCategory,
  isDemoProduct,
} from '../../config/demoCatalog';
import {
  HERO_SLIDE_PRESETS,
  PRODUCT_DEMO_IMAGES_BY_SLUG,
} from '../../config/demoImages';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface CountsSummary {
  categories: number;
  demoCategories: number;
  brands: number;
  demoBrands: number;
  products: number;
  demoProducts: number;
  images: number;
  banners: number;
  demoBanners: number;
}

interface TestCountsSummary {
  orders: number;
  supplierOrders: number;
  courierSettlements: number;
  supplierPayments: number;
  expenses: number;
}

const SQL_MIGRATION_SNIPPET = `ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS show_demo_data boolean NOT NULL DEFAULT true;`;

export const AdminDemoDataPage: React.FC = () => {
  const { role } = useAdminAuth();
  const { at, adminLang } = useAdminLanguage();
  const { settings, refreshSettings } = useSettingsContext();
  const { showToast } = useToast();

  const [counts, setCounts] = useState<CountsSummary | null>(null);
  const [testCounts, setTestCounts] = useState<TestCountsSummary>({
    orders: 0,
    supplierOrders: 0,
    courierSettlements: 0,
    supplierPayments: 0,
    expenses: 0,
  });
  const [busyMode, setBusyMode] = useState<'all' | 'images' | 'toggle' | 'remove' | 'purge_test' | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showPurgeTestModal, setShowPurgeTestModal] = useState(false);
  const [needsSchemaSql, setNeedsSchemaSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const showDemoData = settings.show_demo_data !== false;
  const isSuperAdmin = role === 'admin';

  const safeCountTest = async (table: string): Promise<number> => {
    if (!supabase) return 0;
    try {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('is_test', true);
      if (error) return 0;
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const loadCounts = useCallback(async () => {
    if (!supabase) return;
    const [catRes, brandRes, prodRes, imgRes, banRes] = await Promise.all([
      supabase.from('categories').select('id, slug'),
      supabase.from('brands').select('id, slug'),
      supabase.from('products').select('id, slug, sku'),
      supabase.from('product_images').select('id', { count: 'exact', head: true }),
      supabase.from('banners').select('id, link_url, image_url'),
    ]);

    const cats = catRes.data ?? [];
    const brands = brandRes.data ?? [];
    const prods = prodRes.data ?? [];
    const bans = banRes.data ?? [];

    setCounts({
      categories: cats.length,
      demoCategories: cats.filter((c) => isDemoCategory(c)).length,
      brands: brands.length,
      demoBrands: brands.filter((b) => isDemoBrand(b)).length,
      products: prods.length,
      demoProducts: prods.filter((p) => isDemoProduct(p)).length,
      images: imgRes.count ?? 0,
      banners: bans.length,
      demoBanners: bans.filter((b) => isDemoBanner(b)).length,
    });

    const [tOrders, tSupOrders, tCourierSettle, tSupPay, tExpenses] = await Promise.all([
      safeCountTest('orders'),
      safeCountTest('supplier_orders'),
      safeCountTest('courier_settlements'),
      safeCountTest('supplier_payments'),
      safeCountTest('expenses'),
    ]);
    setTestCounts({
      orders: tOrders,
      supplierOrders: tSupOrders,
      courierSettlements: tCourierSettle,
      supplierPayments: tSupPay,
      expenses: tExpenses,
    });
  }, []);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const updateShowDemoFlag = async (nextValue: boolean): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('settings')
      .update({
        show_demo_data: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('show_demo_data') || error.code === '42703' || error.code === 'PGRST204') {
        setNeedsSchemaSql(true);
      }
      throw error;
    }

    setNeedsSchemaSql(false);
    await refreshSettings();
    return true;
  };

  const handleToggleDemoVisibility = async () => {
    if (!supabase || !isSuperAdmin) return;
    const nextValue = !showDemoData;
    setBusyMode('toggle');
    setLastResult(null);

    try {
      await updateShowDemoFlag(nextValue);
      await logActivity('TOGGLE_DEMO_DATA', 'settings', '1', { show_demo_data: nextValue });

      const feedback = nextValue ? at('demoData.toggleSuccessOn') : at('demoData.toggleSuccessOff');
      setLastResult(feedback);
      showToast({
        type: 'success',
        title: nextValue ? at('demoData.statusOn') : at('demoData.statusOff'),
        description: feedback,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সেটিংস আপডেট ব্যর্থ হয়েছে' : 'Failed to update demo toggle',
        description: (err as Error)?.message,
      });
    } finally {
      setBusyMode(null);
    }
  };

  const applyDemoImagesOnly = async (): Promise<number> => {
    if (!supabase) return 0;

    // 1. Update Category image URLs
    for (const cat of DEMO_CATEGORIES) {
      await supabase.from('categories').update({ image_url: cat.image_url }).eq('slug', cat.slug);
    }

    // 2. Update Brand logo URLs
    for (const brand of DEMO_BRANDS) {
      await supabase.from('brands').update({ logo_url: brand.logo_url }).eq('slug', brand.slug);
    }

    // 3. Update Banners
    const { data: existingBanners } = await supabase
      .from('banners')
      .select('id, link_url, sort_order');

    const existingByLink = new Map<string, string>();
    (existingBanners ?? []).forEach((b) => {
      if (b.link_url) existingByLink.set(b.link_url, b.id);
    });

    for (let i = 0; i < HERO_SLIDE_PRESETS.length; i += 1) {
      const preset = HERO_SLIDE_PRESETS[i];
      const matchId = existingByLink.get(preset.linkUrl);
      if (matchId) {
        await supabase
          .from('banners')
          .update({
            image_url: preset.imageUrl,
            title_bn: preset.titleBn,
            title_en: preset.titleEn,
            sort_order: i + 1,
            is_active: true,
          })
          .eq('id', matchId);
      } else {
        await supabase.from('banners').insert({
          image_url: preset.imageUrl,
          title_bn: preset.titleBn,
          title_en: preset.titleEn,
          link_url: preset.linkUrl,
          sort_order: i + 1,
          is_active: true,
        });
      }
    }

    // 4. Refresh multi-image galleries for matching demo products
    const { data: prods } = await supabase
      .from('products')
      .select('id, slug, sku, name_bn, name_en');

    let updatedCount = 0;
    for (const prod of prods ?? []) {
      const demoGallery = PRODUCT_DEMO_IMAGES_BY_SLUG[prod.slug];
      if (!demoGallery || demoGallery.length === 0) continue;

      await supabase.from('product_images').delete().eq('product_id', prod.id);
      await supabase.from('product_images').insert(
        demoGallery.map((url, idx) => ({
          product_id: prod.id,
          image_url: url,
          alt_bn: prod.name_bn,
          alt_en: prod.name_en,
          sort_order: idx,
        })),
      );
      updatedCount += 1;
    }

    return updatedCount;
  };

  const handleApplyImagesOnly = async () => {
    if (!supabase) return;
    setBusyMode('images');
    setLastResult(null);

    try {
      const updatedCount = await applyDemoImagesOnly();
      await loadCounts();
      const msg =
        adminLang === 'bn'
          ? `${HERO_SLIDE_PRESETS.length}টি হিরো ব্যানার এবং ${updatedCount}টি ডেমো পণ্যের ছবি আপডেট হয়েছে।`
          : `Updated demo images for categories, brands, ${HERO_SLIDE_PRESETS.length} hero banners, and ${updatedCount} products.`;
      setLastResult(msg);
      showToast({ type: 'success', title: at('demoData.successTitle'), description: msg });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ছবি আপডেট ব্যর্থ হয়েছে' : 'Failed to update demo images',
        description: (err as Error)?.message,
      });
    } finally {
      setBusyMode(null);
    }
  };

  const handleLoadFullDemoCatalog = async () => {
    if (!supabase) return;
    setBusyMode('all');
    setLastResult(null);

    try {
      // 1. Upsert Categories
      await supabase.from('categories').upsert(DEMO_CATEGORIES, { onConflict: 'slug' });
      const { data: catRows } = await supabase.from('categories').select('id, slug');
      const catIdBySlug = new Map<string, string>(
        (catRows ?? []).map((c) => [c.slug, c.id]),
      );

      // 2. Upsert Brands
      await supabase.from('brands').upsert(DEMO_BRANDS, { onConflict: 'slug' });
      const { data: brandRows } = await supabase.from('brands').select('id, slug');
      const brandIdBySlug = new Map<string, string>(
        (brandRows ?? []).map((b) => [b.slug, b.id]),
      );

      // 3. Ensure Demo Suppliers exist
      const { data: existingSupRows } = await supabase.from('suppliers').select('id, name');
      const existingSupNames = new Set((existingSupRows ?? []).map((s) => s.name));
      const missingSups = DEMO_SUPPLIERS.filter((s) => !existingSupNames.has(s.name));
      if (missingSups.length > 0) {
        await supabase.from('suppliers').insert(missingSups);
      }
      const { data: supRows } = await supabase.from('suppliers').select('id, name');
      const dhakaSupId = supRows?.find((s) => s.name === 'Dhaka Gadget Wholesale')?.id ?? null;
      const ctgSupId = supRows?.find((s) => s.name === 'Chattogram Home Tech Hub')?.id ?? null;

      // 4. Upsert Products
      const productPayload = DEMO_PRODUCTS.map(({ brandSlug, catSlug, ...rest }) => ({
        ...rest,
        brand_id: brandIdBySlug.get(brandSlug) ?? null,
        category_id: catIdBySlug.get(catSlug) ?? null,
        supplier_id: catSlug === 'home-appliances' || catSlug === 'lighting' ? ctgSupId : dhakaSupId,
      }));
      await supabase.from('products').upsert(productPayload, { onConflict: 'slug' });

      // 5. Refresh images & banners
      await applyDemoImagesOnly();

      // 6. Enable show_demo_data if super admin
      if (isSuperAdmin) {
        try {
          await updateShowDemoFlag(true);
        } catch {
          // Schema warning already handled if column missing
        }
      }

      await loadCounts();
      await logActivity('LOAD_DEMO_CATALOG', 'products', null, {
        categories: DEMO_CATEGORIES.length,
        brands: DEMO_BRANDS.length,
        products: DEMO_PRODUCTS.length,
      });

      const msg =
        adminLang === 'bn'
          ? `${DEMO_CATEGORIES.length}টি ক্যাটাগরি, ${DEMO_BRANDS.length}টি ব্র্যান্ড, ${DEMO_PRODUCTS.length}টি পণ্য ও ${HERO_SLIDE_PRESETS.length}টি হিরো ব্যানার লোড হয়েছে।`
          : `Synced ${DEMO_CATEGORIES.length} categories, ${DEMO_BRANDS.length} brands, ${DEMO_PRODUCTS.length} products, and ${HERO_SLIDE_PRESETS.length} hero banners.`;
      setLastResult(msg);
      showToast({ type: 'success', title: at('demoData.successTitle'), description: msg });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ডেমো ডেটা লোড ব্যর্থ হয়েছে' : 'Demo seed failed',
        description: (err as Error)?.message,
      });
    } finally {
      setBusyMode(null);
    }
  };

  const handleRemoveAllDemoData = async () => {
    if (!supabase) return;
    setShowRemoveModal(false);
    setBusyMode('remove');
    setLastResult(null);

    try {
      // 1. Identify all seeded demo products
      const { data: allProds, error: prodFetchErr } = await supabase
        .from('products')
        .select('id, slug, sku');
      if (prodFetchErr) throw prodFetchErr;

      const demoProds = (allProds ?? []).filter((p) => isDemoProduct(p));
      const demoProdIds = demoProds.map((p) => p.id);

      // 2. Delete dependent rows & demo products safely
      if (demoProdIds.length > 0) {
        await supabase.from('reviews').delete().in('product_id', demoProdIds);
        await supabase.from('product_images').delete().in('product_id', demoProdIds);
        await supabase.from('product_variants').delete().in('product_id', demoProdIds);
        const { error: delProdErr } = await supabase
          .from('products')
          .delete()
          .in('id', demoProdIds);
        if (delProdErr) throw delProdErr;
      }

      // 3. Delete demo hero banners
      const { data: allBanners } = await supabase
        .from('banners')
        .select('id, link_url, image_url');
      const demoBannerIds = (allBanners ?? [])
        .filter((b) => isDemoBanner(b))
        .map((b) => b.id);
      if (demoBannerIds.length > 0) {
        await supabase.from('banners').delete().in('id', demoBannerIds);
      }

      // 4. Inspect remaining real products so we never delete categories/brands/suppliers attached to real items
      const { data: remainingProds } = await supabase
        .from('products')
        .select('category_id, brand_id, supplier_id');
      const usedCategoryIds = new Set(
        (remainingProds ?? []).map((p) => p.category_id).filter(Boolean) as string[],
      );
      const usedBrandIds = new Set(
        (remainingProds ?? []).map((p) => p.brand_id).filter(Boolean) as string[],
      );
      const usedSupplierIds = new Set(
        (remainingProds ?? []).map((p) => p.supplier_id).filter(Boolean) as string[],
      );

      // Delete unused demo categories
      const { data: allCats } = await supabase.from('categories').select('id, slug');
      const demoCatIdsToDelete = (allCats ?? [])
        .filter((c) => isDemoCategory(c) && !usedCategoryIds.has(c.id))
        .map((c) => c.id);
      if (demoCatIdsToDelete.length > 0) {
        await supabase.from('categories').delete().in('id', demoCatIdsToDelete);
      }

      // Delete unused demo brands
      const { data: allBrands } = await supabase.from('brands').select('id, slug');
      const demoBrandIdsToDelete = (allBrands ?? [])
        .filter((b) => isDemoBrand(b) && !usedBrandIds.has(b.id))
        .map((b) => b.id);
      if (demoBrandIdsToDelete.length > 0) {
        await supabase.from('brands').delete().in('id', demoBrandIdsToDelete);
      }

      // Delete unused demo suppliers
      const demoSupNameSet = new Set(DEMO_SUPPLIER_NAMES);
      const { data: allSups } = await supabase.from('suppliers').select('id, name');
      const demoSupIdsToDelete = (allSups ?? [])
        .filter((s) => demoSupNameSet.has(s.name) && !usedSupplierIds.has(s.id))
        .map((s) => s.id);
      if (demoSupIdsToDelete.length > 0) {
        await supabase.from('suppliers').delete().in('id', demoSupIdsToDelete);
      }

      // 5. Switch Demo Display OFF in settings (if super admin)
      if (isSuperAdmin) {
        try {
          await updateShowDemoFlag(false);
        } catch {
          // Inline SQL helper displays if column wasn't added yet
        }
      }

      await loadCounts();
      await logActivity('REMOVE_DEMO_DATA', 'products', null, {
        removed_products: demoProdIds.length,
        removed_banners: demoBannerIds.length,
        removed_categories: demoCatIdsToDelete.length,
        removed_brands: demoBrandIdsToDelete.length,
      });

      const msg =
        adminLang === 'bn'
          ? `${demoProdIds.length}টি ডেমো পণ্য, ${demoBannerIds.length}টি ব্যানার এবং ${demoCatIdsToDelete.length}টি অব্যবহৃত ডেমো ক্যাটাগরি মুছে ফেলা হয়েছে।`
          : `Removed ${demoProdIds.length} demo products, ${demoBannerIds.length} demo banners, and ${demoCatIdsToDelete.length} unused demo categories.`;
      setLastResult(msg);
      showToast({
        type: 'success',
        title: at('demoData.removeSuccess'),
        description: msg,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ডেমো ডেটা মুছতে ব্যর্থ' : 'Failed to remove demo data',
        description: (err as Error)?.message,
      });
    } finally {
      setBusyMode(null);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
      setCopiedSql(true);
      showToast({ type: 'success', title: at('demoData.sqlCopied') });
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handlePurgeTestData = async () => {
    if (!supabase || !isSuperAdmin) return;
    setShowPurgeTestModal(false);
    setBusyMode('purge_test');
    setLastResult(null);

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('purge_test_data');
      if (rpcErr) {
        // Fallback client-side purge for test-marked records if RPC isn't installed yet
        const testOrderIdsRes = await supabase.from('orders').select('id').eq('is_test', true);
        const testOrderIds = (testOrderIdsRes.data ?? []).map((r) => r.id);

        if (testOrderIds.length > 0) {
          await supabase.from('supplier_orders').delete().in('order_id', testOrderIds);
          await supabase.from('order_status_history').delete().in('order_id', testOrderIds);
          await supabase.from('order_items').delete().in('order_id', testOrderIds);
          await supabase.from('orders').delete().in('id', testOrderIds);
        }
        await supabase.from('supplier_orders').delete().eq('is_test', true);
        await supabase.from('supplier_payments').delete().eq('is_test', true);
        await supabase.from('courier_settlements').delete().eq('is_test', true);
        await supabase.from('expenses').delete().eq('is_test', true);
      }

      await loadCounts();
      await logActivity('PURGE_TEST_DATA', 'orders', null, { rpc_result: rpcData ?? 'fallback' });

      const msg =
        adminLang === 'bn'
          ? 'সব টেস্ট/ডামি (is_test = true) অর্ডার, সেটেলমেন্ট, পেমেন্ট ও খরচ সফলভাবে মুছে ফেলা হয়েছে।'
          : 'All test records marked with is_test = true have been permanently deleted.';
      setLastResult(msg);
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'টেস্ট ডেটা পরিষ্কার হয়েছে' : 'Test Data Cleared',
        description: msg,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'টেস্ট ডেটা মুছতে ব্যর্থ' : 'Failed to purge test data',
        description: (err as Error)?.message,
      });
    } finally {
      setBusyMode(null);
    }
  };

  const hasAnyDemoRecords =
    (counts?.demoProducts ?? 0) > 0 ||
    (counts?.demoBanners ?? 0) > 0 ||
    (counts?.demoCategories ?? 0) > 0 ||
    (counts?.demoBrands ?? 0) > 0;

  const totalTestRecords =
    testCounts.orders +
    testCounts.supplierOrders +
    testCounts.courierSettlements +
    testCounts.supplierPayments +
    testCounts.expenses;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('demoData.title')}
          </h1>
          <p className="mt-1 text-sm text-[#5B6577]">{at('demoData.subtitle')}</p>
        </div>

        <Link to="/admin/products/new" className="shrink-0">
          <Button
            size="sm"
            variant="primary"
            className="min-h-[40px]"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {at('demoData.addRealProductBtn')}
          </Button>
        </Link>
      </div>

      {/* Primary ON/OFF Demo Visibility Toggle Card */}
      <div
        className={cn(
          'rounded-2xl border p-5 sm:p-6 transition-colors',
          showDemoData
            ? 'border-[#F47125]/30 bg-gradient-to-br from-[#FFF8F4] to-white'
            : 'border-[#17263E]/12 bg-white shadow-xs',
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                showDemoData
                  ? 'bg-[#F47125] text-white'
                  : 'bg-[#17263E] text-white',
              )}
            >
              {showDemoData ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-[#0F1A2C]">
                  {at('demoData.toggleTitle')}
                </h2>
                <span
                  className={cn(
                    'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold',
                    showDemoData
                      ? 'bg-[#16A34A]/12 text-[#16A34A]'
                      : 'bg-[#17263E]/8 text-[#475569]',
                  )}
                >
                  {showDemoData ? at('demoData.statusOn') : at('demoData.statusOff')}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#5B6577] max-w-2xl">
                {showDemoData ? at('demoData.toggleOnDesc') : at('demoData.toggleOffDesc')}
              </p>
              {!isSuperAdmin && (
                <p className="mt-1.5 text-xs font-medium text-[#D95F18]">
                  {at('demoData.adminOnlyToggle')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={showDemoData}
              disabled={!isSuperAdmin || busyMode !== null}
              onClick={handleToggleDemoVisibility}
              aria-label={at('demoData.toggleTitle')}
              className={cn(
                'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                showDemoData
                  ? 'border-[#F47125] bg-[#F47125]'
                  : 'border-[#17263E]/20 bg-[#E2E8F0]',
              )}
            >
              <span
                className={cn(
                  'inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
                  showDemoData ? 'translate-x-7' : 'translate-x-1',
                )}
              />
            </button>

            <Button
              type="button"
              size="sm"
              variant={showDemoData ? 'outline' : 'primary'}
              disabled={!isSuperAdmin || busyMode !== null}
              onClick={handleToggleDemoVisibility}
              className="min-h-[40px]"
            >
              {busyMode === 'toggle'
                ? at('common.updating')
                : showDemoData
                ? at('demoData.turnOff')
                : at('demoData.turnOn')}
            </Button>
          </div>
        </div>

        {/* Inline SQL Migration Banner if existing DB doesn't have show_demo_data column yet */}
        {needsSchemaSql && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
            <p className="font-semibold">{at('demoData.sqlMigrationNeeded')}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
              <code className="font-mono text-[11px] text-[#0F1A2C] break-all">
                {SQL_MIGRATION_SNIPPET}
              </code>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#17263E] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#F47125] transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{at('demoData.copySql')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Database Counts (with Demo vs Real breakdown) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: at('nav.categories'),
            val: counts?.categories,
            demo: counts?.demoCategories,
          },
          {
            label: at('nav.brands'),
            val: counts?.brands,
            demo: counts?.demoBrands,
          },
          {
            label: at('nav.products'),
            val: counts?.products,
            demo: counts?.demoProducts,
          },
          {
            label: at('demoData.galleryImagesLabel'),
            val: counts?.images,
            demo: null,
          },
          {
            label: at('nav.banners'),
            val: counts?.banners,
            demo: counts?.demoBanners,
          },
        ].map((item) => {
          const realCount =
            item.val !== undefined && item.demo !== null && item.demo !== undefined
              ? Math.max(0, item.val - item.demo)
              : null;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs"
            >
              <p className="text-xs font-medium text-[#5B6577]">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#0F1A2C] tabular-nums">
                {item.val ?? '—'}
              </p>
              {item.demo !== null && item.demo !== undefined && realCount !== null && (
                <p className="mt-1.5 text-[11px] text-[#64748B] tabular-nums">
                  {at('demoData.demoItemsBadge', { count: item.demo })} ·{' '}
                  <span className="font-semibold text-[#0F1A2C]">
                    {at('demoData.realItemsBadge', { count: realCount })}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {lastResult && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#16A34A]/30 bg-[#16A34A]/10 p-4 text-sm text-[#0F1A2C]">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16A34A]" />
          <div>
            <p className="font-semibold">{at('demoData.successTitle')}</p>
            <p className="mt-0.5 text-xs text-[#5B6577]">{lastResult}</p>
          </div>
        </div>
      )}

      {/* 3 Action Cards: Load Demo | Refresh Images | Remove All Demo Data */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card 1: Load / Restore Full Demo Catalog */}
        <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[#F47125]/30 bg-orange-50/35 p-6">
          <div className="space-y-2.5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F47125] text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#0F1A2C]">
              {at('demoData.loadAllBtn')}
            </h2>
            <p className="text-xs leading-relaxed text-[#5B6577]">
              {at('demoData.loadCardDesc')}
            </p>
          </div>

          <Button
            onClick={handleLoadFullDemoCatalog}
            disabled={busyMode !== null}
            className="min-h-[44px] w-full bg-[#F47125] text-white hover:bg-[#D95F18]"
            leftIcon={<Database className="h-4 w-4" />}
          >
            {busyMode === 'all' ? at('demoData.running') : at('demoData.loadAllBtn')}
          </Button>
        </div>

        {/* Card 2: Update Demo Images Only */}
        <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs">
          <div className="space-y-2.5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#17263E] text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#0F1A2C]">
              {at('demoData.refreshImagesBtn')}
            </h2>
            <p className="text-xs leading-relaxed text-[#5B6577]">
              {at('demoData.refreshCardDesc')}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleApplyImagesOnly}
            disabled={busyMode !== null}
            className="min-h-[44px] w-full"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {busyMode === 'images' ? at('demoData.running') : at('demoData.refreshImagesBtn')}
          </Button>
        </div>

        {/* Card 3: Remove All Demo Data */}
        <div className="flex flex-col justify-between space-y-5 rounded-2xl border border-[#DC2626]/25 bg-red-50/35 p-6">
          <div className="space-y-2.5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#DC2626] text-white">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#0F1A2C]">
              {at('demoData.removeTitle')}
            </h2>
            <p className="text-xs leading-relaxed text-[#5B6577]">
              {at('demoData.removeDesc')}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowRemoveModal(true)}
            disabled={busyMode !== null || !hasAnyDemoRecords}
            className="min-h-[44px] w-full border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            {busyMode === 'remove' ? at('demoData.removing') : at('demoData.removeBtn')}
          </Button>
        </div>
      </div>

      {/* Test / Dummy Records Purge Card (is_test = true) */}
      <div className="rounded-2xl border border-amber-300/70 bg-amber-50/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#0F1A2C]">
              {at('demoData.testPurgeTitle')}
            </h2>
            <p className="text-xs leading-relaxed text-[#5B6577] max-w-2xl">
              {at('demoData.testPurgeDesc')}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-[#0F1A2C]">
              <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 tabular-nums">
                {adminLang === 'bn' ? 'টেস্ট অর্ডার' : 'Test Orders'}: {testCounts.orders}
              </span>
              <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 tabular-nums">
                {adminLang === 'bn' ? 'সাপ্লায়ার অর্ডার' : 'Supplier Orders'}: {testCounts.supplierOrders}
              </span>
              <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 tabular-nums">
                {adminLang === 'bn' ? 'কুরিয়ার সেটেলমেন্ট' : 'Settlements'}: {testCounts.courierSettlements}
              </span>
              <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 tabular-nums">
                {adminLang === 'bn' ? 'সাপ্লায়ার পেমেন্ট' : 'Supplier Payments'}: {testCounts.supplierPayments}
              </span>
              <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 tabular-nums">
                {adminLang === 'bn' ? 'টেস্ট খরচ' : 'Test Expenses'}: {testCounts.expenses}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={!isSuperAdmin || busyMode !== null || totalTestRecords === 0}
            onClick={() => setShowPurgeTestModal(true)}
            className="min-h-[44px] shrink-0 border-red-300 text-red-700 hover:bg-red-600 hover:text-white"
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            {busyMode === 'purge_test' ? at('common.deleting') : at('demoData.testPurgeBtn')}
          </Button>
        </div>
      </div>

      <p className="rounded-xl border border-[#17263E]/10 bg-[#F8FAFC] p-4 text-xs text-[#5B6577]">
        {at('demoData.sqlNote')}
      </p>

      {/* Confirmation Modal for Removing Demo Data */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title={at('demoData.removeConfirmTitle')}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>{at('demoData.removeConfirmDesc')}</p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRemoveModal(false)}
              className="min-h-[42px]"
            >
              {at('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleRemoveAllDemoData}
              className="min-h-[42px] bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              {at('demoData.removeConfirmBtn')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Purging is_test Data */}
      <Modal
        isOpen={showPurgeTestModal}
        onClose={() => setShowPurgeTestModal(false)}
        title={at('demoData.testPurgeTitle')}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p>
              {adminLang === 'bn'
                ? `মোট ${totalTestRecords}টি টেস্ট রেকর্ড (is_test = true) স্থায়ীভাবে মুছে ফেলা হবে। আসল অর্ডার বা হিসাব অক্ষত থাকবে।`
                : `${totalTestRecords} test records (is_test = true) will be permanently deleted. Real orders and financial logs will remain untouched.`}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPurgeTestModal(false)}
              className="min-h-[42px]"
            >
              {at('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handlePurgeTestData()}
              className="min-h-[42px] bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              {at('demoData.testPurgeBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

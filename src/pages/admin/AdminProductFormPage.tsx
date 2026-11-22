import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Plus,
  AlertTriangle,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Package,
  Truck,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { BilingualField } from '../../components/admin/BilingualField';
import { SimpleRichTextEditor } from '../../components/admin/SimpleRichTextEditor';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import {
  Product,
  Category,
  Brand,
  Supplier,
  ProductImage,
  ProductVariant,
  ProductSpecification,
} from '../../types/database';

export const AdminProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id && id !== 'new');
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { at, tAdminField, formatAdminPrice } = useAdminLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Form State
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescBn, setShortDescBn] = useState('');
  const [shortDescEn, setShortDescEn] = useState('');
  const [descBn, setDescBn] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descLangTab, setDescLangTab] = useState<'bn' | 'en'>('en');

  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');

  // Pricing
  const [price, setPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [saleStartsAt, setSaleStartsAt] = useState('');
  const [saleEndsAt, setSaleEndsAt] = useState('');
  const [costPrice, setCostPrice] = useState<number>(0);

  // Inventory
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [trackStock, setTrackStock] = useState(true);

  // Dropshipping
  const [supplierId, setSupplierId] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [supplierProductUrl, setSupplierProductUrl] = useState('');
  const [supplierPrice, setSupplierPrice] = useState<number | null>(null);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<number>(3);

  // Images
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Variants
  const [variants, setVariants] = useState<
    Array<{
      id?: string;
      name_en: string;
      name_bn: string;
      sku: string;
      price_override: number | null;
      cost_override: number | null;
      stock: number;
      image_url: string | null;
    }>
  >([]);

  // Specifications
  const [specifications, setSpecifications] = useState<ProductSpecification[]>([]);

  // Warranty
  const [warrantyBn, setWarrantyBn] = useState('');
  const [warrantyEn, setWarrantyEn] = useState('');

  // SEO
  const [seoTitleBn, setSeoTitleBn] = useState('');
  const [seoTitleEn, setSeoTitleEn] = useState('');
  const [seoDescBn, setSeoDescBn] = useState('');
  const [seoDescEn, setSeoDescEn] = useState('');

  // Visibility Flags
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(true);

  // Delete Dialog
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auto-generate slug from English title if new
  const handleNameEnChange = (val: string) => {
    setNameEn(val);
    if (!isEditMode && !slug) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Live margin calculation
  const marginAmt = price - (costPrice || 0);
  const marginPct = price > 0 ? ((marginAmt / price) * 100).toFixed(1) : '0';
  const isBelowCost = costPrice > 0 && price <= costPrice;

  // Load initial dropdowns & product if edit mode
  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      try {
        const [cRes, bRes, sRes] = await Promise.all([
          supabase.from('categories').select('*').order('name_en'),
          supabase.from('brands').select('*').order('name'),
          supabase.from('suppliers').select('*').order('name'),
        ]);
        setCategories((cRes.data || []) as Category[]);
        setBrands((bRes.data || []) as Brand[]);
        setSuppliers((sRes.data || []) as Supplier[]);

        if (isEditMode && id) {
          const { data: prod, error: pErr } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

          if (pErr) throw pErr;
          if (prod) {
            const p = prod as Product;
            setNameBn(p.name_bn || '');
            setNameEn(p.name_en || '');
            setSlug(p.slug || '');
            setShortDescBn(p.short_desc_bn || '');
            setShortDescEn(p.short_desc_en || '');
            setDescBn(p.description_bn || '');
            setDescEn(p.description_en || '');
            setCategoryId(p.category_id || '');
            setBrandId(p.brand_id || '');
            setPrice(p.price || 0);
            setSalePrice(p.sale_price);
            setSaleStartsAt(p.sale_starts_at ? p.sale_starts_at.slice(0, 16) : '');
            setSaleEndsAt(p.sale_ends_at ? p.sale_ends_at.slice(0, 16) : '');
            setCostPrice(p.cost_price || 0);
            setSku(p.sku || '');
            setBarcode(p.barcode || '');
            setStock(p.stock || 0);
            setLowStockThreshold(p.low_stock_threshold || 5);
            setTrackStock(p.track_stock ?? true);
            setSupplierId(p.supplier_id || '');
            setSupplierSku(p.supplier_sku || '');
            setSupplierProductUrl(p.supplier_product_url || '');
            setSupplierPrice(p.supplier_price);
            setEstimatedDeliveryDays(p.estimated_delivery_days || 3);
            setWarrantyBn(p.warranty_bn || '');
            setWarrantyEn(p.warranty_en || '');
            setSeoTitleBn(p.seo_title_bn || '');
            setSeoTitleEn(p.seo_title_en || '');
            setSeoDescBn(p.seo_desc_bn || '');
            setSeoDescEn(p.seo_desc_en || '');
            setIsActive(p.is_active ?? true);
            setIsFeatured(p.is_featured ?? false);
            setIsNew(p.is_new ?? false);
            setSpecifications(p.specifications || []);

            // Fetch images
            const { data: imgData } = await supabase
              .from('product_images')
              .select('image_url')
              .eq('product_id', id)
              .order('sort_order', { ascending: true });
            if (imgData) {
              setUploadedImages(imgData.map((im) => im.image_url));
            }

            // Fetch variants
            const { data: varData } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', id);
            if (varData) {
              setVariants(
                varData.map((v) => ({
                  id: v.id,
                  name_en: v.name_en,
                  name_bn: v.name_bn,
                  sku: v.sku || '',
                  price_override: v.price_override,
                  cost_override: v.cost_override,
                  stock: v.stock,
                  image_url: v.image_url,
                }))
              );
            }
          }
        }
      } catch (err: unknown) {
        showToast({
          type: 'error',
          title: 'Failed to load product details',
          description: (err as Error)?.message,
        });
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [id, isEditMode]);

  // Handle Specifications change
  const addSpecRow = () => {
    setSpecifications((prev) => [
      ...prev,
      { key_en: '', key_bn: '', value_en: '', value_bn: '' },
    ]);
  };

  const removeSpecRow = (idx: number) => {
    setSpecifications((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSpecRow = (idx: number, field: keyof ProductSpecification, val: string) => {
    setSpecifications((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // Handle Variants
  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      {
        name_en: '',
        name_bn: '',
        sku: `${sku}-V${prev.length + 1}`,
        price_override: null,
        cost_override: null,
        stock: 5,
        image_url: null,
      },
    ]);
  };

  const removeVariantRow = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariantRow = (idx: number, field: string, val: any) => {
    setVariants((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  // Form Submission
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!nameEn.trim() || !sku.trim() || price <= 0) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Product name (English), SKU, and a valid selling price are required.',
      });
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
        name_bn: nameBn.trim() || nameEn.trim(),
        slug: finalSlug,
        short_desc_en: shortDescEn.trim() || null,
        short_desc_bn: shortDescBn.trim() || null,
        description_en: descEn || null,
        description_bn: descBn || null,
        category_id: categoryId || null,
        brand_id: brandId || null,
        price: Number(price),
        sale_price: salePrice && Number(salePrice) > 0 ? Number(salePrice) : null,
        sale_starts_at: saleStartsAt ? new Date(saleStartsAt).toISOString() : null,
        sale_ends_at: saleEndsAt ? new Date(saleEndsAt).toISOString() : null,
        cost_price: Number(costPrice) || 0,
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        stock: Number(stock) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        track_stock: trackStock,
        supplier_id: supplierId || null,
        supplier_sku: supplierSku.trim() || null,
        supplier_product_url: supplierProductUrl.trim() || null,
        supplier_price: supplierPrice ? Number(supplierPrice) : null,
        estimated_delivery_days: Number(estimatedDeliveryDays) || 3,
        specifications,
        warranty_en: warrantyEn.trim() || null,
        warranty_bn: warrantyBn.trim() || null,
        seo_title_en: seoTitleEn.trim() || null,
        seo_title_bn: seoTitleBn.trim() || null,
        seo_desc_en: seoDescEn.trim() || null,
        seo_desc_bn: seoDescBn.trim() || null,
        is_active: isActive,
        is_featured: isFeatured,
        is_new: isNew,
        updated_at: new Date().toISOString(),
      };

      let productId = id;

      if (isEditMode && id) {
        // Update existing
        const { error: updErr } = await supabase.from('products').update(payload).eq('id', id);
        if (updErr) throw updErr;
      } else {
        // Insert new
        const { data: newProd, error: insErr } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (insErr) throw insErr;
        productId = newProd.id;
      }

      if (productId) {
        // 1. Save Images
        await supabase.from('product_images').delete().eq('product_id', productId);
        if (uploadedImages.length > 0) {
          const imgInserts = uploadedImages.map((url, idx) => ({
            product_id: productId,
            image_url: url,
            alt_en: `${nameEn} - View ${idx + 1}`,
            alt_bn: `${nameBn || nameEn} - ছবি ${idx + 1}`,
            sort_order: idx,
          }));
          await supabase.from('product_images').insert(imgInserts);
        }

        // 2. Save Variants
        await supabase.from('product_variants').delete().eq('product_id', productId);
        if (variants.length > 0) {
          const variantInserts = variants.map((v) => ({
            product_id: productId,
            name_en: v.name_en || 'Default',
            name_bn: v.name_bn || v.name_en || 'ডিফল্ট',
            sku: v.sku || `${sku}-${Math.random().toString().slice(2, 6)}`,
            price_override: v.price_override ? Number(v.price_override) : null,
            cost_override: v.cost_override ? Number(v.cost_override) : null,
            stock: Number(v.stock) || 0,
            image_url: v.image_url || null,
            is_active: true,
          }));
          await supabase.from('product_variants').insert(variantInserts);
        }

        await logActivity(
          isEditMode ? 'UPDATE_PRODUCT' : 'CREATE_PRODUCT',
          'products',
          productId,
          { name: nameEn, sku }
        );
      }

      showToast({
        type: 'success',
        title: isEditMode ? 'Product Updated' : 'Product Created',
        description: `${nameEn} has been saved successfully.`,
      });
      navigate('/admin/products');
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: (err as Error)?.message || 'Database error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  // Safe delete logic
  const handleDeleteProduct = async () => {
    if (!supabase || !id) return;
    setDeleting(true);
    try {
      const { data: orders } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', id)
        .limit(1);

      if (orders && orders.length > 0) {
        await supabase
          .from('products')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);
        showToast({
          type: 'warning',
          title: 'Product Deactivated',
          description: 'This product has orders, so it was deactivated to maintain order records.',
        });
      } else {
        await supabase.from('product_images').delete().eq('product_id', id);
        await supabase.from('product_variants').delete().eq('product_id', id);
        await supabase.from('products').delete().eq('id', id);
        showToast({ type: 'success', title: 'Product Deleted permanently' });
      }

      navigate('/admin/products');
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Delete failed', description: (err as Error)?.message });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
    <form onSubmit={handleSaveProduct} className="space-y-8 pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E4EA] bg-white text-[#5B6577] hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F1A2C]">
              {isEditMode ? at('productForm.editTitle', { name: nameEn || nameBn || '...' }) : at('productForm.newTitle')}
            </h1>
            <p className="text-xs text-[#5B6577]">
              {at('productForm.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {at('common.delete')}
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={saving}
            className="bg-[#F47125] text-white hover:bg-[#e05e13] gap-1.5"
          >
            <Save className="h-4 w-4" />
            {saving ? at('common.saving') : at('productForm.saveProduct')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Primary Product Data (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section 1: Basic Information */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.sec1')}
            </h2>

            {/* Bilingual Name */}
            <BilingualField
              label="Product Title"
              required
              valueBn={nameBn}
              valueEn={nameEn}
              onChangeBn={setNameBn}
              onChangeEn={handleNameEnChange}
              placeholderBn="যেমন: শাওমি স্মার্ট ব্যান্ড ৮"
              placeholderEn="e.g. Xiaomi Smart Band 8 Fitness Tracker"
            />

            {/* Slug */}
            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                URL Slug <span className="text-[#5B6577] font-normal">(auto-generated)</span>
              </label>
              <div className="flex items-center rounded-xl border border-[#E1E4EA] px-3 bg-gray-50 focus-within:border-[#F47125] focus-within:bg-white">
                <span className="text-xs text-gray-400">/product/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="xiaomi-smart-band-8"
                  className="w-full bg-transparent py-2 text-xs text-[#0F1A2C] focus:outline-none pl-1"
                />
              </div>
            </div>

            {/* Short Description */}
            <BilingualField
              label="Short Summary"
              isTextarea
              rows={2}
              valueBn={shortDescBn}
              valueEn={shortDescEn}
              onChangeBn={setShortDescBn}
              onChangeEn={setShortDescEn}
              placeholderBn="পণ্যের সংক্ষিপ্ত বিবরণ..."
              placeholderEn="A brief highlight shown on product cards..."
            />

            {/* Rich Text Full Description with BN/EN tabs */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-[#0F1A2C]">{at('productForm.fullDesc')}</label>
                <div className="inline-flex rounded-lg border border-[#E1E4EA] p-0.5 bg-gray-50 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDescLangTab('bn')}
                    className={`rounded px-2.5 py-0.5 transition-colors ${
                      descLangTab === 'bn' ? 'bg-[#17263E] text-white' : 'text-[#5B6577]'
                    }`}
                  >
                    Bangla (বাংলা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescLangTab('en')}
                    className={`rounded px-2.5 py-0.5 transition-colors ${
                      descLangTab === 'en' ? 'bg-[#17263E] text-white' : 'text-[#5B6577]'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {descLangTab === 'bn' ? (
                <SimpleRichTextEditor
                  value={descBn}
                  onChange={setDescBn}
                  placeholder="বিস্তারিত বিবরণ লিখুন বাংলায়..."
                />
              ) : (
                <SimpleRichTextEditor
                  value={descEn}
                  onChange={setDescEn}
                  placeholder="Write complete product details in English..."
                />
              )}
            </div>
          </div>

          {/* Section 2: Pricing & Profit Margins */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('productForm.sec2')}
              </h2>
              {isBelowCost && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="h-3.5 w-3.5" /> {at('productForm.belowCostWarn')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('productForm.regularPrice')}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  className="font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('productForm.salePrice')} <span className="text-[#5B6577]">({at('common.optional')})</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={salePrice ?? ''}
                  onChange={(e) =>
                    setSalePrice(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="0"
                  className="text-[#F47125] font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('productForm.costPrice')}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  placeholder="0"
                  className="font-bold text-sm text-gray-700"
                />
              </div>
            </div>

            {/* Live Profit & Margin Indicator */}
            <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] border border-[#E1E4EA] p-4 text-xs">
              <div>
                <span className="text-[#5B6577]">{at('productForm.grossProfit')}</span>{' '}
                <span className={`font-black text-sm ml-1 tabular-nums ${marginAmt >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatAdminPrice(marginAmt)}
                </span>
              </div>
              <div>
                <span className="text-[#5B6577]">{at('productForm.grossMargin')}</span>{' '}
                <span className={`font-black text-sm ml-1 ${Number(marginPct) >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {marginPct}%
                </span>
              </div>
            </div>

            {/* Flash Sale Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#5B6577] mb-1">
                  {at('productForm.flashStarts')}
                </label>
                <Input
                  type="datetime-local"
                  value={saleStartsAt}
                  onChange={(e) => setSaleStartsAt(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5B6577] mb-1">
                  {at('productForm.flashEnds')}
                </label>
                <Input
                  type="datetime-local"
                  value={saleEndsAt}
                  onChange={(e) => setSaleEndsAt(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Product Images Gallery */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.sec3')}
            </h2>
            <ImageUploader
              bucket="products"
              images={uploadedImages}
              onChange={setUploadedImages}
              maxImages={8}
            />
          </div>

          {/* Section 4: Product Variants */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                  {at('productForm.sec4')}
                </h2>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addVariantRow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {at('productForm.addVariant')}
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className="text-xs text-[#5B6577] py-2">
                No variants configured. This product sells as a single standard item.
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E1E4EA] p-3 text-xs bg-gray-50/50"
                  >
                    <input
                      type="text"
                      placeholder="Variant EN (e.g. Black)"
                      value={v.name_en}
                      onChange={(e) => updateVariantRow(i, 'name_en', e.target.value)}
                      className="rounded border border-[#E1E4EA] px-2 py-1 text-xs w-28 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Variant BN (কালো)"
                      value={v.name_bn}
                      onChange={(e) => updateVariantRow(i, 'name_bn', e.target.value)}
                      className="rounded border border-[#E1E4EA] px-2 py-1 text-xs w-28 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Variant SKU"
                      value={v.sku}
                      onChange={(e) => updateVariantRow(i, 'sku', e.target.value)}
                      className="rounded border border-[#E1E4EA] px-2 py-1 text-xs w-28 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Price (৳)"
                      value={v.price_override ?? ''}
                      onChange={(e) =>
                        updateVariantRow(
                          i,
                          'price_override',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="rounded border border-[#E1E4EA] px-2 py-1 text-xs w-20 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) =>
                        updateVariantRow(i, 'stock', Number(e.target.value))
                      }
                      className="rounded border border-[#E1E4EA] px-2 py-1 text-xs w-16 bg-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariantRow(i)}
                      className="text-red-500 hover:text-red-700 p-1 ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Technical Specifications */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                  {at('productForm.sec5')}
                </h2>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addSpecRow}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {at('productForm.addRow')}
              </Button>
            </div>

            {specifications.length === 0 ? (
              <p className="text-xs text-[#5B6577] py-2">
                No specifications added yet (e.g. Battery, Connectivity, Warranty).
              </p>
            ) : (
              <div className="space-y-2">
                {specifications.map((row, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-center text-xs">
                    <input
                      type="text"
                      placeholder="Key (EN)"
                      value={row.key_en}
                      onChange={(e) => updateSpecRow(i, 'key_en', e.target.value)}
                      className="rounded-lg border border-[#E1E4EA] px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="কী (BN)"
                      value={row.key_bn}
                      onChange={(e) => updateSpecRow(i, 'key_bn', e.target.value)}
                      className="rounded-lg border border-[#E1E4EA] px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="Value (EN)"
                      value={row.value_en}
                      onChange={(e) => updateSpecRow(i, 'value_en', e.target.value)}
                      className="rounded-lg border border-[#E1E4EA] px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="ভ্যালু (BN)"
                      value={row.value_bn}
                      onChange={(e) => updateSpecRow(i, 'value_bn', e.target.value)}
                      className="rounded-lg border border-[#E1E4EA] px-2 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecRow(i)}
                      className="text-red-500 hover:text-red-700 p-1 flex justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Taxonomy, Inventory & Dropshipping Details (1 col) */}
        <div className="space-y-6">
          {/* Section 6: Status & Visibility */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.visibility')}
            </h2>

            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-[#0F1A2C]">
              <span>{at('productForm.activeInStore')}</span>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-[#F47125]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-[#0F1A2C]">
              <span>{at('productForm.featuredHome')}</span>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded text-[#F47125]"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer text-xs font-semibold text-[#0F1A2C]">
              <span>{at('productForm.markNew')}</span>
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="h-4 w-4 rounded text-[#F47125]"
              />
            </label>
          </div>

          {/* Section 7: Category & Brand */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.catBrand')}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('nav.categories')}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="">{at('productForm.selectCategory')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {tAdminField(c, 'name')} ({c.name_bn} / {c.name_en})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('nav.brands')}</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="">{at('productForm.selectBrand')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 8: Inventory & SKU */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.invTracking')}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                SKU *
              </label>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. MB-WATCH-001"
                required
                className="font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">Barcode / UPC</label>
              <Input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={at('common.optional')}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('productForm.availableStock')}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('productForm.lowThreshold')}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 9: Dropshipping Supplier Details */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.dropshipSupplier')}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('products.col.supplier')}</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              >
                <option value="">{at('productForm.selectSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                Supplier SKU
              </label>
              <Input
                type="text"
                value={supplierSku}
                onChange={(e) => setSupplierSku(e.target.value)}
                placeholder="SKU"
                className="text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('suppliers.website')}
              </label>
              <Input
                type="url"
                value={supplierProductUrl}
                onChange={(e) => setSupplierProductUrl(e.target.value)}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('productForm.deliveryDays')}
              </label>
              <Input
                type="number"
                min="1"
                value={estimatedDeliveryDays}
                onChange={(e) => setEstimatedDeliveryDays(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          {/* Section 10: Warranty & Search Engine Optimization */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('productForm.warrantySeo')}
            </h2>

            <BilingualField
              label="Warranty Info"
              valueBn={warrantyBn}
              valueEn={warrantyEn}
              onChangeBn={setWarrantyBn}
              onChangeEn={setWarrantyEn}
              placeholderBn="যেমন: ৬ মাসের অফিশিয়াল ওয়ারেন্টি"
              placeholderEn="e.g. 6 Months Brand Warranty"
            />

            <BilingualField
              label="SEO Meta Title"
              valueBn={seoTitleBn}
              valueEn={seoTitleEn}
              onChangeBn={setSeoTitleBn}
              onChangeEn={setSeoTitleEn}
              placeholderBn="গুগল সার্চে প্রদর্শিত শিরোনাম"
              placeholderEn="Google SERP Title (50-60 characters)"
            />

            <BilingualField
              label="SEO Meta Description"
              isTextarea
              rows={2}
              valueBn={seoDescBn}
              valueEn={seoDescEn}
              onChangeBn={setSeoDescBn}
              onChangeEn={setSeoDescEn}
              placeholderBn="সার্চ রেজাল্ট বিবরণ..."
              placeholderEn="Search result description (150-160 characters)"
            />
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title={at('products.deleteTitle')}
          message={`${at('common.confirmProceed')} (${nameEn})`}
          confirmLabel={deleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteProduct()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </form>
  );
};

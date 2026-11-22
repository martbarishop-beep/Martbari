import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Product, Category, Brand, Supplier, ProductImage } from '../../types/database';

export const AdminProductsPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { at, tAdminField, formatAdminPrice } = useAdminLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline Editing
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSalePrice, setEditSalePrice] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Delete & Duplicate Modal
  const [deleteProductCandidate, setDeleteProductCandidate] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);

  // Fetch all catalog data
  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [pRes, cRes, bRes, sRes, imgRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name_en'),
        supabase.from('brands').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('product_images').select('product_id, image_url').order('sort_order', { ascending: true }),
      ]);

      if (pRes.error) throw pRes.error;
      setProducts((pRes.data || []) as Product[]);
      setCategories((cRes.data || []) as Category[]);
      setBrands((bRes.data || []) as Brand[]);
      setSuppliers((sRes.data || []) as Supplier[]);

      // Map primary image by product_id
      const imgMap: Record<string, string> = {};
      if (imgRes.data) {
        imgRes.data.forEach((img) => {
          if (!imgMap[img.product_id]) {
            imgMap[img.product_id] = img.image_url;
          }
        });
      }
      setProductImages(imgMap);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Failed to fetch products',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNameEn = p.name_en.toLowerCase().includes(q);
        const matchNameBn = p.name_bn.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchNameEn && !matchNameBn && !matchSku && !matchBarcode) return false;
      }

      // Category
      if (categoryFilter && p.category_id !== categoryFilter) return false;

      // Brand
      if (brandFilter && p.brand_id !== brandFilter) return false;

      // Stock
      if (stockFilter === 'out_of_stock' && p.stock > 0) return false;
      if (stockFilter === 'low_stock' && (p.stock > p.low_stock_threshold || p.stock === 0)) return false;
      if (stockFilter === 'in_stock' && p.stock <= 0) return false;

      // Status
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;

      return true;
    });
  }, [products, searchQuery, categoryFilter, brandFilter, stockFilter, statusFilter]);

  // Lookup helpers
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, tAdminField(c, 'name')])),
    [categories, tAdminField]
  );
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  // Toggle active/inactive
  const handleToggleActive = async (product: Product) => {
    if (!supabase) return;
    const newStatus = !product.is_active;
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: newStatus } : p))
      );
      showToast({
        type: 'success',
        title: newStatus ? 'Product Activated' : 'Product Deactivated',
        description: product.name_en,
      });
      await logActivity(
        newStatus ? 'ACTIVATE_PRODUCT' : 'DEACTIVATE_PRODUCT',
        'products',
        product.id,
        { name: product.name_en }
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to update status', description: (err as Error)?.message });
    }
  };

  // Toggle featured
  const handleToggleFeatured = async (product: Product) => {
    if (!supabase) return;
    const newFeatured = !product.is_featured;
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_featured: newFeatured, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_featured: newFeatured } : p))
      );
      showToast({
        type: 'success',
        title: newFeatured ? 'Marked as Featured' : 'Removed from Featured',
        description: product.name_en,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to update featured', description: (err as Error)?.message });
    }
  };

  // Start inline edit
  const startInlineEdit = (p: Product) => {
    setEditingRowId(p.id);
    setEditPrice(p.price);
    setEditSalePrice(p.sale_price);
    setEditStock(p.stock);
  };

  // Save inline edit
  const saveInlineEdit = async (productId: string) => {
    if (!supabase) return;
    setIsSavingInline(true);
    try {
      const payload = {
        price: Number(editPrice),
        sale_price: editSalePrice !== null && editSalePrice > 0 ? Number(editSalePrice) : null,
        stock: Number(editStock),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('products').update(payload).eq('id', productId);
      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...payload } : p))
      );
      setEditingRowId(null);
      showToast({ type: 'success', title: 'Product updated successfully' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setIsSavingInline(false);
    }
  };

  // Delete product (Check for existing orders first)
  const handleDeleteProduct = async () => {
    if (!supabase || !deleteProductCandidate) return;
    setIsDeleting(true);
    try {
      // Check if product has order items
      const { data: orderItems, error: oiError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', deleteProductCandidate.id)
        .limit(1);

      if (oiError) throw oiError;

      if (orderItems && orderItems.length > 0) {
        // Safe protection: don't delete historical order records, deactivate instead
        const { error: deactError } = await supabase
          .from('products')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', deleteProductCandidate.id);

        if (deactError) throw deactError;

        setProducts((prev) =>
          prev.map((p) => (p.id === deleteProductCandidate.id ? { ...p, is_active: false } : p))
        );
        showToast({
          type: 'warning',
          title: 'Product Archived (Deactivated)',
          description:
            'This product has existing customer orders, so it was deactivated instead of permanently deleted to preserve order records.',
        });
      } else {
        // Safe to hard delete product and its images/variants
        await supabase.from('product_images').delete().eq('product_id', deleteProductCandidate.id);
        await supabase.from('product_variants').delete().eq('product_id', deleteProductCandidate.id);
        const { error: delError } = await supabase
          .from('products')
          .delete()
          .eq('id', deleteProductCandidate.id);

        if (delError) throw delError;

        setProducts((prev) => prev.filter((p) => p.id !== deleteProductCandidate.id));
        showToast({ type: 'success', title: 'Product deleted permanently' });
      }

      await logActivity(
        'DELETE_PRODUCT',
        'products',
        deleteProductCandidate.id,
        { name: deleteProductCandidate.name_en }
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Delete failed', description: (err as Error)?.message });
    } finally {
      setIsDeleting(false);
      setDeleteProductCandidate(null);
    }
  };

  // Duplicate Product
  const handleDuplicateProduct = async (source: Product) => {
    if (!supabase) return;
    try {
      const newSku = `${source.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`;
      const newSlug = `${source.slug}-copy-${Date.now()}`;

      // Duplicate product row
      const { data: newProd, error: prodError } = await supabase
        .from('products')
        .insert({
          name_bn: `${source.name_bn} (কপি)`,
          name_en: `${source.name_en} (Copy)`,
          slug: newSlug,
          sku: newSku,
          short_desc_bn: source.short_desc_bn,
          short_desc_en: source.short_desc_en,
          description_bn: source.description_bn,
          description_en: source.description_en,
          specifications: source.specifications || [],
          price: source.price,
          sale_price: source.sale_price,
          cost_price: source.cost_price,
          stock: source.stock,
          low_stock_threshold: source.low_stock_threshold,
          brand_id: source.brand_id,
          category_id: source.category_id,
          supplier_id: source.supplier_id,
          supplier_sku: source.supplier_sku,
          supplier_product_url: source.supplier_product_url,
          supplier_price: source.supplier_price,
          is_active: false, // Start draft/inactive
          is_featured: false,
          is_new: true,
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // Duplicate images
      const { data: sourceImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', source.id);

      if (sourceImages && sourceImages.length > 0) {
        const newImages = sourceImages.map((img) => ({
          product_id: newProd.id,
          image_url: img.image_url,
          alt_bn: img.alt_bn,
          alt_en: img.alt_en,
          sort_order: img.sort_order,
        }));
        await supabase.from('product_images').insert(newImages);
      }

      showToast({
        type: 'success',
        title: 'Product Duplicated',
        description: `Created draft copy: ${newProd.sku}`,
      });
      void fetchData();
      navigate(`/admin/products/${newProd.id}`);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Duplicate failed', description: (err as Error)?.message });
    }
  };

  // Bulk actions
  const handleBulkStatusChange = async (active: boolean) => {
    if (!supabase || selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('products')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_active: active } : p))
      );
      setSelectedIds(new Set());
      showToast({
        type: 'success',
        title: `Updated ${ids.length} products to ${active ? 'Active' : 'Inactive'}`,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Bulk update failed', description: (err as Error)?.message });
    }
  };

  // Bulk Export to CSV
  const handleExportCsv = () => {
    const listToExport =
      selectedIds.size > 0
        ? products.filter((p) => selectedIds.has(p.id))
        : filteredProducts;

    const rows = listToExport.map((p) => ({
      ID: p.id,
      SKU: p.sku,
      'Name (EN)': p.name_en,
      'Name (BN)': p.name_bn,
      Category: categoryMap.get(p.category_id || '') || '',
      Brand: brandMap.get(p.brand_id || '') || '',
      'Regular Price': p.price,
      'Sale Price': p.sale_price || '',
      'Cost Price': p.cost_price,
      'Margin %': p.price > 0 ? (((p.price - p.cost_price) / p.price) * 100).toFixed(1) : 0,
      Stock: p.stock,
      Supplier: supplierMap.get(p.supplier_id || '') || '',
      'Supplier SKU': p.supplier_sku || '',
      'Active (Yes/No)': p.is_active ? 'Yes' : 'No',
      'Featured (Yes/No)': p.is_featured ? 'Yes' : 'No',
    }));

    exportToCsv(`martbari-products-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({ type: 'success', title: `Exported ${rows.length} products to CSV` });
  };

  // CSV Template Download
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        sku: 'MB-SM-001',
        name_en: 'Smart Band 8 Fitness Tracker',
        name_bn: 'স্মার্ট ব্যান্ড ৮ ফিটনেস ট্র্যাকার',
        price: '2490',
        sale_price: '2190',
        cost_price: '1450',
        stock: '35',
        category: 'Smart Watches',
        brand: 'Xiaomi',
        supplier_sku: 'MI-SB8-BLK',
        is_active: 'true',
      },
    ];
    exportToCsv('martbari-product-import-template.csv', templateRows);
  };

  // CSV File Import Handler
  const handleProcessCsvImport = async () => {
    if (!importFile || !supabase) return;
    setIsImporting(true);
    setImportResults(null);

    try {
      const text = await importFile.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV file is empty or missing headers');
      }

      // Simple CSV header parse
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const skuIdx = headers.indexOf('sku');
      const nameEnIdx = headers.indexOf('name_en');
      const nameBnIdx = headers.indexOf('name_bn');
      const priceIdx = headers.indexOf('price');
      const salePriceIdx = headers.indexOf('sale_price');
      const costPriceIdx = headers.indexOf('cost_price');
      const stockIdx = headers.indexOf('stock');

      if (skuIdx === -1 || nameEnIdx === -1 || priceIdx === -1) {
        throw new Error('CSV must contain at least sku, name_en, and price columns');
      }

      let successCount = 0;
      const errorList: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const sku = row[skuIdx];
        const nameEn = row[nameEnIdx];
        const nameBn = nameBnIdx !== -1 && row[nameBnIdx] ? row[nameBnIdx] : nameEn;
        const price = parseFloat(row[priceIdx]);
        const salePrice = salePriceIdx !== -1 && row[salePriceIdx] ? parseFloat(row[salePriceIdx]) : null;
        const costPrice = costPriceIdx !== -1 && row[costPriceIdx] ? parseFloat(row[costPriceIdx]) : 0;
        const stock = stockIdx !== -1 && row[stockIdx] ? parseInt(row[stockIdx], 10) : 10;

        if (!sku || !nameEn || isNaN(price)) {
          errorList.push(`Row ${i + 1}: Missing required fields or invalid price`);
          continue;
        }

        const slug = nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

        // Check if SKU exists
        const { data: existing } = await supabase.from('products').select('id').eq('sku', sku).maybeSingle();

        if (existing) {
          // Update
          const { error: updErr } = await supabase
            .from('products')
            .update({
              name_en: nameEn,
              name_bn: nameBn,
              price,
              sale_price: salePrice,
              cost_price: costPrice,
              stock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (updErr) errorList.push(`Row ${i + 1} (${sku}): ${updErr.message}`);
          else successCount++;
        } else {
          // Insert
          const { error: insErr } = await supabase.from('products').insert({
            sku,
            slug,
            name_en: nameEn,
            name_bn: nameBn,
            price,
            sale_price: salePrice,
            cost_price: costPrice,
            stock,
            is_active: true,
          });
          if (insErr) errorList.push(`Row ${i + 1} (${sku}): ${insErr.message}`);
          else successCount++;
        }
      }

      setImportResults({ success: successCount, errors: errorList });
      if (successCount > 0) {
        showToast({
          type: 'success',
          title: 'Import completed',
          description: `Successfully imported ${successCount} products.`,
        });
        void fetchData();
      }
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Import failed', description: (err as Error)?.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('products.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('products.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            {at('common.exportCsv')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            {at('common.importCsv')}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/admin/products/new')}
            className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
          >
            <Plus className="h-4 w-4" />
            {at('products.addProduct')}
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
            <Input
              type="text"
              placeholder={at('products.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="">{at('products.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {tAdminField(c, 'name')}
                </option>
              ))}
            </select>
          </div>

          {/* Brand filter */}
          <div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="">{at('products.allBrands')}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="all">{at('products.allStock')}</option>
              <option value="in_stock">{at('products.inStock')}</option>
              <option value="low_stock">{at('products.lowStock')}</option>
              <option value="out_of_stock">{at('products.outOfStock')}</option>
            </select>
          </div>
        </div>

        {/* Second row of pills & counts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F3F5] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#5B6577]">{at('common.status')}:</span>
            {(
              [
                { id: 'all', label: at('common.all') },
                { id: 'active', label: at('common.active') },
                { id: 'inactive', label: at('common.inactive') },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === s.id
                    ? 'bg-[#17263E] text-white'
                    : 'bg-gray-100 text-[#5B6577] hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#5B6577]">
            {(searchQuery || categoryFilter || brandFilter || stockFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                  setBrandFilter('');
                  setStockFilter('all');
                  setStatusFilter('all');
                }}
                className="font-semibold text-[#F47125] hover:underline cursor-pointer"
              >
                {at('products.clearFilters')}
              </button>
            )}
            <span>{at('products.showingOf', { shown: filteredProducts.length, total: products.length })}</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (When rows selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-[#17263E] px-4 py-2.5 text-xs text-white shadow-md animate-in fade-in">
          <span className="font-semibold">
            {at('products.selectedCount', { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleBulkStatusChange(true)}
              className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold hover:bg-emerald-700"
            >
              {at('common.activate')}
            </button>
            <button
              onClick={() => void handleBulkStatusChange(false)}
              className="rounded-lg bg-gray-600 px-3 py-1 font-semibold hover:bg-gray-700"
            >
              {at('common.deactivate')}
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-lg bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
            >
              {at('common.exportSelected')}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-2 text-white/70 hover:text-white"
            >
              {at('common.clear')}
            </button>
          </div>
        </div>
      )}

      {/* Products Data Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[#5B6577] px-4">
            <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
            <p className="font-semibold text-[#0F1A2C]">{at('products.noneFound')}</p>
            <p className="text-xs text-[#5B6577] mt-1 max-w-sm">
              {at('products.noneFoundSub')}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {(searchQuery || categoryFilter || brandFilter || stockFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setBrandFilter('');
                    setStockFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  {at('products.clearFilters')}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => navigate('/admin/products/new')}
                className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                <Plus className="h-4 w-4" />
                {at('products.addProduct')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        filteredProducts.every((p) => selectedIds.has(p.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="rounded border-[#E1E4EA]"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.product')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.sku')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.catBrand')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.price')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.cost')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.margin')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.stock')}</th>
                  <th className="py-3 px-3 font-semibold">{at('products.col.supplier')}</th>
                  <th className="py-3 px-3 font-semibold">{at('common.status')}</th>
                  <th className="py-3 px-3 text-right font-semibold">{at('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredProducts.map((p) => {
                  const isEditing = editingRowId === p.id;
                  const primaryImg = productImages[p.id];
                  const marginPercent =
                    p.price > 0
                      ? (((p.price - (p.cost_price || 0)) / p.price) * 100).toFixed(0)
                      : '0';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        selectedIds.has(p.id) ? 'bg-orange-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(p.id);
                            else newSet.delete(p.id);
                            setSelectedIds(newSet);
                          }}
                          className="rounded border-[#E1E4EA]"
                        />
                      </td>

                      {/* Product Thumbnail & Names */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#E1E4EA] bg-gray-50 flex items-center justify-center">
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt={p.name_en}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold">NO IMG</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/products/${p.id}`}
                              className="block truncate font-bold text-[#0F1A2C] hover:text-[#F47125]"
                              title={p.name_en}
                            >
                              {p.name_en}
                            </Link>
                            <p className="truncate text-[11px] text-[#5B6577]" title={p.name_bn}>
                              {p.name_bn}
                            </p>
                            {p.is_featured && (
                              <span className="inline-block mt-0.5 rounded-sm bg-purple-50 px-1.5 py-0.2 text-[10px] font-semibold text-purple-600">
                                Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3 font-mono text-[11px] font-semibold text-[#0F1A2C]">
                        {p.sku}
                      </td>

                      {/* Category & Brand */}
                      <td className="py-3 px-3">
                        <div className="text-[#0F1A2C] font-medium">
                          {categoryMap.get(p.category_id || '') || '—'}
                        </div>
                        <div className="text-[11px] text-[#5B6577]">
                          {brandMap.get(p.brand_id || '') || '—'}
                        </div>
                      </td>

                      {/* Selling & Sale Price (Inline editable) */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <div className="space-y-1 w-24">
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              placeholder="Price"
                              className="w-full rounded border border-[#E1E4EA] px-1.5 py-1 text-xs"
                            />
                            <input
                              type="number"
                              value={editSalePrice ?? ''}
                              onChange={(e) =>
                                setEditSalePrice(e.target.value ? Number(e.target.value) : null)
                              }
                              placeholder="Sale (opt)"
                              className="w-full rounded border border-[#E1E4EA] px-1.5 py-1 text-xs text-[#F47125]"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-[#0F1A2C]">
                              ৳{p.price.toLocaleString()}
                            </div>
                            {p.sale_price && (
                              <div className="text-[11px] font-semibold text-[#F47125]">
                                ৳{p.sale_price.toLocaleString()} sale
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-3 font-medium text-[#5B6577]">
                        ৳{(p.cost_price || 0).toLocaleString()}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            Number(marginPercent) >= 25
                              ? 'text-emerald-600'
                              : Number(marginPercent) > 0
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {marginPercent}%
                        </span>
                      </td>

                      {/* Stock (Inline editable) */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(Number(e.target.value))}
                            className="w-16 rounded border border-[#E1E4EA] px-1.5 py-1 text-xs"
                          />
                        ) : (
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              p.stock === 0
                                ? 'bg-red-50 text-red-600'
                                : p.stock <= p.low_stock_threshold
                                ? 'bg-amber-50 text-amber-600'
                                : 'text-[#0F1A2C]'
                            }`}
                          >
                            {p.stock}
                          </span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-3 text-[#5B6577]">
                        <div className="max-w-[100px] truncate">
                          {supplierMap.get(p.supplier_id || '') || '—'}
                        </div>
                        {p.supplier_sku && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            {p.supplier_sku}
                          </div>
                        )}
                      </td>

                      {/* Status Toggle Switches */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void handleToggleActive(p)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              p.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                            }`}
                            title={p.is_active ? 'Active on store' : 'Hidden from store'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                p.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => void saveInlineEdit(p.id)}
                              disabled={isSavingInline}
                              className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                              title="Save inline edits"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRowId(null)}
                              className="rounded bg-gray-200 p-1 text-[#0F1A2C] hover:bg-gray-300"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startInlineEdit(p)}
                              className="rounded p-1 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]"
                              title="Quick price/stock edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => void handleDuplicateProduct(p)}
                              className="rounded p-1 text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]"
                              title="Duplicate as new draft"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              to={`/admin/products/${p.id}`}
                              className="rounded p-1 text-[#5B6577] hover:bg-gray-100 hover:text-[#F47125]"
                              title="Full edit"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => setDeleteProductCandidate(p)}
                              className="rounded p-1 text-[#5B6577] hover:bg-red-50 hover:text-red-600"
                              title="Delete or deactivate"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteProductCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('products.deleteTitle')}
          message={`"${tAdminField(deleteProductCandidate, 'name')}" (SKU: ${deleteProductCandidate.sku}) — ${at('common.confirmProceed')}`}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDeleteProduct()}
          onCancel={() => setDeleteProductCandidate(null)}
        />
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#F47125]" />
                <h3 className="text-base font-bold text-[#0F1A2C]">{at('products.importTitle')}</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5B6577]">
              <p>
                Bulk upload products using a comma-separated (.csv) file. Existing products matching
                an exact SKU will be updated; new SKUs will be added.
              </p>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-blue-900">
                <span className="font-bold">Required columns:</span> sku, name_en, price.
                <br />
                <span className="font-bold">Optional:</span> name_bn, sale_price, cost_price, stock.
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="font-bold text-[#F47125] hover:underline"
                >
                  {at('products.downloadTemplate')}
                </button>
              </div>
            </div>

            <div className="rounded-xl border-2 border-dashed border-[#E1E4EA] p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#17263E] file:text-white hover:file:bg-[#233857] cursor-pointer"
              />
            </div>

            {importResults && (
              <div className="rounded-xl border border-[#E1E4EA] p-3 text-xs space-y-1">
                <div className="font-bold text-emerald-600">
                  ✓ Successfully processed: {importResults.success}
                </div>
                {importResults.errors.length > 0 && (
                  <div className="text-red-600 max-h-24 overflow-y-auto">
                    {importResults.errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E1E4EA]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportModalOpen(false)}
              >
                {at('common.close')}
              </Button>
              <Button
                size="sm"
                onClick={() => void handleProcessCsvImport()}
                disabled={!importFile || isImporting}
                className="bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                {isImporting ? at('products.importing') : at('products.startImport')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

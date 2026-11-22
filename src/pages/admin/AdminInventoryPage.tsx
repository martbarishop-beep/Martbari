import React, { useEffect, useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Download,
  Search,
  Check,
  TrendingDown,
  DollarSign,
  Boxes,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Product, Supplier } from '../../types/database';

export const AdminInventoryPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, tAdminField, formatAdminPrice } = useAdminLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('low');

  // Quick Inline update tracking
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        supabase.from('products').select('*').order('stock', { ascending: true }),
        supabase.from('suppliers').select('*'),
      ]);

      if (pRes.error) throw pRes.error;
      setProducts((pRes.data || []) as Product[]);

      const sMap: Record<string, Supplier> = {};
      if (sRes.data) {
        sRes.data.forEach((s) => {
          sMap[s.id] = s as Supplier;
        });
      }
      setSuppliers(sMap);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load inventory', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name_en.toLowerCase().includes(q) || p.name_bn.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      if (stockStatusFilter === 'out' && p.stock > 0) return false;
      if (stockStatusFilter === 'low' && (p.stock > p.low_stock_threshold || p.stock === 0)) return false;

      return true;
    });
  }, [products, searchQuery, stockStatusFilter]);

  // Overall Metrics
  const totalStockItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValuation = products.reduce(
    (sum, p) => sum + (p.cost_price || 0) * (p.stock || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= p.low_stock_threshold
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  // Inline Stock adjustment
  const handleAdjustStock = async (productId: string, delta: number) => {
    if (!supabase) return;
    setUpdatingId(productId);
    try {
      const current = products.find((p) => p.id === productId);
      if (!current) return;

      const newStock = Math.max(0, current.stock + delta);
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
      showToast({
        type: 'success',
        title: 'Stock Updated',
        description: `${current.name_en} stock set to ${newStock}.`,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setUpdatingId(null);
    }
  };

  // Export Supplier Restock Sheet
  const handleExportRestockSheet = () => {
    const needingRestock = products.filter((p) => p.stock <= p.low_stock_threshold);
    const rows = needingRestock.map((p) => ({
      Supplier: suppliers[p.supplier_id || '']?.name || 'Unassigned',
      'Supplier Phone': suppliers[p.supplier_id || '']?.phone || '',
      'Product Name': p.name_en,
      SKU: p.sku,
      'Supplier SKU': p.supplier_sku || '',
      'Current Stock': p.stock,
      'Threshold': p.low_stock_threshold,
      'Cost (৳)': p.cost_price,
      'Recommended Order Qty': Math.max(10, p.low_stock_threshold * 2),
      'Supplier URL': p.supplier_product_url || '',
    }));

    exportToCsv(`martbari-supplier-restock-sheet-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({ type: 'success', title: `Exported restock order sheet (${rows.length} items)` });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('inventory.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">
            {at('inventory.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportRestockSheet}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          {at('inventory.exportRestock')}
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('inventory.totalUnits')}
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#0F1A2C]">
              {totalStockItems.toLocaleString()}
            </span>
            <Boxes className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">{at('inventory.acrossActive')}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('inventory.valuation')}
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#0F1A2C]">
              {formatAdminPrice(totalValuation)}
            </span>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">{at('inventory.capitalTied')}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('inventory.lowAlerts')}
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{lowStockCount}</span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-1 text-xs text-amber-600 font-medium">{at('inventory.underThreshold')}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('inventory.outOfStock')}
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-600">{outOfStockCount}</span>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-1 text-xs text-red-600 font-medium">{at('inventory.immediateAction')}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
            <Input
              type="text"
              placeholder={at('inventory.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as typeof stockStatusFilter)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="low">{at('inventory.filterLow')}</option>
              <option value="out">{at('inventory.filterOut')}</option>
              <option value="all">{at('inventory.filterAll')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">
            {at('inventory.noneFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">{at('inventory.col.productSku')}</th>
                  <th className="py-3 px-4 font-semibold">{at('products.col.supplier')}</th>
                  <th className="py-3 px-4 font-semibold">{at('products.col.cost')}</th>
                  <th className="py-3 px-4 font-semibold">{at('inventory.col.selling')}</th>
                  <th className="py-3 px-4 font-semibold">{at('products.col.stock')}</th>
                  <th className="py-3 px-4 font-semibold">{at('inventory.col.threshold')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{at('inventory.col.quickActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredProducts.map((p) => {
                  const supp = suppliers[p.supplier_id || ''];
                  const isUpdating = updatingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="font-bold text-[#0F1A2C] truncate">{tAdminField(p, 'name')}</div>
                        <div className="text-[11px] font-mono text-[#5B6577]">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-[#5B6577]">
                        <div>{supp?.name || '—'}</div>
                        {p.supplier_sku && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            Ref: {p.supplier_sku}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0F1A2C] tabular-nums">
                        {formatAdminPrice(p.cost_price || 0)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#F47125] tabular-nums">
                        {formatAdminPrice(p.sale_price ?? p.price)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-black px-2 py-0.5 rounded ${
                            p.stock === 0
                              ? 'bg-red-50 text-red-600'
                              : p.stock <= p.low_stock_threshold
                              ? 'bg-amber-50 text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {at('inventory.units', { count: p.stock })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5B6577]">{p.low_stock_threshold}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleAdjustStock(p.id, 5)}
                            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleAdjustStock(p.id, 10)}
                            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleAdjustStock(p.id, 25)}
                            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors"
                          >
                            +25
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

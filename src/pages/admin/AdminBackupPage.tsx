import React, { useState } from 'react';
import { Database, Download, FileSpreadsheet, ShieldCheck, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';

export const AdminBackupPage: React.FC = () => {
  const { showToast } = useToast();
  const { at } = useAdminLanguage();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (table: string, filename: string) => {
    if (!supabase) return;
    setDownloading(table);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      if (!data || data.length === 0) {
        showToast({ type: 'warning', title: `Table ${table} has no records to export.` });
        return;
      }

      exportToCsv(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`, data);
      showToast({ type: 'success', title: `Exported ${data.length} records from ${table}` });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Export failed', description: (err as Error)?.message });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportFullJson = async () => {
    if (!supabase) return;
    setDownloading('all_json');
    try {
      const [p, o, c, s, cat, b] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('brands').select('*'),
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        store: 'MartBari',
        products: p.data || [],
        orders: o.data || [],
        customers: c.data || [],
        suppliers: s.data || [],
        categories: cat.data || [],
        brands: b.data || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `martbari-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({ type: 'success', title: 'Full JSON database snapshot exported' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Export failed', description: (err as Error)?.message });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
          {at('backup.title')}
        </h1>
        <p className="text-sm text-[#5B6577]">
          {at('backup.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Full JSON Snapshot */}
        <div className="col-span-full rounded-2xl border border-[#F47125]/30 bg-orange-50/50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-bold text-base text-[#0F1A2C] flex items-center gap-2">
              <Database className="h-5 w-5 text-[#F47125]" /> {at('backup.fullJsonTitle')}
            </h2>
            <p className="text-xs text-[#5B6577]">
              {at('backup.fullJsonDesc')}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleExportFullJson}
            disabled={downloading === 'all_json'}
            className="bg-[#F47125] text-white hover:bg-[#e05e13] gap-1.5 shrink-0"
          >
            <Download className="h-4 w-4" />
            {downloading === 'all_json' ? at('backup.exporting') : at('backup.exportJsonBtn')}
          </Button>
        </div>

        {/* Products CSV */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#0F1A2C] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {at('nav.products')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {at('products.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport('products', 'martbari-products')}
            disabled={downloading === 'products'}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> {at('backup.downloadCsv')}
          </Button>
        </div>

        {/* Orders CSV */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#0F1A2C] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" /> {at('nav.orders')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {at('orders.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport('orders', 'martbari-orders')}
            disabled={downloading === 'orders'}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> {at('backup.downloadCsv')}
          </Button>
        </div>

        {/* Customers CSV */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#0F1A2C] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-purple-600" /> {at('nav.customers')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {at('customers.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport('customers', 'martbari-customers')}
            disabled={downloading === 'customers'}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> {at('backup.downloadCsv')}
          </Button>
        </div>

        {/* Suppliers CSV */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#0F1A2C] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" /> {at('nav.suppliers')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {at('suppliers.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport('suppliers', 'martbari-suppliers')}
            disabled={downloading === 'suppliers'}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> {at('backup.downloadCsv')}
          </Button>
        </div>

        {/* Coupons CSV */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#0F1A2C] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-amber-600" /> {at('nav.coupons')}
            </h3>
            <p className="text-xs text-[#5B6577]">
              {at('coupons.subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport('coupons', 'martbari-coupons')}
            disabled={downloading === 'coupons'}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" /> {at('backup.downloadCsv')}
          </Button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Download,
  Ban,
  CheckCircle,
  Phone,
  ArrowUpRight,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Customer } from '../../types/database';

export const AdminCustomersPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, formatAdminPrice } = useAdminLanguage();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

  const fetchCustomers = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers((data || []) as Customer[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load customers', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchDistrict = c.district ? c.district.toLowerCase().includes(q) : false;
        if (!matchName && !matchPhone && !matchDistrict) return false;
      }

      if (statusFilter === 'active' && c.is_blocked) return false;
      if (statusFilter === 'blocked' && !c.is_blocked) return false;

      return true;
    });
  }, [customers, searchQuery, statusFilter]);

  // Metrics
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.total_orders > 1).length;
  const blockedCount = customers.filter((c) => c.is_blocked).length;

  const handleExportCsv = () => {
    const rows = filteredCustomers.map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email || '',
      District: c.district || '',
      Address: c.default_address || '',
      'Total Orders': c.total_orders,
      'Total Spent': c.total_spent,
      Blocked: c.is_blocked ? 'Yes' : 'No',
      'Block Reason': c.block_reason || '',
    }));
    exportToCsv(`martbari-customers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({ type: 'success', title: `Exported ${rows.length} customers to CSV` });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('customers.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('customers.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" />
          {at('common.exportCsv')}
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('customers.total')}
          </span>
          <div className="mt-2 text-2xl font-black text-[#0F1A2C]">{totalCustomers}</div>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('customers.repeat')}
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-600">{repeatCustomers}</div>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('customers.blocked')}
          </span>
          <div className="mt-2 text-2xl font-black text-red-600">{blockedCount}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
            <Input
              type="text"
              placeholder={at('customers.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="all">{at('customers.filterAll')}</option>
              <option value="active">{at('customers.filterActive')}</option>
              <option value="blocked">{at('customers.filterBlocked')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">{at('customers.noneFound')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">{at('orders.col.customer')}</th>
                  <th className="py-3 px-4 font-semibold">{at('suppliers.phone')}</th>
                  <th className="py-3 px-4 font-semibold">{at('dashboard.col.district')}</th>
                  <th className="py-3 px-4 font-semibold">{at('customers.col.orders')}</th>
                  <th className="py-3 px-4 font-semibold">{at('customers.col.spent')}</th>
                  <th className="py-3 px-4 font-semibold">{at('common.status')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{at('orders.col.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0F1A2C]">{c.name}</div>
                      {c.email && <div className="text-[11px] text-[#5B6577]">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#0F1A2C]">{c.phone}</td>
                    <td className="py-3 px-4 text-[#5B6577]">{c.district || '—'}</td>
                    <td className="py-3 px-4 font-bold text-[#0F1A2C]">
                      {c.total_orders}
                      {c.total_orders > 1 && (
                        <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                          {at('customers.repeatTag')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#F47125] tabular-nums">
                      {formatAdminPrice(c.total_spent)}
                    </td>
                    <td className="py-3 px-4">
                      {c.is_blocked ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          {at('customers.blockedStatus')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {at('common.active')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/admin/customers/${c.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#17263E] hover:text-[#F47125]"
                      >
                        {at('customers.profileLink')} <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Package,
  Truck,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { exportToCsv } from '../../lib/exportCsv';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Order, OrderItem, Supplier } from '../../types/database';

export const AdminReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, formatAdminPrice } = useAdminLanguage();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'month' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRange === '7d') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      let q = supabase.from('orders').select('*');
      if (startDate) {
        q = q.gte('created_at', startDate.toISOString());
      }
      const { data: oData, error: oErr } = await q;
      if (oErr) throw oErr;
      const ords = (oData || []) as Order[];
      setOrders(ords);

      const orderIds = ords.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: itData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds.slice(0, 300));
        setOrderItems((itData || []) as OrderItem[]);
      } else {
        setOrderItems([]);
      }

      const { data: sData } = await supabase.from('suppliers').select('*');
      if (sData) {
        const sMap: Record<string, Supplier> = {};
        sData.forEach((s) => {
          sMap[s.id] = s as Supplier;
        });
        setSuppliers(sMap);
      }
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load report', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [timeRange]);

  // Calculations
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const deliveredIds = new Set(deliveredOrders.map((o) => o.id));

  const totalGrossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  let deliveredCost = 0;
  orderItems.forEach((it) => {
    if (deliveredIds.has(it.order_id)) {
      deliveredCost += (it.cost_price || 0) * (it.quantity || 1);
    }
  });

  const netRealizedProfit = deliveredRevenue - deliveredCost;
  const totalDeliveryCharges = orders.reduce((sum, o) => sum + (o.delivery_charge || 0), 0);
  const totalDiscounts = orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0);

  // Top products
  const productSalesMap: Record<string, { name: string; qty: number; sales: number }> = {};
  orderItems.forEach((it) => {
    if (!productSalesMap[it.product_name]) {
      productSalesMap[it.product_name] = { name: it.product_name, qty: 0, sales: 0 };
    }
    productSalesMap[it.product_name].qty += it.quantity;
    productSalesMap[it.product_name].sales += it.unit_price * it.quantity;
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8);

  // District Breakdown
  const districtMap: Record<string, number> = {};
  orders.forEach((o) => {
    const d = o.district || 'Other';
    districtMap[d] = (districtMap[d] || 0) + 1;
  });
  const districtList = Object.entries(districtMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Export CSV
  const handleExportReport = () => {
    const rows = topProducts.map((p) => ({
      Product: p.name,
      'Units Sold': p.qty,
      'Total Sales (৳)': p.sales,
    }));
    exportToCsv(`martbari-financial-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast({ type: 'success', title: 'Exported report to CSV' });
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('reports.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">
            {at('reports.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#E1E4EA] bg-white p-1">
            {(
              [
                { id: '7d', label: at('dashboard.range.7d') },
                { id: '30d', label: at('dashboard.range.30d') },
                { id: 'month', label: at('reports.range.thisMonth') },
                { id: 'all', label: at('dashboard.range.all') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeRange === tab.id
                    ? 'bg-[#17263E] text-white shadow-xs'
                    : 'text-[#5B6577] hover:text-[#0F1A2C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExportReport} className="gap-1.5">
            <Download className="h-4 w-4" /> {at('common.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Accounting KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('reports.grossOrders')}
          </span>
          <div className="mt-2 text-2xl font-black text-[#0F1A2C] tabular-nums">
            {formatAdminPrice(totalGrossRevenue)}
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">{at('reports.acrossOrders', { count: orders.length })}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('reports.deliveredRevenue')}
          </span>
          <div className="mt-2 text-2xl font-black text-blue-600 tabular-nums">
            {formatAdminPrice(deliveredRevenue)}
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">{at('reports.realizedCash')}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('reports.cogs')}
          </span>
          <div className="mt-2 text-2xl font-black text-gray-700 tabular-nums">
            {formatAdminPrice(deliveredCost)}
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">{at('reports.wholesaleCost')}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('dashboard.kpi.profit')}
          </span>
          <div className="mt-2 text-2xl font-black text-[#F47125] tabular-nums">
            {formatAdminPrice(netRealizedProfit)}
          </div>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">
            {at('dashboard.kpi.profitNote')}
          </p>
        </div>
      </div>

      {/* Charts & Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#0F1A2C] uppercase tracking-wider">
            {at('reports.topProducts')}
          </h2>

          <div className="h-64 w-full">
            {topProducts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[#5B6577]">
                {at('reports.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={10} tickFormatter={(v) => `৳${v}`} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={10} />
                  <Tooltip
                    formatter={(v: any) => [`৳${Number(v || 0).toLocaleString()}`, at('dashboard.kpi.revenue')]}
                    contentStyle={{ borderRadius: '10px', fontSize: '11px' }}
                  />
                  <Bar dataKey="sales" fill="#F47125" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* District Order Volume */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#0F1A2C] uppercase tracking-wider">
            {at('reports.ordersByDistrict')}
          </h2>

          <div className="h-64 w-full">
            {districtList.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[#5B6577]">
                {at('reports.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtList}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#17263E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

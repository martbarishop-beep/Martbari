import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Package,
  Plus,
  Image,
  Tag,
  Database,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { Order, Product } from '../../types/database';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProfit: number;
  averageOrderValue: number;
  newCustomers: number;
  cancelledOrders: number;
  cancellationRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  ordered_from_supplier: '#8B5CF6',
  shipped: '#6366F1',
  delivered: '#10B981',
  rejected: '#E11D48',
  cancelled: '#EF4444',
  returned: '#6B7280',
};

export const AdminDashboardPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, tAdminField, formatAdminPrice } = useAdminLanguage();
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProfit: 0,
    averageOrderValue: 0,
    newCustomers: 0,
    cancelledOrders: 0,
    cancellationRate: 0,
  });

  const [salesTrend, setSalesTrend] = useState<Array<{ date: string; sales: number; orders: number }>>([]);
  const [statusDistribution, setStatusDistribution] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sales: number; qty: number }>>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (!supabase) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Date filter calculation
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === '7d') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
      }

      // 1. Fetch Orders
      let ordersQuery = supabase
        .from('orders')
        .select('id, order_number, customer_name, phone, total, status, payment_status, source, created_at, district')
        .order('created_at', { ascending: false });

      if (startDate) {
        ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;
      const orders = (ordersData || []) as Order[];

      // 2. Fetch Order Items for profit calculation & top products
      const orderIds = orders.map((o) => o.id);
      let totalProfit = 0;
      const productCounts: Record<string, { name: string; sales: number; qty: number }> = {};

      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('product_name, unit_price, cost_price, quantity, order_id')
          .in('order_id', orderIds.slice(0, 300)); // cap for performance

        if (itemsData) {
          // Delivered orders count toward realized profit
          const deliveredIds = new Set(orders.filter((o) => o.status === 'delivered').map((o) => o.id));
          itemsData.forEach((item) => {
            const qty = item.quantity || 1;
            const revenue = (item.unit_price || 0) * qty;
            const cost = (item.cost_price || 0) * qty;

            if (deliveredIds.has(item.order_id)) {
              totalProfit += revenue - cost;
            }

            if (!productCounts[item.product_name]) {
              productCounts[item.product_name] = { name: item.product_name, sales: 0, qty: 0 };
            }
            productCounts[item.product_name].sales += revenue;
            productCounts[item.product_name].qty += qty;
          });
        }
      }

      // 3. Calculate Key Metrics
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrdersCount = orders.length;
      const pendingCount = orders.filter((o) => o.status === 'pending').length;
      const cancelledCount = orders.filter((o) => o.status === 'cancelled' || o.status === 'returned').length;
      const aov = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
      const cancelRate = totalOrdersCount > 0 ? Math.round((cancelledCount / totalOrdersCount) * 100) : 0;

      // 4. Fetch New Customers count
      let customersQuery = supabase.from('customers').select('id', { count: 'exact', head: true });
      if (startDate) {
        customersQuery = customersQuery.gte('created_at', startDate.toISOString());
      }
      const { count: customersCount } = await customersQuery;

      setMetrics({
        totalRevenue,
        totalOrders: totalOrdersCount,
        pendingOrders: pendingCount,
        totalProfit,
        averageOrderValue: aov,
        newCustomers: customersCount || 0,
        cancelledOrders: cancelledCount,
        cancellationRate: cancelRate,
      });

      // 5. Build Sales Trend (by Day)
      const dayMap: Record<string, { sales: number; orders: number }> = {};
      orders.forEach((o) => {
        const d = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dayMap[d]) dayMap[d] = { sales: 0, orders: 0 };
        dayMap[d].sales += o.total || 0;
        dayMap[d].orders += 1;
      });
      const trend = Object.entries(dayMap).map(([date, val]) => ({
        date,
        sales: val.sales,
        orders: val.orders,
      }));
      setSalesTrend(trend.reverse());

      // 6. Build Status Distribution
      const statusCounts: Record<string, number> = {};
      orders.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      const distribution = Object.entries(statusCounts).map(([status, count]) => ({
        name: at(`status.${status}`) !== `status.${status}` ? at(`status.${status}`) : status.replace(/_/g, ' '),
        value: count,
        color: STATUS_COLORS[status] || '#94A3B8',
      }));
      setStatusDistribution(distribution);

      // 7. Top 5 Products
      const topList = Object.values(productCounts)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
      setTopProducts(topList);

      // 8. Recent 10 Orders
      setRecentOrders(orders.slice(0, 10));

      // 9. Low stock alert products
      const { data: stockData } = await supabase
        .from('products')
        .select('*')
        .filter('stock', 'lte', 5)
        .order('stock', { ascending: true })
        .limit(6);
      if (stockData) {
        setLowStockProducts(stockData as Product[]);
      }
    } catch (err: unknown) {
      console.error('Dashboard load error:', err);
      showToast({
        type: 'error',
        title: 'Failed to load dashboard data',
        description: (err as Error)?.message || 'Please check Supabase connection',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, [timeRange]);

  const handleQuickRestock = async (productId: string, currentStock: number) => {
    if (!supabase) return;
    const added = 10;
    const newStock = currentStock + added;
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;
      setLowStockProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
      );
      showToast({
        type: 'success',
        title: 'Stock Updated',
        description: `Added +${added} items to inventory.`,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Update failed',
        description: (err as Error)?.message,
      });
    }
  };

  const handleDashboardOrderAction = async (orderId: string, newStatus: 'confirmed' | 'rejected') => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        note: newStatus === 'confirmed' ? 'Order approved by admin' : 'Order rejected by admin',
      });

      setRecentOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      showToast({
        type: 'success',
        title: newStatus === 'confirmed' ? 'Order Approved' : 'Order Rejected',
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'Failed to update order',
        description: (err as Error)?.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-[#F47125]" />
          <p className="text-sm font-medium text-[#5B6577]">{at('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('dashboard.title')}</h1>
          <p className="text-sm text-[#5B6577]">{at('dashboard.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#E1E4EA] bg-white p-1 shadow-xs">
            {(
              [
                { id: 'today', label: at('dashboard.range.today') },
                { id: '7d', label: at('dashboard.range.7d') },
                { id: '30d', label: at('dashboard.range.30d') },
                { id: 'all', label: at('dashboard.range.all') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-[#17263E] text-white shadow-xs'
                    : 'text-[#5B6577] hover:text-[#0F1A2C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchDashboardData(true)}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#F47125]' : ''}`} />
            {at('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Quick Actions Launchpad */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E1E4EA] bg-white px-4 py-3 shadow-xs">
        <span className="mr-1 text-xs font-semibold text-[#5B6577]">
          {at('dashboard.quickActions')}:
        </span>
        <Link
          to="/admin/products/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#F47125] px-3.5 text-xs font-semibold text-white hover:bg-[#D95F18] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{at('dashboard.quickAddProduct').replace(/^\+\s*/, '')}</span>
        </Link>
        <Link
          to="/admin/orders?status=pending"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-white transition-colors"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-[#F47125]" />
          <span>{at('dashboard.quickPendingOrders')}</span>
          {metrics.pendingOrders > 0 && (
            <span className="rounded-full bg-[#F47125]/15 px-1.5 py-0.2 text-[10px] font-bold text-[#F47125] tabular-nums">
              {metrics.pendingOrders}
            </span>
          )}
        </Link>
        <Link
          to="/admin/banners"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-white transition-colors"
        >
          <Image className="h-3.5 w-3.5 text-[#17263E]" />
          <span>{at('dashboard.quickBanners')}</span>
        </Link>
        <Link
          to="/admin/coupons"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-white transition-colors"
        >
          <Tag className="h-3.5 w-3.5 text-[#17263E]" />
          <span>{at('dashboard.quickCoupons')}</span>
        </Link>
        <Link
          to="/admin/demo-data"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E1E4EA] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#0F1A2C] hover:border-[#17263E]/30 hover:bg-white transition-colors"
        >
          <Database className="h-3.5 w-3.5 text-[#17263E]" />
          <span>{at('dashboard.quickDemoControl')}</span>
        </Link>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Link
          to="/admin/reports"
          className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs transition-all hover:border-[#17263E]/25 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
              {at('dashboard.kpi.revenue')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#0F1A2C] tabular-nums">
              {formatAdminPrice(metrics.totalRevenue)}
            </div>
            <p className="mt-1 flex items-center text-xs text-[#5B6577] tabular-nums">
              <span>
                {at('dashboard.kpi.avgOrder')} {formatAdminPrice(metrics.averageOrderValue)}
              </span>
            </p>
          </div>
        </Link>

        {/* Total Orders */}
        <Link
          to="/admin/orders"
          className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs transition-all hover:border-[#17263E]/25 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
              {at('dashboard.kpi.orders')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#0F1A2C] tabular-nums">
              {metrics.totalOrders.toLocaleString()}
            </div>
            <p className="mt-1 flex items-center text-xs text-amber-600 font-medium">
              <Clock className="mr-1 h-3.5 w-3.5" />
              {at('dashboard.kpi.pendingConfirm', { count: metrics.pendingOrders })}
            </p>
          </div>
        </Link>

        {/* Delivered Profit */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
              {at('dashboard.kpi.profit')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#F47125]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-[#F47125] tabular-nums">
              {formatAdminPrice(metrics.totalProfit)}
            </div>
            <p className="mt-1 text-xs text-[#5B6577]">{at('dashboard.kpi.profitNote')}</p>
          </div>
        </div>

        {/* Customers & Cancellation */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
              {at('dashboard.kpi.customers')}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-[#0F1A2C] tabular-nums">
                {metrics.newCustomers}
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  metrics.cancellationRate > 15 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-[#5B6577]'
                }`}
              >
                {at('dashboard.kpi.cancelRate', { rate: metrics.cancellationRate })}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5B6577]">{at('dashboard.kpi.newCustomersNote')}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F1A2C]">{at('dashboard.chart.salesTitle')}</h2>
              <p className="text-xs text-[#5B6577]">{at('dashboard.chart.salesSub')}</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {salesTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#5B6577]">
                {at('dashboard.chart.noSales')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F47125" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F47125" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `৳${v}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`৳${Number(value || 0).toLocaleString()}`, at('dashboard.chart.salesUnit')]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E1E4EA', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#F47125"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F1A2C]">{at('dashboard.chart.statusTitle')}</h2>
            <p className="text-xs text-[#5B6577]">{at('dashboard.chart.statusSub')}</p>
          </div>

          <div className="h-52 w-full">
            {statusDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#5B6577]">
                {at('dashboard.chart.noOrders')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #E1E4EA', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {statusDistribution.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-[#5B6577]">{item.name}</span>
                <span className="ml-auto font-bold text-[#0F1A2C]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Row: Recent Orders & Low Stock Alert */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent 10 Orders Table */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F1A2C]">{at('dashboard.recentOrders')}</h2>
              <p className="text-xs text-[#5B6577]">{at('dashboard.recentOrdersSub')}</p>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#F47125] hover:underline"
            >
              {at('dashboard.viewAllOrders')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                <tr>
                  <th className="pb-2.5 font-semibold">{at('dashboard.col.order')}</th>
                  <th className="pb-2.5 font-semibold">{at('dashboard.col.customer')}</th>
                  <th className="pb-2.5 font-semibold">{at('dashboard.col.district')}</th>
                  <th className="pb-2.5 font-semibold">{at('dashboard.col.total')}</th>
                  <th className="pb-2.5 font-semibold">{at('dashboard.col.status')}</th>
                  <th className="pb-2.5 text-right font-semibold">{at('dashboard.col.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#5B6577]">
                      {at('dashboard.chart.noOrders')}
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 font-semibold text-[#0F1A2C]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono">{order.order_number}</span>
                          {order.source === 'ai_chat' && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 border border-purple-200 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                              <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                              AI Chat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-[#0F1A2C]">{order.customer_name}</div>
                        <div className="text-[11px] text-[#5B6577]">{order.phone}</div>
                      </td>
                      <td className="py-3 text-[#5B6577]">{order.district}</td>
                      <td className="py-3 font-bold text-[#0F1A2C] tabular-nums">
                        {formatAdminPrice(order.total)}
                      </td>
                      <td className="py-3">
                        <StatusBadge type="order" status={order.status} />
                      </td>
                      <td className="py-3 text-right">
                        {order.status === 'pending' ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleDashboardOrderAction(order.id, 'confirmed')}
                              title="Approve"
                              className="inline-flex items-center gap-0.5 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDashboardOrderAction(order.id, 'rejected')}
                              title="Reject"
                              className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-[#17263E] hover:text-[#F47125]"
                          >
                            {at('common.details')} <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <h2 className="text-base font-bold text-[#0F1A2C]">{at('dashboard.lowStock')}</h2>
                <p className="text-xs text-[#5B6577]">{at('dashboard.lowStockSub')}</p>
              </div>
            </div>
            <Link
              to="/admin/inventory"
              className="text-xs font-bold text-[#F47125] hover:underline"
            >
              {at('nav.inventory')}
            </Link>
          </div>

          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-[#5B6577]">
                <Package className="h-8 w-8 text-emerald-500 mb-1" />
                <span>{at('dashboard.healthyStock')}</span>
              </div>
            ) : (
              lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-[#E1E4EA] p-3 text-xs hover:border-[#F47125]/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate font-semibold text-[#0F1A2C]">{tAdminField(p, 'name')}</p>
                    <p className="text-[11px] text-[#5B6577]">SKU: {p.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black px-2 py-0.5 rounded-md tabular-nums ${
                        p.stock === 0
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {at('dashboard.leftCount', { count: p.stock })}
                    </span>
                    <button
                      onClick={() => void handleQuickRestock(p.id, p.stock)}
                      className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-[#17263E] hover:bg-[#17263E] hover:text-white transition-colors cursor-pointer"
                      title="Quick add +10 items"
                    >
                      +10
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

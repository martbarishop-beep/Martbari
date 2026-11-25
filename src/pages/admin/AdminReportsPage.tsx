import React, { useEffect, useState } from 'react';
import {
  Ban,
  Download,
  RefreshCw,
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
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import {
  Expense,
  MonthlyProfitLossRow,
  Order,
  OrderItem,
  SupplierPayableSummaryRow,
} from '../../types/database';

const FULFILLED_STATUSES = new Set(['delivered', 'courier_paid', 'supplier_paid']);

export const AdminReportsPage: React.FC = () => {
  const { canAccess } = useAdminAuth();
  const { showToast } = useToast();
  const { adminLang, at, formatAdminPrice } = useAdminLanguage();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'month' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyPnl, setMonthlyPnl] = useState<MonthlyProfitLossRow[]>([]);
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayableSummaryRow[]>([]);

  const fetchData = async () => {
    if (!supabase || !canAccess('reports')) {
      setLoading(false);
      return;
    }
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

      let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (startDate) {
        q = q.gte('created_at', startDate.toISOString());
      }
      const { data: oData, error: oErr } = await q;
      if (oErr) throw oErr;
      const realOrders = ((oData || []) as Order[]).filter((o) => !o.is_test);
      setOrders(realOrders);

      const orderIds = realOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: itData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds.slice(0, 500));
        setOrderItems((itData || []) as OrderItem[]);
      } else {
        setOrderItems([]);
      }

      // Fetch non-void, non-test expenses
      try {
        let expQ = supabase
          .from('expenses')
          .select('*')
          .eq('is_void', false)
          .eq('is_test', false)
          .order('expense_date', { ascending: false });
        if (startDate) {
          expQ = expQ.gte('expense_date', startDate.toISOString().slice(0, 10));
        }
        const { data: expData, error: expErr } = await expQ;
        if (!expErr && expData) {
          setExpenses(expData as Expense[]);
        } else {
          setExpenses([]);
        }
      } catch {
        setExpenses([]);
      }

      // Fetch SQL P&L Views (gracefully fallback if migration not yet executed)
      try {
        const [pnlRes, supRes] = await Promise.all([
          supabase.from('v_monthly_profit_loss').select('*').limit(12),
          supabase.from('v_supplier_payables_summary').select('*'),
        ]);
        if (!pnlRes.error && pnlRes.data) {
          setMonthlyPnl(pnlRes.data as MonthlyProfitLossRow[]);
        }
        if (!supRes.error && supRes.data) {
          setSupplierPayables(supRes.data as SupplierPayableSummaryRow[]);
        }
      } catch {
        // Fallback silently
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

  if (!canAccess('reports')) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <Ban className="mx-auto h-10 w-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-[#0F1A2C]">
          {adminLang === 'bn' ? 'অ্যাক্সেস সীমিত' : 'Access Restricted'}
        </h2>
        <p className="mt-1 text-xs text-[#5B6577]">
          {adminLang === 'bn'
            ? 'আর্থিক রিপোর্ট ও লাভ-ক্ষতি শুধুমাত্র Admin এবং Manager দেখতে পারবেন।'
            : 'Financial reports and profit & loss statements are restricted to Admin and Manager accounts.'}
        </p>
      </div>
    );
  }

  // Calculations (excluding cancelled/rejected & test orders)
  const validOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'rejected');
  const deliveredOrders = orders.filter((o) => FULFILLED_STATUSES.has(o.status));
  const returnedOrders = orders.filter((o) => o.status === 'returned');
  const deliveredIds = new Set(deliveredOrders.map((o) => o.id));

  const totalGrossRevenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const deliveredRevenue = deliveredOrders.reduce(
    (sum, o) =>
      sum +
      (Number(o.subtotal || 0) -
        Number(o.discount_amount || 0) +
        Number(o.delivery_charge_charged ?? o.delivery_charge ?? 0)),
    0,
  );

  let deliveredCost = 0;
  orderItems.forEach((it) => {
    if (deliveredIds.has(it.order_id)) {
      deliveredCost += Number(it.cost_price || 0) * Number(it.quantity || 1);
    }
  });

  const deliveredCourierAndCodFees = deliveredOrders.reduce(
    (sum, o) =>
      sum + Number(o.delivery_charge_courier ?? o.courier_fee ?? 0) + Number(o.cod_charge ?? 0),
    0,
  );

  const returnLosses = returnedOrders.reduce(
    (sum, o) =>
      sum +
      Number(o.delivery_charge_courier ?? o.courier_fee ?? 0) +
      Number(o.cod_charge ?? 0) +
      Number(o.return_adjustment ?? 0),
    0,
  );

  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grossTradingProfit = deliveredRevenue - deliveredCost - deliveredCourierAndCodFees - returnLosses;
  const netOperatingProfit = grossTradingProfit - totalOperatingExpenses;

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
  validOrders.forEach((o) => {
    const d = o.district || 'Other';
    districtMap[d] = (districtMap[d] || 0) + 1;
  });
  const districtList = Object.entries(districtMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Export CSV
  const handleExportReport = () => {
    if (monthlyPnl.length > 0) {
      const rows = monthlyPnl.map((m) => ({
        Month: m.month_start.slice(0, 7),
        'Delivered Orders': m.delivered_count,
        'Returned Orders': m.returned_count,
        'Gross Revenue': m.gross_revenue,
        'Supplier Cost': m.supplier_cogs,
        'Courier + COD Fees': Number(m.courier_charges || 0) + Number(m.cod_fees || 0),
        'Operating Expenses': m.operating_expenses,
        'Net Operating Profit': m.net_profit,
      }));
      exportToCsv(`martbari-pnl-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } else {
      const rows = topProducts.map((p) => ({
        Product: p.name,
        'Units Sold': p.qty,
        'Total Sales': p.sales,
      }));
      exportToCsv(`martbari-financial-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    }
    showToast({ type: 'success', title: adminLang === 'bn' ? 'CSV এক্সপোর্ট সম্পন্ন' : 'Exported report to CSV' });
  };

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Spinner size="lg" className="text-[#F47125]" />
      </div>
    );
  }

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

          <Button variant="outline" size="sm" onClick={() => void fetchData()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> {at('common.refresh')}
          </Button>
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
          <p className="mt-1 text-xs text-[#5B6577]">{at('reports.acrossOrders', { count: validOrders.length })}</p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('reports.deliveredRevenue')}
          </span>
          <div className="mt-2 text-2xl font-black text-blue-600 tabular-nums">
            {formatAdminPrice(deliveredRevenue)}
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">
            {adminLang === 'bn'
              ? `${deliveredOrders.length}টি ডেলিভার্ড/সেটেল্ড অর্ডার`
              : `${deliveredOrders.length} delivered/settled orders`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {at('reports.cogs')}
          </span>
          <div className="mt-2 text-2xl font-black text-gray-800 tabular-nums">
            {formatAdminPrice(deliveredCost)}
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">
            {adminLang === 'bn'
              ? `কুরিয়ার/COD: ${formatAdminPrice(deliveredCourierAndCodFees)} · রিটার্ন ক্ষতি: ${formatAdminPrice(returnLosses)}`
              : `Courier/COD: ${formatAdminPrice(deliveredCourierAndCodFees)} · Returns: ${formatAdminPrice(returnLosses)}`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6577]">
            {adminLang === 'bn' ? 'নিট অপারেটিং লাভ' : 'Net Operating Profit'}
          </span>
          <div
            className={`mt-2 text-2xl font-black tabular-nums ${
              netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatAdminPrice(netOperatingProfit)}
          </div>
          <p className="mt-1 text-xs text-[#5B6577]">
            {adminLang === 'bn'
              ? `খরচ বাদ দিয়ে (${formatAdminPrice(totalOperatingExpenses)} খরচ)`
              : `After ${formatAdminPrice(totalOperatingExpenses)} operating expenses`}
          </p>
        </div>
      </div>

      {/* Monthly P&L Breakdown */}
      {monthlyPnl.length > 0 && (
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-[#0F1A2C] uppercase tracking-wider">
            {adminLang === 'bn' ? 'মাসিক লাভ-ক্ষতি (P&L) বিবরণী' : 'Monthly Profit & Loss (P&L)'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                <tr>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'মাস' : 'Month'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'ডেলিভার্ড' : 'Delivered'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'রিটার্ন' : 'Returned'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'আয়' : 'Revenue'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'সাপ্লায়ার' : 'Supplier'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'কুরিয়ার+COD' : 'Courier+COD'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'অন্য খরচ' : 'Expenses'}</th>
                  <th className="py-2 text-right">{adminLang === 'bn' ? 'নিট লাভ' : 'Net Profit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {monthlyPnl.map((row) => {
                  const net = Number(row.net_profit || 0);
                  return (
                    <tr key={row.month_start} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 pr-3 font-mono font-bold text-[#0F1A2C]">{row.month_start.slice(0, 7)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.delivered_count}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-rose-600">{row.returned_count}</td>
                      <td className="py-2.5 pr-3 tabular-nums font-semibold">
                        {formatAdminPrice(Number(row.gross_revenue || 0))}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-[#5B6577]">
                        {formatAdminPrice(Number(row.supplier_cogs || 0))}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-[#5B6577]">
                        {formatAdminPrice(Number(row.courier_charges || 0) + Number(row.cod_fees || 0))}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-[#5B6577]">
                        {formatAdminPrice(Number(row.operating_expenses || 0))}
                      </td>
                      <td
                        className={`py-2.5 text-right font-black tabular-nums ${
                          net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatAdminPrice(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Payables Summary */}
      {supplierPayables.length > 0 && (
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-[#0F1A2C] uppercase tracking-wider">
            {adminLang === 'bn' ? 'সাপ্লায়ার হিসাব ও বকেয়া সারসংক্ষেপ' : 'Supplier Payables Summary'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                <tr>
                  <th className="py-2 pr-3">{at('products.col.supplier')}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'বকেয়া অর্ডার' : 'Due Orders'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'মোট ক্রয়' : 'Total Billed'}</th>
                  <th className="py-2 pr-3">{adminLang === 'bn' ? 'পরিশোধিত' : 'Paid'}</th>
                  <th className="py-2 text-right">{adminLang === 'bn' ? 'বকেয়া' : 'Due'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {supplierPayables.map((s) => (
                  <tr key={s.supplier_id || s.supplier_name || 'unknown'} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 pr-3 font-semibold text-[#0F1A2C]">{s.supplier_name || '—'}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{s.due_orders_count}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatAdminPrice(Number(s.total_billed || 0))}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-emerald-700">
                      {formatAdminPrice(Number(s.total_paid || 0))}
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums text-amber-700">
                      {formatAdminPrice(Number(s.total_due || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

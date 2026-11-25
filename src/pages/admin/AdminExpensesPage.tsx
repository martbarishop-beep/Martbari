import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Calendar,
  Download,
  Plus,
  Receipt,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../lib/auth';
import { exportToCsv } from '../../lib/exportCsv';
import { formatDate, formatPrice } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { getTodayIsoDate, isNotFutureDate, isPositiveNumber } from '../../lib/validation';
import type { Expense, ExpenseCategory } from '../../types/database';

const CATEGORIES: ExpenseCategory[] = [
  'ads',
  'packaging',
  'courier_adjustment',
  'office_internet',
  'other',
];

export const AdminExpensesPage: React.FC = () => {
  const { user, canAccess } = useAdminAuth();
  const { adminLang, at } = useAdminLanguage();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('ads');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayIsoDate());
  const [note, setNote] = useState('');
  const [isTest, setIsTest] = useState(false);
  const [saving, setSaving] = useState(false);

  // Void Modal
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const loadExpenses = async () => {
    if (!supabase) return;
    setLoading(true);
    setTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (
          error.code === '42P01' ||
          error.message?.toLowerCase().includes('expenses')
        ) {
          setTableMissing(true);
          setExpenses([]);
          return;
        }
        throw error;
      }

      setExpenses((data || []) as Expense[]);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'খরচ তালিকা লোড হয়নি' : 'Failed to load expenses',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((exp) => {
      if (!showVoided && exp.is_void) return false;
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (dateFrom && exp.expense_date < dateFrom) return false;
      if (dateTo && exp.expense_date > dateTo) return false;
      if (q) {
        const match =
          exp.title.toLowerCase().includes(q) ||
          (exp.note || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [expenses, showVoided, categoryFilter, dateFrom, dateTo, search]);

  const kpis = useMemo(() => {
    const active = expenses.filter((e) => !e.is_void && !e.is_test);
    const today = getTodayIsoDate();
    const monthPrefix = today.slice(0, 7);

    const totalAll = active.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalMonth = active
      .filter((e) => e.expense_date.startsWith(monthPrefix))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalAds = active
      .filter((e) => e.category === 'ads')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const filteredTotal = filteredExpenses
      .filter((e) => !e.is_void)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return { totalAll, totalMonth, totalAds, filteredTotal };
  }, [expenses, filteredExpenses]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!title.trim()) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'খরচের বিবরণ লিখুন' : 'Expense title required',
      });
      return;
    }
    if (!isPositiveNumber(amount)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সঠিক পরিমাণ দিন' : 'Valid positive amount required',
      });
      return;
    }
    if (!isNotFutureDate(expenseDate)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ভবিষ্যতের তারিখ দেওয়া যাবে না' : 'Future date is not allowed',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category,
        title: title.trim(),
        amount: Number(amount),
        expense_date: expenseDate,
        note: note.trim() || null,
        is_test: isTest,
        created_by: user?.id || null,
      };
      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;

      setExpenses((prev) => [data as Expense, ...prev]);
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setNote('');
      setIsTest(false);

      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'খরচ সংরক্ষিত হয়েছে' : 'Expense recorded',
      });
      await logActivity('CREATE_EXPENSE', 'expenses', (data as Expense).id, {
        category: payload.category,
        amount: payload.amount,
      });
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'খরচ যোগ ব্যর্থ' : 'Failed to save expense',
        description: (err as Error)?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVoidExpense = async () => {
    if (!supabase || !voidTarget) return;
    if (!voidReason.trim()) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'বাতিলের কারণ লিখুন' : 'Void reason is required',
      });
      return;
    }

    setVoiding(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          is_void: true,
          void_reason: voidReason.trim(),
          voided_at: new Date().toISOString(),
          voided_by: user?.id || null,
        })
        .eq('id', voidTarget.id);
      if (error) throw error;

      setExpenses((prev) =>
        prev.map((ex) =>
          ex.id === voidTarget.id
            ? {
                ...ex,
                is_void: true,
                void_reason: voidReason.trim(),
                voided_at: new Date().toISOString(),
                voided_by: user?.id || null,
              }
            : ex,
        ),
      );
      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'খরচটি Void (বাতিল) করা হয়েছে' : 'Expense voided cleanly',
      });
      await logActivity('VOID_EXPENSE', 'expenses', voidTarget.id, { reason: voidReason.trim() });
      setVoidTarget(null);
      setVoidReason('');
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'Void করা যায়নি' : 'Failed to void expense',
        description: (err as Error)?.message,
      });
    } finally {
      setVoiding(false);
    }
  };

  const handleExport = () => {
    exportToCsv(
      'martbari_expenses',
      filteredExpenses.map((e) => ({
        date: e.expense_date,
        category: at(`expenses.cat.${e.category}`),
        title: e.title,
        amount: e.amount,
        note: e.note || '',
        status: e.is_void ? 'VOID' : 'ACTIVE',
        is_test: e.is_test ? 'YES' : 'NO',
      })),
    );
  };

  if (!canAccess('reports')) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {adminLang === 'bn'
          ? 'খরচ ও হিসাব ব্যবস্থাপনা শুধুমাত্র Admin এবং Manager-এর জন্য অনুমোদিত।'
          : 'Expenses and accounting are restricted to Admin and Manager accounts.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('expenses.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">{at('expenses.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" />
            {at('common.exportCsv')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setExpenseDate(getTodayIsoDate());
              setIsModalOpen(true);
            }}
            className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
          >
            <Plus className="h-4 w-4" />
            {at('expenses.add')}
          </Button>
        </div>
      </div>

      {tableMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
          <p className="font-bold">
            {adminLang === 'bn'
              ? 'Supabase-এ এখনো expenses টেবিল তৈরি করা হয়নি'
              : 'Database migration pending: expenses table not found'}
          </p>
          <p>
            {adminLang === 'bn'
              ? 'Supabase SQL Editor-এ Part 2–4 SQL স্ক্রিপ্ট রান করলে খরচ ব্যবস্থাপনা সচল হবে।'
              : 'Run SQL Parts 2–4 in Supabase SQL Editor to enable the Expenses ledger.'}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5B6577]">
              {adminLang === 'bn' ? 'এই মাসের মোট খরচ' : 'This Month Expenses'}
            </span>
            <Calendar className="h-4 w-4 text-[#F47125]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F1A2C] tabular-nums">
            {formatPrice(kpis.totalMonth, adminLang)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5B6577]">
              {adminLang === 'bn' ? 'মোট বিজ্ঞাপন খরচ (Ads)' : 'Total Ad Spend'}
            </span>
            <Receipt className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F1A2C] tabular-nums">
            {formatPrice(kpis.totalAds, adminLang)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5B6577]">
              {adminLang === 'bn' ? 'ফিল্টারকৃত মোট খরচ' : 'Filtered Total'}
            </span>
            <Wallet className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F1A2C] tabular-nums">
            {formatPrice(kpis.filteredTotal, adminLang)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5B6577]">
              {adminLang === 'bn' ? 'সর্বমোট সক্রিয় খরচ' : 'All-Time Active Spend'}
            </span>
            <Wallet className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700 tabular-nums">
            {formatPrice(kpis.totalAll, adminLang)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={adminLang === 'bn' ? 'শিরোনাম বা নোট দিয়ে খুঁজুন...' : 'Search by title or note...'}
            className="pl-9 text-xs"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | ExpenseCategory)}
          className="h-10 rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs font-semibold text-[#0F1A2C]"
        >
          <option value="all">{adminLang === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {at(`expenses.cat.${cat}`)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-10 rounded-xl border border-[#E1E4EA] px-3 text-xs text-[#0F1A2C]"
          title={at('orders.dateFrom')}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-10 rounded-xl border border-[#E1E4EA] px-3 text-xs text-[#0F1A2C]"
          title={at('orders.dateTo')}
        />

        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6577] cursor-pointer">
          <input
            type="checkbox"
            checked={showVoided}
            onChange={(e) => setShowVoided(e.target.checked)}
            className="rounded text-[#F47125]"
          />
          {adminLang === 'bn' ? 'Void দেখাও' : 'Show Voided'}
        </label>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-[#E1E4EA] bg-white shadow-xs">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#5B6577]">
            {at('common.noRecords')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] font-bold text-[#5B6577]">
                <tr>
                  <th className="px-4 py-3">{adminLang === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="px-4 py-3">{adminLang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="px-4 py-3">{adminLang === 'bn' ? 'বিবরণ ও নোট' : 'Title & Note'}</th>
                  <th className="px-4 py-3 text-right">{adminLang === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                  <th className="px-4 py-3 text-right">{at('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className={exp.is_void ? 'bg-gray-50/70 opacity-60' : 'hover:bg-[#F8FAFC]'}
                  >
                    <td className="px-4 py-3 font-mono text-[#0F1A2C] whitespace-nowrap">
                      {formatDate(exp.expense_date, adminLang)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#17263E]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#17263E]">
                        {at(`expenses.cat.${exp.category}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-[#0F1A2C] ${exp.is_void ? 'line-through' : ''}`}>
                          {exp.title}
                        </span>
                        {exp.is_test && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            {at('orders.testBadge')}
                          </span>
                        )}
                        {exp.is_void && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                            {at('status.voided')}
                          </span>
                        )}
                      </div>
                      {exp.note && <p className="mt-0.5 text-[11px] text-[#5B6577]">{exp.note}</p>}
                      {exp.is_void && exp.void_reason && (
                        <p className="mt-0.5 text-[11px] text-rose-700">
                          {adminLang === 'bn' ? 'বাতিলের কারণ:' : 'Void reason:'} {exp.void_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#0F1A2C] tabular-nums whitespace-nowrap">
                      {formatPrice(Number(exp.amount || 0), adminLang)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!exp.is_void && (
                        <button
                          type="button"
                          onClick={() => {
                            setVoidTarget(exp);
                            setVoidReason('');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                        >
                          <Ban className="h-3 w-3" />
                          {adminLang === 'bn' ? 'বাতিল (Void)' : 'Void'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveExpense}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">{at('expenses.add')}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'ক্যাটাগরি *' : 'Category *'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-2.5 text-xs font-semibold text-[#0F1A2C]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {at(`expenses.cat.${cat}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'তারিখ *' : 'Expense Date *'}
                </label>
                <Input
                  type="date"
                  max={getTodayIsoDate()}
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                {adminLang === 'bn' ? 'খরচের বিবরণ *' : 'Title *'}
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={adminLang === 'bn' ? 'যেমন: Facebook Boost ক্যাম্পেইন' : 'e.g. Facebook Ad Boost'}
                required
                className="text-xs font-semibold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                {adminLang === 'bn' ? 'পরিমাণ (৳) *' : 'Amount (৳) *'}
              </label>
              <Input
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#0F1A2C]">
                {adminLang === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)'}
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={adminLang === 'bn' ? 'বিস্তারিত বা রেফারেন্স লিখুন...' : 'Details or receipt reference...'}
                className="w-full rounded-xl border border-[#E1E4EA] p-2 text-xs"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-amber-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isTest}
                onChange={(e) => setIsTest(e.target.checked)}
                className="rounded text-amber-600"
              />
              {adminLang === 'bn' ? 'টেস্ট এন্ট্রি হিসেবে মার্ক করুন (is_test)' : 'Mark as Test entry (is_test)'}
            </label>

            <div className="flex justify-end gap-2 border-t border-[#E1E4EA] pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                {at('common.cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                {saving ? at('common.saving') : at('common.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Soft Void Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-rose-700">
                {adminLang === 'bn' ? 'খরচটি Void (বাতিল) করবেন?' : 'Void Expense Entry?'}
              </h3>
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#5B6577]">
              {adminLang === 'bn'
                ? `অডিট সুরক্ষার জন্য আসল হিসাব মোছা হয় না, বরং Void হিসেবে চিহ্নিত হয়। "${voidTarget.title}" (${formatPrice(Number(voidTarget.amount), adminLang)}) বাতিলের কারণ লিখুন:`
                : `For audit integrity, financial records are soft-voided instead of deleted. Enter a reason for voiding "${voidTarget.title}":`}
            </p>

            <textarea
              rows={2}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={adminLang === 'bn' ? 'বাতিলের কারণ লিখুন...' : 'Reason for voiding...'}
              className="w-full rounded-xl border border-[#E1E4EA] p-2.5 text-xs"
            />

            <div className="flex justify-end gap-2 border-t border-[#E1E4EA] pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setVoidTarget(null)}>
                {at('common.cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={voiding}
                onClick={() => void handleVoidExpense()}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {voiding
                  ? at('common.updating')
                  : adminLang === 'bn' ? 'হ্যাঁ, Void করুন' : 'Confirm Void'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

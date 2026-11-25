import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  Check,
  Copy,
  MessageSquare,
  Package,
  Search,
  Send,
  Truck,
  X,
} from 'lucide-react';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { logActivity } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { isNonNegativeNumber } from '../../lib/validation';
import type { Order, OrderItem, Supplier, SupplierOrder } from '../../types/database';

interface ProductMeta {
  id: string;
  supplier_id: string | null;
  supplier_sku: string | null;
}

interface GroupedSupplierOrderEntry {
  key: string; // `${supplierId || 'none'}::${order.id}`
  supplierId: string | null;
  supplier: Supplier | null;
  order: Order;
  items: OrderItem[];
  defaultCost: number;
}

export const AdminSupplierOrdersPage: React.FC = () => {
  const { user, canAccess } = useAdminAuth();
  const { adminLang, at, formatAdminPrice, formatAdminDate } = useAdminLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ready' | 'ledger'>('ready');
  const [loading, setLoading] = useState(true);
  const [ledgerTableMissing, setLedgerTableMissing] = useState(false);

  const [confirmedOrders, setConfirmedOrders] = useState<Order[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [suppliersMap, setSuppliersMap] = useState<Record<string, Supplier>>({});
  const [productsMap, setProductsMap] = useState<Record<string, ProductMeta>>({});

  // Placed ledger state
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [ledgerOrdersMap, setLedgerOrdersMap] = useState<Record<string, Order>>({});
  const [showVoidedLedger, setShowVoidedLedger] = useState(false);

  // Batch UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editedAmounts, setEditedAmounts] = useState<Record<string, string>>({});
  const [editedRefs, setEditedRefs] = useState<Record<string, string>>({});
  const [placingGroupId, setPlacingGroupId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  // Void Modal
  const [voidTarget, setVoidTarget] = useState<SupplierOrder | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    setLedgerTableMissing(false);
    try {
      const [ordRes, suppRes, prodRes, soRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('products').select('id, supplier_id, supplier_sku'),
        supabase
          .from('supplier_orders')
          .select('*')
          .order('placed_at', { ascending: false }),
      ]);

      if (ordRes.error) throw ordRes.error;

      const confList = (ordRes.data || []) as Order[];
      setConfirmedOrders(confList);

      const sMap: Record<string, Supplier> = {};
      (suppRes.data || []).forEach((s) => {
        sMap[s.id] = s as Supplier;
      });
      setSuppliersMap(sMap);

      const pMap: Record<string, ProductMeta> = {};
      (prodRes.data || []).forEach((p) => {
        pMap[p.id] = p as ProductMeta;
      });
      setProductsMap(pMap);

      if (confList.length > 0) {
        const confIds = confList.map((o) => o.id);
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', confIds);
        if (itemsErr) throw itemsErr;

        const iMap: Record<string, OrderItem[]> = {};
        for (const it of (itemsData || []) as OrderItem[]) {
          if (!iMap[it.order_id]) iMap[it.order_id] = [];
          iMap[it.order_id].push(it);
        }
        setOrderItemsMap(iMap);
      } else {
        setOrderItemsMap({});
      }

      if (soRes.error) {
        if (
          soRes.error.code === '42P01' ||
          soRes.error.message?.toLowerCase().includes('supplier_orders')
        ) {
          setLedgerTableMissing(true);
          setSupplierOrders([]);
        } else {
          throw soRes.error;
        }
      } else {
        const ledger = (soRes.data || []) as SupplierOrder[];
        setSupplierOrders(ledger);

        const ledgerOrderIds = Array.from(new Set(ledger.map((l) => l.order_id)));
        if (ledgerOrderIds.length > 0) {
          const { data: lOrders } = await supabase
            .from('orders')
            .select('*')
            .in('id', ledgerOrderIds);
          const loMap: Record<string, Order> = {};
          (lOrders || []).forEach((o) => {
            loMap[o.id] = o as Order;
          });
          setLedgerOrdersMap(loMap);
        }
      }
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'তথ্য লোড হয়নি' : 'Failed to load supplier orders',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Build supplier-grouped entries for confirmed orders
  const supplierGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const groups: Record<
      string,
      {
        groupId: string;
        supplierId: string | null;
        supplier: Supplier | null;
        entries: GroupedSupplierOrderEntry[];
      }
    > = {};

    for (const order of confirmedOrders) {
      const ordItems = orderItemsMap[order.id] || [];
      if (ordItems.length === 0) continue;

      // Group items inside this order by supplier
      const bySupp: Record<string, OrderItem[]> = {};
      for (const it of ordItems) {
        const effSuppId =
          it.supplier_id ||
          (it.product_id ? productsMap[it.product_id]?.supplier_id : null) ||
          '__unassigned__';
        if (!bySupp[effSuppId]) bySupp[effSuppId] = [];
        bySupp[effSuppId].push(it);
      }

      for (const [suppKey, grpItems] of Object.entries(bySupp)) {
        const supplierId = suppKey === '__unassigned__' ? null : suppKey;
        const supplier = supplierId ? suppliersMap[supplierId] || null : null;

        if (q) {
          const matchOrder = order.order_number.toLowerCase().includes(q);
          const matchCust = order.customer_name.toLowerCase().includes(q);
          const matchPhone = order.phone.toLowerCase().includes(q);
          const matchSupp = (supplier?.name || '').toLowerCase().includes(q);
          const matchProd = grpItems.some((it) => it.product_name.toLowerCase().includes(q));
          if (!matchOrder && !matchCust && !matchPhone && !matchSupp && !matchProd) continue;
        }

        const defaultCost = grpItems.reduce(
          (sum, it) => sum + Number(it.cost_price || 0) * Number(it.quantity || 1),
          0,
        );
        const entryKey = `${suppKey}::${order.id}`;

        if (!groups[suppKey]) {
          groups[suppKey] = {
            groupId: suppKey,
            supplierId,
            supplier,
            entries: [],
          };
        }
        groups[suppKey].entries.push({
          key: entryKey,
          supplierId,
          supplier,
          order,
          items: grpItems,
          defaultCost,
        });
      }
    }

    return Object.values(groups).sort((a, b) =>
      (a.supplier?.name || 'ZZZ').localeCompare(b.supplier?.name || 'ZZZ'),
    );
  }, [confirmedOrders, orderItemsMap, productsMap, suppliersMap, searchQuery]);

  const getEntryAmount = (entry: GroupedSupplierOrderEntry): number => {
    const raw = editedAmounts[entry.key];
    if (raw !== undefined) return Number(raw);
    return entry.defaultCost;
  };

  const buildSupplierMessage = (
    supplier: Supplier | null,
    entries: GroupedSupplierOrderEntry[],
  ) => {
    const header = `*MARTBARI BATCH ORDER — ${supplier?.name || 'Supplier'}*\nTotal Orders: ${entries.length}\n`;
    const body = entries
      .map((en, idx) => {
        const itemsText = en.items
          .map((it) => {
            const sku = it.product_id ? productsMap[it.product_id]?.supplier_sku : null;
            return `   - ${it.product_name}${sku ? ` [${sku}]` : ''} x ${it.quantity}`;
          })
          .join('\n');
        return `${idx + 1}) Order #${en.order.order_number} (Cost: ৳${getEntryAmount(en)})\n${itemsText}\n   Customer: ${en.order.customer_name} | ${en.order.phone}\n   Address: ${en.order.address}, ${en.order.district}\n   COD: ৳${en.order.cod_amount ?? en.order.total}`;
      })
      .join('\n\n');
    return `${header}\n${body}\n\nPlease confirm dispatch & tracking codes.`;
  };

  const handleCopyGroup = async (
    groupId: string,
    supplier: Supplier | null,
    entries: GroupedSupplierOrderEntry[],
  ) => {
    const selected = entries.filter((e) => selectedKeys.has(e.key));
    const list = selected.length > 0 ? selected : entries;
    await navigator.clipboard.writeText(buildSupplierMessage(supplier, list));
    setCopiedGroupId(groupId);
    showToast({
      type: 'success',
      title: adminLang === 'bn' ? 'অর্ডার তালিকা কপি হয়েছে!' : 'Batch list copied!',
    });
    setTimeout(() => setCopiedGroupId(null), 2500);
  };

  const handlePlaceBatchWithSupplier = async (
    groupId: string,
    supplier: Supplier | null,
    entries: GroupedSupplierOrderEntry[],
  ) => {
    if (!supabase) return;
    const selected = entries.filter((e) => selectedKeys.has(e.key));
    const targetEntries = selected.length > 0 ? selected : entries;
    if (targetEntries.length === 0) return;

    // Validate amounts >= 0
    for (const en of targetEntries) {
      const raw = editedAmounts[en.key];
      if (raw !== undefined && !isNonNegativeNumber(raw)) {
        showToast({
          type: 'error',
          title: adminLang === 'bn' ? 'ক্রয়মূল্য ০ বা তার বেশি হতে হবে' : 'Supplier amount must be >= 0',
        });
        return;
      }
    }

    setPlacingGroupId(groupId);
    try {
      const nowIso = new Date().toISOString();

      for (const en of targetEntries) {
        const amt = getEntryAmount(en);
        const ref = (editedRefs[en.key] || '').trim() || null;

        // 1. Insert supplier_orders record if table exists
        if (!ledgerTableMissing) {
          const { error: soErr } = await supabase.from('supplier_orders').insert({
            supplier_id: en.supplierId,
            order_id: en.order.id,
            status: 'placed',
            supplier_amount: amt,
            paid_amount: 0,
            supplier_ref: ref,
            placed_at: nowIso,
            is_test: Boolean(en.order.is_test),
            created_by: user?.id || null,
          });
          if (soErr && soErr.code !== '42P01') throw soErr;
        }

        // 2. Update order_items
        const itemIds = en.items.map((it) => it.id);
        await supabase
          .from('order_items')
          .update({
            supplier_order_status: 'ordered',
            supplier_order_ref: ref,
          })
          .in('id', itemIds);

        // 3. Move order to placed_with_supplier
        await supabase
          .from('orders')
          .update({
            status: 'placed_with_supplier',
            updated_at: nowIso,
          })
          .eq('id', en.order.id);

        // 4. Audit trail
        await supabase.from('order_status_history').insert({
          order_id: en.order.id,
          status: 'placed_with_supplier',
          note: `Placed with ${supplier?.name || 'Supplier'} (৳${amt})${ref ? ` [Ref: ${ref}]` : ''}`,
          changed_by: user?.id || null,
        });
      }

      showToast({
        type: 'success',
        title:
          adminLang === 'bn'
            ? `${targetEntries.length}টি অর্ডার সাপ্লায়ারে প্লেস হয়েছে`
            : `Placed ${targetEntries.length} order(s) with supplier`,
      });
      await logActivity('BATCH_PLACE_SUPPLIER_ORDER', 'supplier_orders', supplier?.id || null, {
        count: targetEntries.length,
      });

      setSelectedKeys((prev) => {
        const next = new Set(prev);
        targetEntries.forEach((e) => next.delete(e.key));
        return next;
      });
      await fetchData();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অর্ডার প্লেস ব্যর্থ' : 'Failed to place supplier orders',
        description: (err as Error)?.message,
      });
    } finally {
      setPlacingGroupId(null);
    }
  };

  const handleVoidSupplierOrder = async () => {
    if (!supabase || !voidTarget) return;
    if (!voidReason.trim()) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'বাতিলের কারণ লিখুন' : 'Void reason required',
      });
      return;
    }
    if (Number(voidTarget.paid_amount || 0) > 0) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'আগে পেমেন্ট Void করুন' : 'Cannot void paid entry',
        description:
          adminLang === 'bn'
            ? 'এই অর্ডারে সাপ্লায়ারকে টাকা দেওয়া হয়েছে। আগে পেমেন্ট ভাউচার Void করুন।'
            : 'Void the associated supplier payment voucher first.',
      });
      return;
    }

    setVoiding(true);
    try {
      const { error } = await supabase
        .from('supplier_orders')
        .update({
          is_void: true,
          status: 'cancelled',
          void_reason: voidReason.trim(),
          voided_at: new Date().toISOString(),
          voided_by: user?.id || null,
        })
        .eq('id', voidTarget.id);
      if (error) throw error;

      // Revert order back to confirmed if it is still placed_with_supplier
      const linkedOrder = ledgerOrdersMap[voidTarget.order_id];
      if (
        linkedOrder &&
        (linkedOrder.status === 'placed_with_supplier' ||
          linkedOrder.status === 'ordered_from_supplier')
      ) {
        await supabase
          .from('orders')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', voidTarget.order_id);
        await supabase.from('order_status_history').insert({
          order_id: voidTarget.order_id,
          status: 'confirmed',
          note: `Supplier order voided: ${voidReason.trim()}`,
          changed_by: user?.id || null,
        });
      }

      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'সাপ্লায়ার অর্ডার Void হয়েছে' : 'Supplier order voided',
      });
      setVoidTarget(null);
      setVoidReason('');
      await fetchData();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'Void ব্যর্থ' : 'Failed to void',
        description: (err as Error)?.message,
      });
    } finally {
      setVoiding(false);
    }
  };

  const filteredLedger = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return supplierOrders.filter((so) => {
      if (!showVoidedLedger && so.is_void) return false;
      if (q) {
        const ord = ledgerOrdersMap[so.order_id];
        const supp = so.supplier_id ? suppliersMap[so.supplier_id] : null;
        const matchOrder = (ord?.order_number || '').toLowerCase().includes(q);
        const matchSupp = (supp?.name || '').toLowerCase().includes(q);
        const matchRef = (so.supplier_ref || '').toLowerCase().includes(q);
        if (!matchOrder && !matchSupp && !matchRef) return false;
      }
      return true;
    });
  }, [supplierOrders, showVoidedLedger, searchQuery, ledgerOrdersMap, suppliersMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('supplierOrders.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">{at('supplierOrders.subtitle')}</p>
        </div>
      </div>

      {ledgerTableMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>
            {adminLang === 'bn'
              ? 'Supabase-এ supplier_orders টেবিল এখনো তৈরি হয়নি।'
              : 'supplier_orders table not found yet.'}
          </strong>{' '}
          {adminLang === 'bn'
            ? 'ব্যাচ লেজার ও আংশিক পেমেন্ট ট্র্যাক করতে SQL Part 2–4 রান করুন।'
            : 'Run SQL Parts 2–4 in Supabase SQL Editor for full ledger tracking.'}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ready')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'ready'
                ? 'bg-[#17263E] text-white'
                : 'bg-gray-100 text-[#5B6577] hover:bg-gray-200'
            }`}
          >
            {at('supplierOrders.tabPending')} ({confirmedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-[#17263E] text-white'
                : 'bg-gray-100 text-[#5B6577] hover:bg-gray-200'
            }`}
          >
            {at('supplierOrders.tabPlaced')} ({supplierOrders.filter((s) => !s.is_void).length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'ledger' && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6577] cursor-pointer">
              <input
                type="checkbox"
                checked={showVoidedLedger}
                onChange={(e) => setShowVoidedLedger(e.target.checked)}
                className="rounded text-[#F47125]"
              />
              {adminLang === 'bn' ? 'Void দেখাও' : 'Show Voided'}
            </label>
          )}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
            <Input
              type="text"
              placeholder={
                adminLang === 'bn'
                  ? 'অর্ডার #, সাপ্লায়ার বা পণ্য খুঁজুন...'
                  : 'Search order #, supplier, product...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E1E4EA] bg-white">
          <Spinner size="lg" className="text-[#F47125]" />
        </div>
      ) : activeTab === 'ready' ? (
        supplierGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E1E4EA] bg-white py-16 text-center text-sm text-[#5B6577]">
            <Package className="h-10 w-10 text-gray-300 mb-2" />
            <p className="font-semibold text-[#0F1A2C]">
              {adminLang === 'bn'
                ? 'সাপ্লায়ারে পাঠানোর মতো কোনো কনফার্মড অর্ডার নেই'
                : 'No confirmed orders waiting for supplier placement'}
            </p>
            <p className="text-xs mt-1">
              {adminLang === 'bn'
                ? 'অর্ডার পেজ থেকে অর্ডার অ্যাপ্রুভ (Confirmed) করলে এখানে সাপ্লায়ার অনুযায়ী গ্রুপ হয়ে দেখাবে।'
                : 'Confirmed orders appear here automatically grouped by supplier.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {supplierGroups.map((group) => {
              const groupSelectedCount = group.entries.filter((e) =>
                selectedKeys.has(e.key),
              ).length;
              const activeEntries =
                groupSelectedCount > 0
                  ? group.entries.filter((e) => selectedKeys.has(e.key))
                  : group.entries;
              const groupTotalAmount = activeEntries.reduce(
                (s, en) => s + getEntryAmount(en),
                0,
              );
              const waPhone = (group.supplier?.whatsapp || group.supplier?.phone || '').replace(
                /[^0-9]/g,
                '',
              );
              const waHref = waPhone
                ? `https://wa.me/${waPhone.startsWith('88') ? waPhone : `88${waPhone.replace(/^0/, '')}`}?text=${encodeURIComponent(buildSupplierMessage(group.supplier, activeEntries))}`
                : '';

              return (
                <div
                  key={group.groupId}
                  className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="flex flex-col gap-3 border-b border-[#E1E4EA] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={
                          group.entries.length > 0 &&
                          group.entries.every((e) => selectedKeys.has(e.key))
                        }
                        onChange={(e) => {
                          setSelectedKeys((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              group.entries.forEach((en) => next.add(en.key));
                            } else {
                              group.entries.forEach((en) => next.delete(en.key));
                            }
                            return next;
                          });
                        }}
                        className="rounded border-[#E1E4EA]"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Truck className="h-4 w-4 text-[#F47125]" />
                          <h2 className="text-sm font-bold text-[#0F1A2C]">
                            {group.supplier?.name ||
                              (adminLang === 'bn' ? 'সাপ্লায়ার নির্ধারিত নয়' : 'Unassigned Supplier')}
                          </h2>
                          <span className="rounded-full bg-[#17263E]/10 px-2 py-0.5 text-[10px] font-bold text-[#17263E]">
                            {group.entries.length} {adminLang === 'bn' ? 'টি অর্ডার' : 'orders'}
                          </span>
                        </div>
                        {group.supplier?.phone && (
                          <p className="text-[11px] font-mono text-[#5B6577]">
                            {group.supplier.phone}
                            {group.supplier.address ? ` • ${group.supplier.address}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-lg bg-white border border-[#E1E4EA] px-3 py-1.5 text-xs">
                        <span className="text-[#5B6577]">
                          {adminLang === 'bn' ? 'মোট ক্রয়মূল্য:' : 'Batch Total:'}{' '}
                        </span>
                        <strong className="text-[#0F1A2C] tabular-nums">
                          {formatAdminPrice(groupTotalAmount)}
                        </strong>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void handleCopyGroup(group.groupId, group.supplier, group.entries)
                        }
                        className="gap-1 text-xs"
                      >
                        {copiedGroupId === group.groupId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {at('supplierOrders.copyBatch')}
                      </Button>

                      {waHref && (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        disabled={placingGroupId === group.groupId}
                        onClick={() =>
                          void handlePlaceBatchWithSupplier(
                            group.groupId,
                            group.supplier,
                            group.entries,
                          )
                        }
                        className="gap-1 bg-[#F47125] text-white hover:bg-[#e05e13]"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {placingGroupId === group.groupId
                          ? at('common.saving')
                          : groupSelectedCount > 0
                            ? `${at('supplierOrders.placeBatch')} (${groupSelectedCount})`
                            : at('supplierOrders.placeBatch')}
                      </Button>
                    </div>
                  </div>

                  {/* Entries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#F1F3F5] text-[#5B6577]">
                        <tr>
                          <th className="py-2.5 px-4 w-8"></th>
                          <th className="py-2.5 px-4 font-semibold">{at('orders.col.order')}</th>
                          <th className="py-2.5 px-4 font-semibold">
                            {adminLang === 'bn' ? 'পণ্য ও পরিমাণ' : 'Products'}
                          </th>
                          <th className="py-2.5 px-4 font-semibold">{at('orders.col.customer')}</th>
                          <th className="py-2.5 px-4 font-semibold">
                            {adminLang === 'bn' ? 'সাপ্লায়ার রেফ (ঐচ্ছিক)' : 'Supplier Ref'}
                          </th>
                          <th className="py-2.5 px-4 text-right font-semibold">
                            {adminLang === 'bn' ? 'ক্রয়মূল্য (৳)' : 'Supplier Cost (৳)'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F3F5]">
                        {group.entries.map((entry) => (
                          <tr
                            key={entry.key}
                            className={
                              selectedKeys.has(entry.key) ? 'bg-orange-50/40' : 'hover:bg-[#F8FAFC]'
                            }
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(entry.key)}
                                onChange={(e) => {
                                  setSelectedKeys((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(entry.key);
                                    else next.delete(entry.key);
                                    return next;
                                  });
                                }}
                                className="rounded border-[#E1E4EA]"
                              />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <Link
                                to={`/admin/orders/${entry.order.id}`}
                                className="font-mono font-bold text-[#0F1A2C] hover:text-[#F47125]"
                              >
                                {entry.order.order_number}
                              </Link>
                              <div className="text-[10px] text-[#5B6577]">
                                {formatAdminDate(entry.order.created_at, true)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {entry.items.map((it) => (
                                <div key={it.id} className="text-[#0F1A2C]">
                                  <span className="font-semibold">{it.product_name}</span>{' '}
                                  <span className="font-mono text-[#F47125] font-bold">
                                    × {it.quantity}
                                  </span>
                                </div>
                              ))}
                            </td>
                            <td className="py-3 px-4 max-w-[200px]">
                              <div className="font-semibold text-[#0F1A2C]">
                                {entry.order.customer_name}
                              </div>
                              <div className="text-[11px] font-mono text-[#5B6577]">
                                {entry.order.phone}
                              </div>
                              <div className="truncate text-[10px] text-[#5B6577]" title={entry.order.address}>
                                {entry.order.district} • {entry.order.address}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                placeholder="e.g. INV-102"
                                value={editedRefs[entry.key] ?? ''}
                                onChange={(e) =>
                                  setEditedRefs((prev) => ({
                                    ...prev,
                                    [entry.key]: e.target.value,
                                  }))
                                }
                                className="w-28 rounded-lg border border-[#E1E4EA] px-2 py-1 text-xs font-mono"
                              />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number"
                                min={0}
                                value={editedAmounts[entry.key] ?? String(entry.defaultCost)}
                                onChange={(e) =>
                                  setEditedAmounts((prev) => ({
                                    ...prev,
                                    [entry.key]: e.target.value,
                                  }))
                                }
                                className="w-24 rounded-lg border border-[#E1E4EA] px-2 py-1 text-right font-mono text-xs font-bold text-[#0F1A2C]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Tab 2: Placed Supplier Orders Ledger */
        <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
          {filteredLedger.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#5B6577]">
              {at('common.noRecords')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{at('orders.col.order')}</th>
                    <th className="px-4 py-3 font-semibold">{at('products.col.supplier')}</th>
                    <th className="px-4 py-3 font-semibold">
                      {adminLang === 'bn' ? 'তারিখ ও রেফ' : 'Placed Date & Ref'}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {adminLang === 'bn' ? 'মোট বিল (৳)' : 'Amount (৳)'}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {adminLang === 'bn' ? 'পরিশোধিত' : 'Paid'}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {adminLang === 'bn' ? 'বাকি' : 'Due'}
                    </th>
                    <th className="px-4 py-3 font-semibold">{at('common.status')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{at('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {filteredLedger.map((so) => {
                    const ord = ledgerOrdersMap[so.order_id];
                    const supp = so.supplier_id ? suppliersMap[so.supplier_id] : null;
                    const due = Math.max(
                      0,
                      Number(so.supplier_amount || 0) -
                        Number(so.paid_amount || 0) -
                        Number(so.return_adjustment || 0),
                    );
                    return (
                      <tr
                        key={so.id}
                        className={so.is_void ? 'bg-gray-50 opacity-60' : 'hover:bg-[#F8FAFC]'}
                      >
                        <td className="px-4 py-3 font-mono">
                          <Link
                            to={`/admin/orders/${so.order_id}`}
                            className="font-bold text-[#0F1A2C] hover:text-[#F47125]"
                          >
                            {ord?.order_number || so.order_id.slice(0, 8)}
                          </Link>
                          {so.is_test && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                              {at('orders.testBadge')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0F1A2C]">
                          {supp?.name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[#5B6577]">{formatAdminDate(so.placed_at, true)}</div>
                          {so.supplier_ref && (
                            <div className="font-mono text-[10px] text-[#0F1A2C]">
                              Ref: {so.supplier_ref}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">
                          {formatAdminPrice(so.supplier_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                          {formatAdminPrice(so.paid_amount)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-700 tabular-nums">
                          {formatAdminPrice(due)}
                        </td>
                        <td className="px-4 py-3">
                          {so.is_void ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              {at('status.voided')}
                            </span>
                          ) : (
                            <StatusBadge type="supplier" status={so.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!so.is_void && canAccess('reports') && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidTarget(so);
                                setVoidReason('');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <Ban className="h-3 w-3" />
                              {at('supplierOrders.voidBtn')}
                            </button>
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
      )}

      {/* Void Supplier Order Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-rose-700">
                {adminLang === 'bn' ? 'সাপ্লায়ার অর্ডার Void করবেন?' : 'Void Supplier Order?'}
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
                ? 'বাতিলের কারণ লিখুন (হিসাবের অডিট রেকর্ড সংরক্ষিত থাকবে):'
                : 'Enter a reason to soft-void this supplier order record:'}
            </p>
            <textarea
              rows={2}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={adminLang === 'bn' ? 'বাতিলের কারণ...' : 'Reason...'}
              className="w-full rounded-xl border border-[#E1E4EA] p-2.5 text-xs"
            />
            <div className="flex justify-end gap-2 border-t border-[#E1E4EA] pt-3">
              <Button variant="outline" size="sm" onClick={() => setVoidTarget(null)}>
                {at('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={voiding}
                onClick={() => void handleVoidSupplierOrder()}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {voiding ? at('common.updating') : adminLang === 'bn' ? 'নিশ্চিত করুন' : 'Confirm Void'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

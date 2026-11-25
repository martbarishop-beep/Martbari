import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Search,
  Truck,
  Wallet,
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
import { exportToCsv } from '../../lib/exportCsv';
import { supabase } from '../../lib/supabase';
import { getTodayIsoDate, isNonNegativeNumber, isNotFutureDate, isPositiveNumber } from '../../lib/validation';
import type {
  CashPositionRow,
  Courier,
  CourierReceivableRow,
  CourierSettlement,
  Order,
  Supplier,
  SupplierOrder,
  SupplierPayment,
  SupplierPaymentMethod,
} from '../../types/database';

export const AdminPaymentsPage: React.FC = () => {
  const { user, canAccess } = useAdminAuth();
  const { adminLang, at, formatAdminPrice, formatAdminDate } = useAdminLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'courier' | 'supplier' | 'ledger'>('courier');
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);

  // Core data
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>([]);
  const [courierSettlements, setCourierSettlements] = useState<CourierSettlement[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [cashPos, setCashPos] = useState<CashPositionRow | null>(null);

  // 1. Courier Settlement Form State
  const [selectedCourierName, setSelectedCourierName] = useState<string>('');
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<Set<string>>(new Set());
  const [orderChargeOverrides, setOrderChargeOverrides] = useState<Record<string, string>>({});
  const [orderCodFeeOverrides, setOrderCodFeeOverrides] = useState<Record<string, string>>({});
  const [settlementDate, setSettlementDate] = useState<string>(getTodayIsoDate());
  const [settlementRef, setSettlementRef] = useState<string>('');
  const [settlementNotes, setSettlementNotes] = useState<string>('');
  const [settlementNetOverride, setSettlementNetOverride] = useState<string>('');
  const [settlementIsTest, setSettlementIsTest] = useState(false);
  const [savingSettlement, setSavingSettlement] = useState(false);

  // 2. Supplier Payment Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [includeAdvanceOrders, setIncludeAdvanceOrders] = useState<boolean>(false);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [payMethod, setPayMethod] = useState<SupplierPaymentMethod>('bkash');
  const [payDate, setPayDate] = useState<string>(getTodayIsoDate());
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payIsTest, setPayIsTest] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // 3. Ledger filter
  const [searchQuery, setSearchQuery] = useState('');

  // Void Modal
  const [voidModal, setVoidModal] = useState<{
    type: 'settlement' | 'supplier_payment';
    id: string;
    label: string;
  } | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const fetchAll = async () => {
    if (!supabase) return;
    setLoading(true);
    setMigrationMissing(false);
    try {
      const [ordRes, courRes, suppRes, soRes, csRes, spRes, cpRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('couriers').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('supplier_orders').select('*').order('placed_at', { ascending: false }),
        supabase.from('courier_settlements').select('*').order('created_at', { ascending: false }),
        supabase.from('supplier_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('v_cash_position').select('*').maybeSingle(),
      ]);

      if (ordRes.error) throw ordRes.error;
      setOrders((ordRes.data || []) as Order[]);
      if (!courRes.error && courRes.data) setCouriers(courRes.data as Courier[]);
      if (!suppRes.error && suppRes.data) setSuppliers(suppRes.data as Supplier[]);

      if (csRes.error || spRes.error || soRes.error) {
        setMigrationMissing(true);
      } else {
        setSupplierOrders((soRes.data || []) as SupplierOrder[]);
        setCourierSettlements((csRes.data || []) as CourierSettlement[]);
        setSupplierPayments((spRes.data || []) as SupplierPayment[]);
      }

      if (!cpRes.error && cpRes.data) {
        setCashPos(cpRes.data as CashPositionRow);
      }
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'পেমেন্ট ডেটা লোড হয়নি' : 'Failed to load payments data',
        description: (err as Error)?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const ordersMap = useMemo(() => {
    const m: Record<string, Order> = {};
    orders.forEach((o) => {
      m[o.id] = o;
    });
    return m;
  }, [orders]);

  const couriersMap = useMemo(() => {
    const m: Record<string, Courier> = {};
    couriers.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [couriers]);

  const suppliersMap = useMemo(() => {
    const m: Record<string, Supplier> = {};
    suppliers.forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [suppliers]);

  // Delivered unsettled COD orders
  const receivableOrders: CourierReceivableRow[] = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.status === 'delivered' &&
          o.payment_method === 'cod' &&
          o.payment_status !== 'paid' &&
          o.courier_settlement_status !== 'received',
      )
      .map((o) => {
        const matchedCourier = couriers.find(
          (c) => c.id === o.courier_id || c.name.toLowerCase() === (o.courier_name || '').toLowerCase(),
        );
        const codAmt = Number(o.cod_amount ?? o.total ?? 0);
        const isDhaka =
          o.district.toLowerCase().includes('dhaka') || o.district.includes('ঢাকা');
        const defaultChg = matchedCourier
          ? isDhaka
            ? matchedCourier.default_charge_dhaka
            : matchedCourier.default_charge_outside
          : 0;
        const expectedChg = Number(o.delivery_charge_courier ?? o.courier_fee ?? defaultChg ?? 0);
        const expectedFee = Number(
          o.cod_charge ??
            (matchedCourier ? Math.round((codAmt * matchedCourier.cod_fee_percent) / 100) : 0),
        );

        return {
          order_id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          phone: o.phone,
          district: o.district,
          courier_id: o.courier_id || matchedCourier?.id || null,
          courier_name: o.courier_name || matchedCourier?.name || 'Unassigned',
          tracking_code: o.tracking_code,
          delivered_at: o.delivered_at || o.updated_at,
          created_at: o.created_at,
          is_test: Boolean(o.is_test),
          cod_amount: codAmt,
          expected_courier_charge: expectedChg,
          expected_cod_fee: expectedFee,
        };
      });
  }, [orders, couriers]);

  const availableCourierNames = useMemo(() => {
    const set = new Set<string>();
    couriers.forEach((c) => set.add(c.name));
    receivableOrders.forEach((r) => set.add(r.courier_name));
    return Array.from(set).sort();
  }, [couriers, receivableOrders]);

  const filteredReceivables = useMemo(() => {
    if (!selectedCourierName) return receivableOrders;
    return receivableOrders.filter((r) => r.courier_name === selectedCourierName);
  }, [receivableOrders, selectedCourierName]);

  const settlementSummary = useMemo(() => {
    let totalCod = 0;
    let totalCharge = 0;
    let totalFee = 0;
    filteredReceivables.forEach((r) => {
      if (!selectedReceivableIds.has(r.order_id)) return;
      const chg =
        orderChargeOverrides[r.order_id] !== undefined
          ? Number(orderChargeOverrides[r.order_id] || 0)
          : r.expected_courier_charge;
      const fee =
        orderCodFeeOverrides[r.order_id] !== undefined
          ? Number(orderCodFeeOverrides[r.order_id] || 0)
          : r.expected_cod_fee;
      totalCod += r.cod_amount;
      totalCharge += chg;
      totalFee += fee;
    });
    const calculatedNet = Math.max(0, totalCod - totalCharge - totalFee);
    return { totalCod, totalCharge, totalFee, calculatedNet };
  }, [filteredReceivables, selectedReceivableIds, orderChargeOverrides, orderCodFeeOverrides]);

  // Supplier Payables computed from supplier_orders + orders
  const supplierDueRows = useMemo(() => {
    return supplierOrders
      .filter((so) => !so.is_void)
      .map((so) => {
        const ord = ordersMap[so.order_id];
        const remaining = Math.max(
          0,
          Number(so.supplier_amount || 0) -
            Number(so.paid_amount || 0) -
            Number(so.return_adjustment || 0),
        );
        return { so, ord, remaining };
      })
      .filter(({ so, ord, remaining }) => {
        if (remaining <= 0) return false;
        if (!ord) return false;
        if (ord.status === 'cancelled' || ord.status === 'rejected') return false;
        if (includeAdvanceOrders) return true;
        return ord.status === 'delivered' || ord.status === 'courier_paid';
      });
  }, [supplierOrders, ordersMap, includeAdvanceOrders]);

  const supplierDueSummary = useMemo(() => {
    const map: Record<
      string,
      { supplierId: string; name: string; count: number; totalDue: number }
    > = {};
    for (const row of supplierDueRows) {
      const sid = row.so.supplier_id || 'unassigned';
      if (!map[sid]) {
        map[sid] = {
          supplierId: sid,
          name:
            row.so.supplier_id && suppliersMap[row.so.supplier_id]
              ? suppliersMap[row.so.supplier_id].name
              : adminLang === 'bn' ? 'সাপ্লায়ার নেই' : 'Unassigned',
          count: 0,
          totalDue: 0,
        };
      }
      map[sid].count++;
      map[sid].totalDue += row.remaining;
    }
    return Object.values(map).sort((a, b) => b.totalDue - a.totalDue);
  }, [supplierDueRows, suppliersMap, adminLang]);

  const filteredSupplierDues = useMemo(() => {
    if (!selectedSupplierId) return supplierDueRows;
    return supplierDueRows.filter((r) => (r.so.supplier_id || 'unassigned') === selectedSupplierId);
  }, [supplierDueRows, selectedSupplierId]);

  const totalAllocatedPay = useMemo(() => {
    return filteredSupplierDues.reduce((sum, row) => {
      const val = Number(allocations[row.so.id] || 0);
      return sum + (Number.isFinite(val) && val > 0 ? val : 0);
    }, 0);
  }, [filteredSupplierDues, allocations]);

  // Fallback Cash Position if view wasn't returned
  const kpis = useMemo(() => {
    if (cashPos) {
      const netCash =
        Number(cashPos.total_courier_settled_in || 0) +
        Number(cashPos.total_prepaid_in || 0) -
        Number(cashPos.total_supplier_paid_out || 0) -
        Number(cashPos.total_expenses_out || 0);
      return {
        courierReceivable: Number(cashPos.total_courier_receivable || 0),
        supplierPayable: Number(cashPos.total_supplier_payable || 0),
        netCash,
        totalSettledIn: Number(cashPos.total_courier_settled_in || 0) + Number(cashPos.total_prepaid_in || 0),
      };
    }

    const courierRec = receivableOrders
      .filter((r) => !r.is_test)
      .reduce((s, r) => s + r.cod_amount - r.expected_courier_charge - r.expected_cod_fee, 0);
    const suppPay = supplierDueRows
      .filter((r) => !r.so.is_test)
      .reduce((s, r) => s + r.remaining, 0);
    const settledIn = courierSettlements
      .filter((cs) => !cs.is_void && !cs.is_test)
      .reduce((s, cs) => s + Number(cs.net_received || 0), 0);
    const paidOut = supplierPayments
      .filter((sp) => !sp.is_void && !sp.is_test)
      .reduce((s, sp) => s + Number(sp.amount || 0), 0);

    return {
      courierReceivable: Math.max(0, courierRec),
      supplierPayable: Math.max(0, suppPay),
      netCash: settledIn - paidOut,
      totalSettledIn: settledIn,
    };
  }, [cashPos, receivableOrders, supplierDueRows, courierSettlements, supplierPayments]);

  // Create Courier Settlement Voucher
  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (migrationMissing) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'আগে SQL Part 2–4 রান করুন' : 'Run SQL Parts 2–4 first',
      });
      return;
    }

    const selectedRows = filteredReceivables.filter((r) => selectedReceivableIds.has(r.order_id));
    if (selectedRows.length === 0) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অন্তত ১টি অর্ডার সিলেক্ট করুন' : 'Select at least 1 order',
      });
      return;
    }
    if (!isNotFutureDate(settlementDate)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ভবিষ্যতের তারিখ দেওয়া যাবে না' : 'Settlement date cannot be in future',
      });
      return;
    }

    const finalNet =
      settlementNetOverride.trim() !== ''
        ? Number(settlementNetOverride)
        : settlementSummary.calculatedNet;

    if (
      !isNonNegativeNumber(finalNet) ||
      !isNonNegativeNumber(settlementSummary.totalCharge) ||
      !isNonNegativeNumber(settlementSummary.totalFee)
    ) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'চার্জ ও প্রাপ্ত টাকা ঋণাত্মক হতে পারবে না' : 'Amounts cannot be negative',
      });
      return;
    }

    setSavingSettlement(true);
    try {
      const matchedCourier = couriers.find((c) => c.name === selectedCourierName) ||
        (selectedRows[0].courier_id ? couriersMap[selectedRows[0].courier_id] : null);

      const { data: voucher, error: csErr } = await supabase
        .from('courier_settlements')
        .insert({
          courier_id: matchedCourier?.id || null,
          settlement_date: settlementDate,
          total_cod_collected: settlementSummary.totalCod,
          total_courier_charges: settlementSummary.totalCharge,
          total_cod_fees: settlementSummary.totalFee,
          net_received: finalNet,
          reference_no: settlementRef.trim() || null,
          notes: settlementNotes.trim() || null,
          is_test: settlementIsTest || selectedRows.every((r) => r.is_test),
          created_by: user?.id || null,
        })
        .select('*')
        .single();
      if (csErr) throw csErr;

      const soRows = selectedRows.map((r) => {
        const chg =
          orderChargeOverrides[r.order_id] !== undefined
            ? Number(orderChargeOverrides[r.order_id] || 0)
            : r.expected_courier_charge;
        const fee =
          orderCodFeeOverrides[r.order_id] !== undefined
            ? Number(orderCodFeeOverrides[r.order_id] || 0)
            : r.expected_cod_fee;
        return {
          settlement_id: (voucher as CourierSettlement).id,
          order_id: r.order_id,
          cod_collected: r.cod_amount,
          courier_charge: chg,
          cod_fee: fee,
          net_amount: Math.max(0, r.cod_amount - chg - fee),
          is_test: settlementIsTest || r.is_test,
        };
      });
      const { error: linkErr } = await supabase.from('settlement_orders').insert(soRows);
      if (linkErr) throw linkErr;

      const nowIso = new Date().toISOString();
      for (const item of soRows) {
        await supabase
          .from('orders')
          .update({
            status: 'courier_paid',
            payment_status: 'paid',
            courier_settlement_status: 'received',
            courier_paid_at: nowIso,
            payment_received_at: nowIso,
            payment_received_amount: item.net_amount,
            payment_received_by: user?.id || null,
            delivery_charge_courier: item.courier_charge,
            courier_fee: item.courier_charge,
            cod_charge: item.cod_fee,
            updated_at: nowIso,
          })
          .eq('id', item.order_id);

        await supabase.from('order_status_history').insert({
          order_id: item.order_id,
          status: 'courier_paid',
          note: `Settled via ${(voucher as CourierSettlement).voucher_no} (Net: ৳${item.net_amount})`,
          changed_by: user?.id || null,
        });
      }

      showToast({
        type: 'success',
        title:
          adminLang === 'bn'
            ? `ভাউচার ${(voucher as CourierSettlement).voucher_no} তৈরি হয়েছে`
            : `Voucher ${(voucher as CourierSettlement).voucher_no} created`,
      });
      await logActivity('CREATE_COURIER_SETTLEMENT', 'courier_settlements', (voucher as CourierSettlement).id, {
        orders: soRows.length,
        net_received: finalNet,
      });

      setSelectedReceivableIds(new Set());
      setSettlementRef('');
      setSettlementNotes('');
      setSettlementNetOverride('');
      await fetchAll();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সেটেলমেন্ট ব্যর্থ' : 'Settlement failed',
        description: (err as Error)?.message,
      });
    } finally {
      setSavingSettlement(false);
    }
  };

  // Create Supplier Payment Voucher (supports partial payment!)
  const handleCreateSupplierPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (migrationMissing) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'আগে SQL Part 2–4 রান করুন' : 'Run SQL Parts 2–4 first',
      });
      return;
    }

    if (!selectedSupplierId || selectedSupplierId === 'unassigned') {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'একজন সাপ্লায়ার নির্বাচন করুন' : 'Select a supplier',
      });
      return;
    }

    if (!isNotFutureDate(payDate)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ভবিষ্যতের তারিখ দেওয়া যাবে না' : 'Future date not allowed',
      });
      return;
    }

    const allocatedRows = filteredSupplierDues
      .map((row) => ({
        ...row,
        alloc: Number(allocations[row.so.id] || 0),
      }))
      .filter((r) => isPositiveNumber(r.alloc));

    if (allocatedRows.length === 0) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অন্তত ১টি অর্ডারে পেমেন্ট পরিমাণ লিখুন' : 'Enter payment amount for at least 1 order',
      });
      return;
    }

    for (const r of allocatedRows) {
      if (r.alloc > r.remaining + 0.01) {
        showToast({
          type: 'error',
          title:
            adminLang === 'bn'
              ? `#${r.ord?.order_number} অর্ডারে বকেয়ার চেয়ে বেশি দেওয়া যাবে না`
              : `Allocation exceeds due for #${r.ord?.order_number}`,
        });
        return;
      }
    }

    setSavingPayment(true);
    try {
      const totalAmt = allocatedRows.reduce((s, r) => s + r.alloc, 0);
      const { data: voucher, error: spErr } = await supabase
        .from('supplier_payments')
        .insert({
          supplier_id: selectedSupplierId,
          amount: totalAmt,
          payment_method: payMethod,
          reference_no: payRef.trim() || null,
          paid_at: payDate,
          notes: payNotes.trim() || null,
          is_test: payIsTest || allocatedRows.every((r) => r.so.is_test),
          created_by: user?.id || null,
        })
        .select('*')
        .single();
      if (spErr) throw spErr;

      const linkRows = allocatedRows.map((r) => ({
        payment_id: (voucher as SupplierPayment).id,
        supplier_order_id: r.so.id,
        order_id: r.so.order_id,
        amount_allocated: r.alloc,
        is_test: payIsTest || r.so.is_test,
      }));
      const { error: linkErr } = await supabase.from('supplier_payment_orders').insert(linkRows);
      if (linkErr) throw linkErr;

      const nowIso = new Date().toISOString();
      for (const r of allocatedRows) {
        const newPaid = Number(r.so.paid_amount || 0) + r.alloc;
        await supabase
          .from('supplier_orders')
          .update({
            paid_amount: newPaid,
            updated_at: nowIso,
          })
          .eq('id', r.so.id);

        // If full due cleared across supplier_orders for this order, mark order supplier_paid
        const fullyCleared =
          newPaid + Number(r.so.return_adjustment || 0) >= Number(r.so.supplier_amount || 0) - 0.01;
        if (fullyCleared && r.ord && r.ord.status !== 'supplier_paid') {
          await supabase
            .from('orders')
            .update({
              status: 'supplier_paid',
              supplier_paid_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', r.so.order_id);

          await supabase.from('order_status_history').insert({
            order_id: r.so.order_id,
            status: 'supplier_paid',
            note: `Supplier paid via ${(voucher as SupplierPayment).voucher_no} (৳${r.alloc})`,
            changed_by: user?.id || null,
          });
        }
      }

      showToast({
        type: 'success',
        title:
          adminLang === 'bn'
            ? `সাপ্লায়ার ভাউচার ${(voucher as SupplierPayment).voucher_no} সংরক্ষিত`
            : `Supplier voucher ${(voucher as SupplierPayment).voucher_no} saved`,
      });
      await logActivity('CREATE_SUPPLIER_PAYMENT', 'supplier_payments', (voucher as SupplierPayment).id, {
        amount: totalAmt,
        orders: allocatedRows.length,
      });

      setAllocations({});
      setPayRef('');
      setPayNotes('');
      await fetchAll();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'পেমেন্ট ব্যর্থ' : 'Supplier payment failed',
        description: (err as Error)?.message,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  // Void Voucher (Immutable Ledger Reversal)
  const handleConfirmVoid = async () => {
    if (!supabase || !voidModal) return;
    if (!voidReason.trim()) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'বাতিলের কারণ লিখুন' : 'Void reason required',
      });
      return;
    }

    setVoiding(true);
    try {
      const nowIso = new Date().toISOString();
      if (voidModal.type === 'settlement') {
        const { data: links } = await supabase
          .from('settlement_orders')
          .select('order_id')
          .eq('settlement_id', voidModal.id);

        const { error } = await supabase
          .from('courier_settlements')
          .update({
            is_void: true,
            void_reason: voidReason.trim(),
            voided_at: nowIso,
            voided_by: user?.id || null,
          })
          .eq('id', voidModal.id);
        if (error) throw error;

        if (links) {
          for (const l of links as Array<{ order_id: string }>) {
            const ord = ordersMap[l.order_id];
            const nextStatus = ord?.status === 'courier_paid' ? 'delivered' : ord?.status || 'delivered';
            await supabase
              .from('orders')
              .update({
                status: nextStatus,
                payment_status: 'unpaid',
                courier_settlement_status: 'pending',
                courier_paid_at: null,
                updated_at: nowIso,
              })
              .eq('id', l.order_id);
            await supabase.from('order_status_history').insert({
              order_id: l.order_id,
              status: nextStatus,
              note: `Settlement ${voidModal.label} voided: ${voidReason.trim()}`,
              changed_by: user?.id || null,
            });
          }
        }
      } else {
        const { data: links } = await supabase
          .from('supplier_payment_orders')
          .select('*')
          .eq('payment_id', voidModal.id);

        const { error } = await supabase
          .from('supplier_payments')
          .update({
            is_void: true,
            void_reason: voidReason.trim(),
            voided_at: nowIso,
            voided_by: user?.id || null,
          })
          .eq('id', voidModal.id);
        if (error) throw error;

        if (links) {
          for (const l of links as Array<{
            supplier_order_id: string | null;
            order_id: string;
            amount_allocated: number;
          }>) {
            if (l.supplier_order_id) {
              const so = supplierOrders.find((s) => s.id === l.supplier_order_id);
              if (so) {
                const reverted = Math.max(
                  0,
                  Number(so.paid_amount || 0) - Number(l.amount_allocated || 0),
                );
                await supabase
                  .from('supplier_orders')
                  .update({ paid_amount: reverted, updated_at: nowIso })
                  .eq('id', so.id);
              }
            }
            const ord = ordersMap[l.order_id];
            if (ord && ord.status === 'supplier_paid') {
              await supabase
                .from('orders')
                .update({
                  status: ord.courier_paid_at ? 'courier_paid' : 'delivered',
                  supplier_paid_at: null,
                  updated_at: nowIso,
                })
                .eq('id', l.order_id);
              await supabase.from('order_status_history').insert({
                order_id: l.order_id,
                status: ord.courier_paid_at ? 'courier_paid' : 'delivered',
                note: `Supplier payment ${voidModal.label} voided: ${voidReason.trim()}`,
                changed_by: user?.id || null,
              });
            }
          }
        }
      }

      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'ভাউচার Void ও হিসাব সমন্বয় হয়েছে' : 'Voucher voided cleanly',
      });
      setVoidModal(null);
      setVoidReason('');
      await fetchAll();
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'Void ব্যর্থ' : 'Void failed',
        description: (err as Error)?.message,
      });
    } finally {
      setVoiding(false);
    }
  };

  const ledgerFilteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  const handleExportCsv = () => {
    const rows = ledgerFilteredOrders.map((o) => ({
      'Order Number': o.order_number,
      Date: o.created_at.slice(0, 10),
      Customer: o.customer_name,
      Phone: o.phone,
      Total: o.total,
      Method: o.payment_method,
      'Payment Status': o.payment_status,
      'Order Status': o.status,
      Courier: o.courier_name || '',
      'Courier Charge': o.delivery_charge_courier ?? o.courier_fee ?? 0,
      'COD Fee': o.cod_charge ?? 0,
    }));
    exportToCsv(`martbari-payments-${getTodayIsoDate()}.csv`, rows);
  };

  if (!canAccess('reports')) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {adminLang === 'bn'
          ? 'কুরিয়ার সেটেলমেন্ট ও সাপ্লায়ার পেমেন্ট হিসাব শুধুমাত্র Admin এবং Manager দেখতে পারবেন।'
          : 'Financial settlements and supplier payments are restricted to Admin and Manager accounts.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
            {at('payments.title')}
          </h1>
          <p className="text-sm text-[#5B6577]">{at('payments.subtitle')}</p>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-4 w-4" />
          {at('common.exportCsv')}
        </Button>
      </div>

      {migrationMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>
            {adminLang === 'bn'
              ? 'Supabase-এ সেটেলমেন্ট ও পেমেন্ট ভাউচার টেবিল এখনো তৈরি হয়নি।'
              : 'Financial ledger tables not created yet.'}
          </strong>{' '}
          {adminLang === 'bn'
            ? 'ভাউচার ও ব্যালেন্স সচল করতে SQL Editor-এ Part 1–4 SQL স্ক্রিপ্ট রান করুন।'
            : 'Run SQL Parts 1–4 in your Supabase SQL Editor.'}
        </div>
      )}

      {/* Cash Position KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6577]">
            <span>{at('payments.courierReceivable')}</span>
            <Truck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700 tabular-nums">
            {formatAdminPrice(kpis.courierReceivable)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6577]">
            <span>{at('payments.supplierPayable')}</span>
            <CreditCard className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-700 tabular-nums">
            {formatAdminPrice(kpis.supplierPayable)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6577]">
            <span>{at('payments.netCashBalance')}</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
            {formatAdminPrice(kpis.netCash)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5B6577]">
            <span>{adminLang === 'bn' ? 'মোট প্রাপ্ত ক্যাশ' : 'Total Settled & Prepaid'}</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F1A2C] tabular-nums">
            {formatAdminPrice(kpis.totalSettledIn)}
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#E1E4EA] bg-white p-3 shadow-xs">
        {(
          [
            { id: 'courier', label: at('payments.tabCourier'), badge: receivableOrders.length },
            { id: 'supplier', label: at('payments.tabSupplier'), badge: supplierDueRows.length },
            { id: 'ledger', label: at('payments.tabLedger'), badge: orders.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#17263E] text-white'
                : 'bg-gray-100 text-[#5B6577] hover:bg-gray-200'
            }`}
          >
            {tab.label} ({tab.badge})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-[#E1E4EA] bg-white">
          <Spinner size="lg" className="text-[#F47125]" />
        </div>
      ) : activeTab === 'courier' ? (
        <div className="space-y-6">
          {/* Courier Settlement Voucher Builder */}
          <form
            onSubmit={handleCreateSettlement}
            className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F3F5] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'নতুন কুরিয়ার সেটেলমেন্ট ভাউচার' : 'Create Courier Settlement Voucher'}
                </h2>
                <p className="text-xs text-[#5B6577]">
                  {adminLang === 'bn'
                    ? 'ডেলিভারি সম্পন্ন COD অর্ডার সিলেক্ট করে কুরিয়ার চার্জ ও COD ফি বাদ দিয়ে প্রাপ্ত নিট টাকা হিসাব করুন।'
                    : 'Tick delivered COD orders to reconcile courier charges, COD fees, and net cash payout.'}
                </p>
              </div>

              <select
                value={selectedCourierName}
                onChange={(e) => {
                  setSelectedCourierName(e.target.value);
                  setSelectedReceivableIds(new Set());
                }}
                className="h-10 rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs font-semibold text-[#0F1A2C]"
              >
                <option value="">{adminLang === 'bn' ? 'সকল কুরিয়ার' : 'All Couriers'}</option>
                {availableCourierNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {filteredReceivables.length === 0 ? (
              <div className="rounded-xl bg-[#F8FAFC] py-8 text-center text-xs text-[#5B6577]">
                {adminLang === 'bn'
                  ? 'সেটেলমেন্টের অপেক্ষায় থাকা কোনো ডেলিভার্ড COD অর্ডার নেই।'
                  : 'No unsettled delivered COD orders found.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E1E4EA]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredReceivables.length > 0 &&
                            filteredReceivables.every((r) => selectedReceivableIds.has(r.order_id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReceivableIds(
                                new Set(filteredReceivables.map((r) => r.order_id)),
                              );
                            } else {
                              setSelectedReceivableIds(new Set());
                            }
                          }}
                          className="rounded border-[#E1E4EA]"
                        />
                      </th>
                      <th className="p-3 font-semibold">{at('orders.col.order')}</th>
                      <th className="p-3 font-semibold">Courier & Tracking</th>
                      <th className="p-3 text-right font-semibold">COD (৳)</th>
                      <th className="p-3 text-right font-semibold">
                        {adminLang === 'bn' ? 'কুরিয়ার চার্জ (৳)' : 'Courier Charge'}
                      </th>
                      <th className="p-3 text-right font-semibold">COD Fee (৳)</th>
                      <th className="p-3 text-right font-semibold">
                        {adminLang === 'bn' ? 'নিট প্রাপ্য' : 'Net Receivable'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {filteredReceivables.map((r) => {
                      const chg =
                        orderChargeOverrides[r.order_id] ?? String(r.expected_courier_charge);
                      const fee = orderCodFeeOverrides[r.order_id] ?? String(r.expected_cod_fee);
                      const rowNet = Math.max(0, r.cod_amount - Number(chg || 0) - Number(fee || 0));
                      return (
                        <tr
                          key={r.order_id}
                          className={
                            selectedReceivableIds.has(r.order_id)
                              ? 'bg-orange-50/40'
                              : 'hover:bg-[#F8FAFC]'
                          }
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedReceivableIds.has(r.order_id)}
                              onChange={(e) => {
                                setSelectedReceivableIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(r.order_id);
                                  else next.delete(r.order_id);
                                  return next;
                                });
                              }}
                              className="rounded border-[#E1E4EA]"
                            />
                          </td>
                          <td className="p-3">
                            <Link
                              to={`/admin/orders/${r.order_id}`}
                              className="font-mono font-bold text-[#0F1A2C] hover:text-[#F47125]"
                            >
                              {r.order_number}
                            </Link>
                            <div className="text-[11px] text-[#5B6577]">
                              {r.customer_name} • {r.district}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[#0F1A2C]">{r.courier_name}</div>
                            <div className="font-mono text-[10px] text-[#5B6577]">
                              {r.tracking_code || '—'}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums">
                            {formatAdminPrice(r.cod_amount)}
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={chg}
                              onChange={(e) =>
                                setOrderChargeOverrides((p) => ({
                                  ...p,
                                  [r.order_id]: e.target.value,
                                }))
                              }
                              className="w-20 rounded-lg border border-[#E1E4EA] px-2 py-1 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={fee}
                              onChange={(e) =>
                                setOrderCodFeeOverrides((p) => ({
                                  ...p,
                                  [r.order_id]: e.target.value,
                                }))
                              }
                              className="w-20 rounded-lg border border-[#E1E4EA] px-2 py-1 text-right font-mono text-xs"
                            />
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 tabular-nums">
                            {formatAdminPrice(rowNet)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Settlement Totals & Submit */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E4EA]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'সেটেলমেন্ট তারিখ *' : 'Settlement Date *'}
                </label>
                <Input
                  type="date"
                  max={getTodayIsoDate()}
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'রেফারেন্স / ব্যাংক Trx' : 'Reference / Bank Ref'}
                </label>
                <Input
                  type="text"
                  value={settlementRef}
                  onChange={(e) => setSettlementRef(e.target.value)}
                  placeholder="e.g. STF-PAY-8821"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'নিট প্রাপ্ত টাকা (৳)' : 'Net Received (৳)'}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={
                    settlementNetOverride !== ''
                      ? settlementNetOverride
                      : String(settlementSummary.calculatedNet)
                  }
                  onChange={(e) => setSettlementNetOverride(e.target.value)}
                  className="h-9 text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'নোট' : 'Notes'}
                </label>
                <Input
                  type="text"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder={adminLang === 'bn' ? 'ঐচ্ছিক...' : 'Optional...'}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settlementIsTest}
                    onChange={(e) => setSettlementIsTest(e.target.checked)}
                    className="rounded"
                  />
                  is_test
                </label>
                <Button
                  type="submit"
                  disabled={savingSettlement || selectedReceivableIds.size === 0}
                  className="h-9 bg-[#F47125] text-white hover:bg-[#e05e13] text-xs font-bold"
                >
                  {savingSettlement
                    ? at('common.saving')
                    : adminLang === 'bn'
                      ? `ভাউচার তৈরি করুন (${selectedReceivableIds.size})`
                      : `Settle (${selectedReceivableIds.size})`}
                </Button>
              </div>
            </div>
          </form>

          {/* Settlement Vouchers History */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#E1E4EA] bg-[#F8FAFC] px-5 py-3">
              <h3 className="text-sm font-bold text-[#0F1A2C]">
                {adminLang === 'bn' ? 'কুরিয়ার সেটেলমেন্ট ভাউচার ইতিহাস' : 'Settlement Voucher History'}
              </h3>
            </div>
            {courierSettlements.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#5B6577]">{at('common.noRecords')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                    <tr>
                      <th className="p-3 font-semibold">Voucher</th>
                      <th className="p-3 font-semibold">Date & Courier</th>
                      <th className="p-3 text-right font-semibold">COD</th>
                      <th className="p-3 text-right font-semibold">Charges + Fee</th>
                      <th className="p-3 text-right font-semibold">Net Received</th>
                      <th className="p-3 font-semibold">Ref</th>
                      <th className="p-3 text-right font-semibold">{at('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {courierSettlements.map((cs) => (
                      <tr key={cs.id} className={cs.is_void ? 'bg-gray-50 opacity-60' : 'hover:bg-[#F8FAFC]'}>
                        <td className="p-3 font-mono font-bold text-[#0F1A2C]">
                          {cs.voucher_no}
                          {cs.is_void && (
                            <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-700">
                              VOID
                            </span>
                          )}
                          {cs.is_test && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-800">
                              TEST
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{formatAdminDate(cs.settlement_date)}</div>
                          <div className="text-[11px] text-[#5B6577]">
                            {cs.courier_id ? couriersMap[cs.courier_id]?.name || '—' : '—'}
                          </div>
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {formatAdminPrice(cs.total_cod_collected)}
                        </td>
                        <td className="p-3 text-right text-rose-700 tabular-nums">
                          -{formatAdminPrice(Number(cs.total_courier_charges) + Number(cs.total_cod_fees))}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700 tabular-nums">
                          {formatAdminPrice(cs.net_received)}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#5B6577]">
                          {cs.reference_no || '—'}
                        </td>
                        <td className="p-3 text-right">
                          {!cs.is_void && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidModal({
                                  type: 'settlement',
                                  id: cs.id,
                                  label: cs.voucher_no,
                                });
                                setVoidReason('');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <Ban className="h-3 w-3" /> Void
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
        </div>
      ) : activeTab === 'supplier' ? (
        <div className="space-y-6">
          {/* Supplier Due Summary Cards */}
          {supplierDueSummary.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {supplierDueSummary.map((s) => (
                <button
                  key={s.supplierId}
                  type="button"
                  onClick={() => {
                    setSelectedSupplierId(s.supplierId);
                    setAllocations({});
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    selectedSupplierId === s.supplierId
                      ? 'border-[#F47125] bg-orange-50/50 shadow-sm'
                      : 'border-[#E1E4EA] bg-white hover:border-[#F47125]/50'
                  }`}
                >
                  <p className="text-xs font-bold text-[#0F1A2C] truncate">{s.name}</p>
                  <p className="mt-1 text-lg font-black text-rose-700 tabular-nums">
                    {formatAdminPrice(s.totalDue)}
                  </p>
                  <p className="text-[11px] text-[#5B6577]">
                    {s.count} {adminLang === 'bn' ? 'টি বকেয়া অর্ডার' : 'due order(s)'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Supplier Payment Voucher Form */}
          <form
            onSubmit={handleCreateSupplierPayment}
            className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#F1F3F5] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F1A2C]">
                  {adminLang === 'bn'
                    ? 'সাপ্লায়ার পেমেন্ট ভাউচার (আংশিক বা সম্পূর্ণ পরিশোধ)'
                    : 'Record Supplier Payment (Supports Partial Allocations)'}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6577] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAdvanceOrders}
                    onChange={(e) => setIncludeAdvanceOrders(e.target.checked)}
                    className="rounded text-[#F47125]"
                  />
                  {adminLang === 'bn' ? 'অগ্রিম (Placed/Shipped) অর্ডারও দেখাও' : 'Include Placed/Shipped'}
                </label>

                <select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setAllocations({});
                  }}
                  className="h-10 rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs font-semibold text-[#0F1A2C]"
                >
                  <option value="">
                    {adminLang === 'bn' ? 'সাপ্লায়ার নির্বাচন করুন...' : 'Select Supplier...'}
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredSupplierDues.length === 0 ? (
              <div className="rounded-xl bg-[#F8FAFC] py-8 text-center text-xs text-[#5B6577]">
                {adminLang === 'bn'
                  ? 'পরিশোধযোগ্য কোনো সাপ্লায়ার বকেয়া নেই।'
                  : 'No payable supplier orders found.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E1E4EA]">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                    <tr>
                      <th className="p-3 font-semibold">{at('orders.col.order')}</th>
                      <th className="p-3 font-semibold">{at('products.col.supplier')}</th>
                      <th className="p-3 text-right font-semibold">
                        {adminLang === 'bn' ? 'সাপ্লায়ার বিল' : 'Billed'}
                      </th>
                      <th className="p-3 text-right font-semibold">
                        {adminLang === 'bn' ? 'আগে পরিশোধিত' : 'Already Paid'}
                      </th>
                      <th className="p-3 text-right font-semibold">
                        {adminLang === 'bn' ? 'বকেয়া (Due)' : 'Remaining Due'}
                      </th>
                      <th className="p-3 text-right font-semibold">
                        {adminLang === 'bn' ? 'এই পেমেন্টে দিন (৳)' : 'Allocate Pay (৳)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {filteredSupplierDues.map(({ so, ord, remaining }) => (
                      <tr key={so.id} className="hover:bg-[#F8FAFC]">
                        <td className="p-3">
                          <Link
                            to={`/admin/orders/${so.order_id}`}
                            className="font-mono font-bold text-[#0F1A2C] hover:text-[#F47125]"
                          >
                            {ord?.order_number || so.order_id.slice(0, 8)}
                          </Link>
                          <div className="mt-0.5">
                            {ord && <StatusBadge type="order" status={ord.status} />}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-[#0F1A2C]">
                          {so.supplier_id ? suppliersMap[so.supplier_id]?.name || '—' : '—'}
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          {formatAdminPrice(so.supplier_amount)}
                        </td>
                        <td className="p-3 text-right text-emerald-700 tabular-nums">
                          {formatAdminPrice(so.paid_amount)}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-700 tabular-nums">
                          {formatAdminPrice(remaining)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              step="0.01"
                              placeholder="0"
                              value={allocations[so.id] ?? ''}
                              onChange={(e) => {
                                if (!selectedSupplierId && so.supplier_id) {
                                  setSelectedSupplierId(so.supplier_id);
                                }
                                setAllocations((p) => ({ ...p, [so.id]: e.target.value }));
                              }}
                              className="w-24 rounded-lg border border-[#E1E4EA] px-2 py-1 text-right font-mono text-xs font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedSupplierId && so.supplier_id) {
                                  setSelectedSupplierId(so.supplier_id);
                                }
                                setAllocations((p) => ({ ...p, [so.id]: String(remaining) }));
                              }}
                              className="rounded bg-gray-100 px-1.5 py-1 text-[10px] font-bold text-[#0F1A2C] hover:bg-gray-200 cursor-pointer"
                            >
                              Full
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end bg-[#F8FAFC] p-4 rounded-xl border border-[#E1E4EA]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'পেমেন্ট মাধ্যম *' : 'Payment Method *'}
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as SupplierPaymentMethod)}
                  className="h-9 w-full rounded-xl border border-[#E1E4EA] bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="rocket">Rocket</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'তারিখ *' : 'Paid Date *'}
                </label>
                <Input
                  type="date"
                  max={getTodayIsoDate()}
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'রেফারেন্স / TrxID' : 'TrxID / Reference'}
                </label>
                <Input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. BKS-9921"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F1A2C]">
                  {adminLang === 'bn' ? 'নোট' : 'Notes'}
                </label>
                <Input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder={adminLang === 'bn' ? 'ঐচ্ছিক...' : 'Optional...'}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#0F1A2C]">
                    {formatAdminPrice(totalAllocatedPay)}
                  </span>
                  <label className="flex items-center gap-1 font-semibold text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payIsTest}
                      onChange={(e) => setPayIsTest(e.target.checked)}
                      className="rounded"
                    />
                    is_test
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={savingPayment || totalAllocatedPay <= 0}
                  className="h-9 bg-[#17263E] text-white hover:bg-[#F47125] text-xs font-bold"
                >
                  {savingPayment
                    ? at('common.saving')
                    : adminLang === 'bn'
                      ? 'সাপ্লায়ার পেমেন্ট সেভ করুন'
                      : 'Record Supplier Payment'}
                </Button>
              </div>
            </div>
          </form>

          {/* Supplier Payment Voucher History */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#E1E4EA] bg-[#F8FAFC] px-5 py-3">
              <h3 className="text-sm font-bold text-[#0F1A2C]">
                {adminLang === 'bn' ? 'সাপ্লায়ার পেমেন্ট ভাউচার ইতিহাস' : 'Supplier Payment Voucher History'}
              </h3>
            </div>
            {supplierPayments.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#5B6577]">{at('common.noRecords')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#E1E4EA] text-[#5B6577]">
                    <tr>
                      <th className="p-3 font-semibold">Voucher</th>
                      <th className="p-3 font-semibold">Date & Supplier</th>
                      <th className="p-3 font-semibold">Method & Ref</th>
                      <th className="p-3 text-right font-semibold">Amount (৳)</th>
                      <th className="p-3 text-right font-semibold">{at('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {supplierPayments.map((sp) => (
                      <tr key={sp.id} className={sp.is_void ? 'bg-gray-50 opacity-60' : 'hover:bg-[#F8FAFC]'}>
                        <td className="p-3 font-mono font-bold text-[#0F1A2C]">
                          {sp.voucher_no}
                          {sp.is_void && (
                            <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-700">
                              VOID
                            </span>
                          )}
                          {sp.is_test && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-800">
                              TEST
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div>{formatAdminDate(sp.paid_at)}</div>
                          <div className="font-semibold text-[#0F1A2C]">
                            {suppliersMap[sp.supplier_id]?.name || '—'}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="uppercase font-bold text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                            {sp.payment_method}
                          </span>
                          <div className="font-mono text-[10px] text-[#5B6577] mt-0.5">
                            {sp.reference_no || '—'}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-rose-700 tabular-nums">
                          {formatAdminPrice(sp.amount)}
                        </td>
                        <td className="p-3 text-right">
                          {!sp.is_void && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidModal({
                                  type: 'supplier_payment',
                                  id: sp.id,
                                  label: sp.voucher_no,
                                });
                                setVoidReason('');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <Ban className="h-3 w-3" /> Void
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
        </div>
      ) : (
        /* Tab 3: Order Payment Overview */
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F1A2C]">
              <FileSpreadsheet className="h-4 w-4 text-[#F47125]" />
              {at('payments.tabLedger')} ({ledgerFilteredOrders.length})
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={at('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E1E4EA] bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                  <tr>
                    <th className="p-3 font-semibold">{at('orders.col.order')}</th>
                    <th className="p-3 font-semibold">{at('orders.col.customer')}</th>
                    <th className="p-3 text-right font-semibold">{at('orders.col.total')}</th>
                    <th className="p-3 font-semibold">{at('orders.col.payment')}</th>
                    <th className="p-3 font-semibold">{at('orders.col.fulfillment')}</th>
                    <th className="p-3 font-semibold">Courier Charges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {ledgerFilteredOrders.slice(0, 100).map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 font-mono">
                        <Link
                          to={`/admin/orders/${ord.id}`}
                          className="font-bold text-[#0F1A2C] hover:text-[#F47125]"
                        >
                          {ord.order_number}
                        </Link>
                        <div className="text-[10px] text-[#5B6577]">
                          {formatAdminDate(ord.created_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-[#0F1A2C]">{ord.customer_name}</div>
                        <div className="font-mono text-[10px] text-[#5B6577]">{ord.phone}</div>
                      </td>
                      <td className="p-3 text-right font-bold tabular-nums">
                        {formatAdminPrice(ord.total)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="uppercase text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                            {ord.payment_method}
                          </span>
                          <StatusBadge type="payment" status={ord.payment_status} />
                        </div>
                      </td>
                      <td className="p-3">
                        <StatusBadge type="order" status={ord.status} />
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[#5B6577]">
                        Chg: ৳{ord.delivery_charge_courier ?? ord.courier_fee ?? 0} | COD: ৳
                        {ord.cod_charge ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Void Voucher Modal */}
      {voidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-rose-700">
                {adminLang === 'bn'
                  ? `ভাউচার ${voidModal.label} Void করবেন?`
                  : `Void Voucher ${voidModal.label}?`}
              </h3>
              <button
                type="button"
                onClick={() => setVoidModal(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#5B6577]">
              {adminLang === 'bn'
                ? 'অডিট সুরক্ষার জন্য ভাউচার ডিলিট না করে Void করা হবে এবং সংশ্লিষ্ট অর্ডারের পাওনা/দেনা আগের অবস্থায় ফিরবে।'
                : 'Voucher will be marked void (not deleted) and affected orders/balances will be reversed.'}
            </p>
            <textarea
              rows={2}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={adminLang === 'bn' ? 'বাতিলের কারণ লিখুন...' : 'Void reason...'}
              className="w-full rounded-xl border border-[#E1E4EA] p-2.5 text-xs"
            />
            <div className="flex justify-end gap-2 border-t border-[#E1E4EA] pt-3">
              <Button variant="outline" size="sm" onClick={() => setVoidModal(null)}>
                {at('common.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={voiding}
                onClick={() => void handleConfirmVoid()}
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

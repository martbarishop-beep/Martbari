-- ============================================================================
-- MartBari Dropshipping & Accounting — PART 3: Audit Immutability & Strict RLS
-- Non-Destructive & Idempotent (Safe to re-run multiple times in Supabase SQL Editor)
-- ============================================================================

-- 1. Immutability Guard: Block hard deletes on real accounting records.
-- Only records marked is_test = true (or inside explicit admin test purge) can be hard-deleted.
-- Real financial entries must be cancelled using soft-void (is_void = true, void_reason).
CREATE OR REPLACE FUNCTION public.prevent_financial_record_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row_json jsonb;
  v_is_test boolean := false;
BEGIN
  IF current_setting('app.purge_test_data', true) = 'on' THEN
    RETURN OLD;
  END IF;

  v_row_json := to_jsonb(OLD);
  v_is_test := COALESCE((v_row_json ->> 'is_test')::boolean, false);

  IF v_is_test THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Financial ledger records cannot be deleted (%). Mark is_void = true with a void_reason instead.', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_delete_supplier_orders ON public.supplier_orders;
CREATE TRIGGER trg_no_delete_supplier_orders
  BEFORE DELETE ON public.supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_delete();

DROP TRIGGER IF EXISTS trg_no_delete_courier_settlements ON public.courier_settlements;
CREATE TRIGGER trg_no_delete_courier_settlements
  BEFORE DELETE ON public.courier_settlements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_delete();

DROP TRIGGER IF EXISTS trg_no_delete_settlement_orders ON public.settlement_orders;
CREATE TRIGGER trg_no_delete_settlement_orders
  BEFORE DELETE ON public.settlement_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_delete();

DROP TRIGGER IF EXISTS trg_no_delete_supplier_payments ON public.supplier_payments;
CREATE TRIGGER trg_no_delete_supplier_payments
  BEFORE DELETE ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_delete();

DROP TRIGGER IF EXISTS trg_no_delete_supplier_payment_orders ON public.supplier_payment_orders;
CREATE TRIGGER trg_no_delete_supplier_payment_orders
  BEFORE DELETE ON public.supplier_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_delete();

DROP TRIGGER IF EXISTS trg_no_delete_expenses ON public.expenses;
CREATE TRIGGER trg_no_delete_expenses
  BEFORE DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_record_delete();

-- 2. Enable RLS on all new tables
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Couriers: Staff can read; Admin/Manager can manage
DROP POLICY IF EXISTS "couriers_staff_select" ON public.couriers;
CREATE POLICY "couriers_staff_select"
  ON public.couriers FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "couriers_admin_all" ON public.couriers;
CREATE POLICY "couriers_admin_all"
  ON public.couriers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Supplier Orders: Staff can read/insert/update operational placement; Admin/Manager full
DROP POLICY IF EXISTS "supplier_orders_staff_select" ON public.supplier_orders;
CREATE POLICY "supplier_orders_staff_select"
  ON public.supplier_orders FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "supplier_orders_staff_insert" ON public.supplier_orders;
CREATE POLICY "supplier_orders_staff_insert"
  ON public.supplier_orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "supplier_orders_staff_update" ON public.supplier_orders;
CREATE POLICY "supplier_orders_staff_update"
  ON public.supplier_orders FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "supplier_orders_admin_delete" ON public.supplier_orders;
CREATE POLICY "supplier_orders_admin_delete"
  ON public.supplier_orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Courier Settlements, Settlement Orders, Supplier Payments, Payment Allocations, Expenses: Admin/Manager only
DROP POLICY IF EXISTS "courier_settlements_admin_all" ON public.courier_settlements;
CREATE POLICY "courier_settlements_admin_all"
  ON public.courier_settlements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settlement_orders_admin_all" ON public.settlement_orders;
CREATE POLICY "settlement_orders_admin_all"
  ON public.settlement_orders FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "supplier_payments_admin_all" ON public.supplier_payments;
CREATE POLICY "supplier_payments_admin_all"
  ON public.supplier_payments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "supplier_payment_orders_admin_all" ON public.supplier_payment_orders;
CREATE POLICY "supplier_payment_orders_admin_all"
  ON public.supplier_payment_orders FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "expenses_admin_all" ON public.expenses;
CREATE POLICY "expenses_admin_all"
  ON public.expenses FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tighten legacy public.payments RLS policy if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage payments" ON public.payments';
    EXECUTE 'DROP POLICY IF EXISTS "payments_admin_all" ON public.payments';
    EXECUTE 'CREATE POLICY "payments_admin_all" ON public.payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'REVOKE ALL ON public.payments FROM anon, public';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated';
  END IF;
END $$;

-- 3. Explicit Grants (ZERO access for anon/public)
REVOKE ALL ON
  public.couriers,
  public.supplier_orders,
  public.courier_settlements,
  public.settlement_orders,
  public.supplier_payments,
  public.supplier_payment_orders,
  public.expenses
FROM anon, public;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.couriers,
  public.supplier_orders,
  public.courier_settlements,
  public.settlement_orders,
  public.supplier_payments,
  public.supplier_payment_orders,
  public.expenses
TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE
  public.courier_settlement_voucher_seq,
  public.supplier_payment_voucher_seq
TO authenticated;

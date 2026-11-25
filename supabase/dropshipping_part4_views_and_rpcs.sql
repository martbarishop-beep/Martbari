-- ============================================================================
-- MartBari Dropshipping & Accounting — PART 4: Financial Views & Test Purge RPC
-- Security Invoker Views + Zero Anon Access (Safe to re-run in Supabase SQL Editor)
-- ============================================================================

-- 1. View: Per-Order Financial & Profit Breakdown
-- Formula: (selling_price * qty - discount) + customer_delivery_charge - supplier_cost - actual_courier_charge - cod_fee
-- Cancelled/Rejected orders have 0 revenue and 0 profit; Returned orders reflect return courier/supplier loss.
CREATE OR REPLACE VIEW public.v_order_financials
WITH (security_invoker = true) AS
WITH item_totals AS (
  SELECT
    oi.order_id,
    COALESCE(SUM(COALESCE(oi.selling_price, oi.unit_price, 0) * oi.quantity), 0)::numeric(12, 2) AS items_revenue,
    COALESCE(SUM(COALESCE(oi.cost_price, 0) * oi.quantity), 0)::numeric(12, 2) AS items_cost
  FROM public.order_items oi
  GROUP BY oi.order_id
),
active_supplier_orders AS (
  SELECT
    so.order_id,
    COALESCE(SUM(so.supplier_amount), 0)::numeric(12, 2) AS supplier_amount,
    COALESCE(SUM(so.paid_amount), 0)::numeric(12, 2) AS supplier_paid_amount,
    COALESCE(SUM(so.return_adjustment), 0)::numeric(12, 2) AS supplier_return_adjustment
  FROM public.supplier_orders so
  WHERE so.is_void = false AND so.status <> 'cancelled'
  GROUP BY so.order_id
)
SELECT
  o.id AS order_id,
  o.order_number,
  o.status,
  o.source,
  o.payment_method,
  o.payment_status,
  o.courier_id,
  COALESCE(c.name, o.courier_name) AS courier_name,
  o.courier_settlement_status,
  o.is_test,
  o.created_at,
  o.delivered_at,
  COALESCE(it.items_revenue, o.subtotal, 0)::numeric(12, 2) AS items_revenue,
  COALESCE(o.discount_amount, 0)::numeric(12, 2) AS discount_amount,
  COALESCE(NULLIF(o.delivery_charge_charged, 0), o.delivery_charge, 0)::numeric(12, 2) AS customer_delivery_charge,
  o.total AS order_total,
  CASE
    WHEN COALESCE(aso.supplier_amount, 0) > 0 THEN aso.supplier_amount
    ELSE COALESCE(it.items_cost, 0)
  END::numeric(12, 2) AS supplier_cost,
  COALESCE(aso.supplier_paid_amount, 0)::numeric(12, 2) AS supplier_paid_amount,
  GREATEST(0, COALESCE(aso.supplier_return_adjustment, o.return_adjustment, 0))::numeric(12, 2) AS return_adjustment,
  COALESCE(NULLIF(o.delivery_charge_courier, 0), o.courier_fee, 0)::numeric(12, 2) AS actual_courier_charge,
  COALESCE(o.cod_charge, 0)::numeric(12, 2) AS cod_fee,
  CASE
    WHEN o.status IN ('cancelled', 'rejected') THEN 0::numeric(12, 2)
    WHEN o.status = 'returned' THEN (
      - COALESCE(NULLIF(o.delivery_charge_courier, 0), o.courier_fee, 0)
      - COALESCE(o.cod_charge, 0)
      - COALESCE(aso.supplier_return_adjustment, o.return_adjustment, 0)
    )::numeric(12, 2)
    ELSE (
      (COALESCE(it.items_revenue, o.subtotal, 0) - COALESCE(o.discount_amount, 0))
      + COALESCE(NULLIF(o.delivery_charge_charged, 0), o.delivery_charge, 0)
      - (CASE WHEN COALESCE(aso.supplier_amount, 0) > 0 THEN aso.supplier_amount ELSE COALESCE(it.items_cost, 0) END)
      - COALESCE(NULLIF(o.delivery_charge_courier, 0), o.courier_fee, 0)
      - COALESCE(o.cod_charge, 0)
    )::numeric(12, 2)
  END AS net_profit
FROM public.orders o
LEFT JOIN item_totals it ON it.order_id = o.id
LEFT JOIN active_supplier_orders aso ON aso.order_id = o.id
LEFT JOIN public.couriers c ON c.id = o.courier_id;

-- 2. View: Courier Receivables (Delivered COD orders not yet settled via courier_settlements)
CREATE OR REPLACE VIEW public.v_courier_receivables
WITH (security_invoker = true) AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.customer_name,
  o.phone,
  o.district,
  o.courier_id,
  COALESCE(c.name, o.courier_name, 'Unassigned') AS courier_name,
  o.tracking_code,
  o.delivered_at,
  o.created_at,
  o.is_test,
  CASE WHEN COALESCE(o.cod_amount, 0) > 0 THEN o.cod_amount ELSE o.total END::numeric(12, 2) AS cod_amount,
  COALESCE(
    NULLIF(o.delivery_charge_courier, 0),
    NULLIF(o.courier_fee, 0),
    CASE WHEN lower(o.district) = 'dhaka' THEN c.default_charge_dhaka ELSE c.default_charge_outside END,
    o.delivery_charge,
    0
  )::numeric(12, 2) AS expected_courier_charge,
  COALESCE(
    NULLIF(o.cod_charge, 0),
    round((CASE WHEN COALESCE(o.cod_amount, 0) > 0 THEN o.cod_amount ELSE o.total END) * COALESCE(c.cod_fee_percent, 0) / 100.0, 2),
    0
  )::numeric(12, 2) AS expected_cod_fee
FROM public.orders o
LEFT JOIN public.couriers c ON c.id = o.courier_id
WHERE o.status = 'delivered'
  AND o.payment_method = 'cod'
  AND o.payment_status <> 'paid'
  AND o.courier_settlement_status <> 'received'
  AND NOT EXISTS (
    SELECT 1
    FROM public.settlement_orders so
    JOIN public.courier_settlements cs ON cs.id = so.settlement_id
    WHERE so.order_id = o.id
      AND cs.is_void = false
  );

-- 3. View: Supplier Payables (Per order line due for delivered/courier_paid orders)
CREATE OR REPLACE VIEW public.v_supplier_payables
WITH (security_invoker = true) AS
SELECT
  so.id AS supplier_order_id,
  so.supplier_id,
  s.name AS supplier_name,
  s.phone AS supplier_phone,
  so.order_id,
  o.order_number,
  o.customer_name,
  o.status AS order_status,
  o.delivered_at,
  so.placed_at,
  so.supplier_ref,
  so.is_test,
  so.supplier_amount,
  so.paid_amount,
  so.return_adjustment,
  GREATEST(0, so.supplier_amount - so.paid_amount - so.return_adjustment)::numeric(12, 2) AS remaining_due
FROM public.supplier_orders so
JOIN public.orders o ON o.id = so.order_id
LEFT JOIN public.suppliers s ON s.id = so.supplier_id
WHERE so.is_void = false
  AND so.status <> 'cancelled'
  AND o.status IN ('delivered', 'courier_paid')
  AND GREATEST(0, so.supplier_amount - so.paid_amount - so.return_adjustment) > 0;

-- 4. View: Supplier Payables Summary (Grouped by Supplier)
CREATE OR REPLACE VIEW public.v_supplier_payables_summary
WITH (security_invoker = true) AS
SELECT
  sp.supplier_id,
  sp.supplier_name,
  sp.supplier_phone,
  COUNT(*)::integer AS due_orders_count,
  COALESCE(SUM(sp.supplier_amount), 0)::numeric(12, 2) AS total_billed,
  COALESCE(SUM(sp.paid_amount), 0)::numeric(12, 2) AS total_paid,
  COALESCE(SUM(sp.return_adjustment), 0)::numeric(12, 2) AS total_return_adjustment,
  COALESCE(SUM(sp.remaining_due), 0)::numeric(12, 2) AS total_due
FROM public.v_supplier_payables sp
WHERE sp.is_test = false
GROUP BY sp.supplier_id, sp.supplier_name, sp.supplier_phone;

-- 5. View: Monthly Profit & Loss (Excludes voided & test rows)
CREATE OR REPLACE VIEW public.v_monthly_profit_loss
WITH (security_invoker = true) AS
WITH monthly_orders AS (
  SELECT
    date_trunc('month', COALESCE(f.delivered_at, f.created_at))::date AS month_start,
    COUNT(*) FILTER (WHERE f.status IN ('delivered', 'courier_paid', 'supplier_paid'))::integer AS delivered_count,
    COUNT(*) FILTER (WHERE f.status = 'returned')::integer AS returned_count,
    COALESCE(SUM(f.order_total) FILTER (WHERE f.status IN ('delivered', 'courier_paid', 'supplier_paid')), 0)::numeric(12, 2) AS gross_revenue,
    COALESCE(SUM(f.supplier_cost) FILTER (WHERE f.status IN ('delivered', 'courier_paid', 'supplier_paid')), 0)::numeric(12, 2) AS supplier_cogs,
    COALESCE(SUM(f.actual_courier_charge) FILTER (WHERE f.status IN ('delivered', 'courier_paid', 'supplier_paid', 'returned')), 0)::numeric(12, 2) AS courier_charges,
    COALESCE(SUM(f.cod_fee) FILTER (WHERE f.status IN ('delivered', 'courier_paid', 'supplier_paid', 'returned')), 0)::numeric(12, 2) AS cod_fees,
    COALESCE(SUM(f.net_profit) FILTER (WHERE f.status IN ('delivered', 'courier_paid', 'supplier_paid', 'returned')), 0)::numeric(12, 2) AS order_net_profit
  FROM public.v_order_financials f
  WHERE f.is_test = false
    AND f.status IN ('delivered', 'courier_paid', 'supplier_paid', 'returned')
  GROUP BY 1
),
monthly_expenses AS (
  SELECT
    date_trunc('month', e.expense_date)::date AS month_start,
    COALESCE(SUM(e.amount), 0)::numeric(12, 2) AS operating_expenses
  FROM public.expenses e
  WHERE e.is_void = false AND e.is_test = false
  GROUP BY 1
)
SELECT
  COALESCE(mo.month_start, me.month_start) AS month_start,
  COALESCE(mo.delivered_count, 0) AS delivered_count,
  COALESCE(mo.returned_count, 0) AS returned_count,
  COALESCE(mo.gross_revenue, 0)::numeric(12, 2) AS gross_revenue,
  COALESCE(mo.supplier_cogs, 0)::numeric(12, 2) AS supplier_cogs,
  COALESCE(mo.courier_charges, 0)::numeric(12, 2) AS courier_charges,
  COALESCE(mo.cod_fees, 0)::numeric(12, 2) AS cod_fees,
  COALESCE(mo.order_net_profit, 0)::numeric(12, 2) AS gross_order_profit,
  COALESCE(me.operating_expenses, 0)::numeric(12, 2) AS operating_expenses,
  (COALESCE(mo.order_net_profit, 0) - COALESCE(me.operating_expenses, 0))::numeric(12, 2) AS net_profit
FROM monthly_orders mo
FULL OUTER JOIN monthly_expenses me ON me.month_start = mo.month_start
ORDER BY month_start DESC;

-- 6. View: Real-Time Cash Position Summary
CREATE OR REPLACE VIEW public.v_cash_position
WITH (security_invoker = true) AS
SELECT
  COALESCE((SELECT SUM(net_received) FROM public.courier_settlements WHERE is_void = false AND is_test = false), 0)::numeric(12, 2) AS total_courier_settled_in,
  COALESCE((
    SELECT SUM(total) FROM public.orders
    WHERE is_test = false
      AND payment_method IN ('bkash', 'nagad', 'advance')
      AND payment_status = 'paid'
      AND status NOT IN ('cancelled', 'rejected', 'returned')
  ), 0)::numeric(12, 2) AS total_prepaid_in,
  COALESCE((SELECT SUM(amount) FROM public.supplier_payments WHERE is_void = false AND is_test = false), 0)::numeric(12, 2) AS total_supplier_paid_out,
  COALESCE((SELECT SUM(amount) FROM public.expenses WHERE is_void = false AND is_test = false), 0)::numeric(12, 2) AS total_expenses_out,
  COALESCE((SELECT SUM(GREATEST(0, cod_amount - expected_courier_charge - expected_cod_fee)) FROM public.v_courier_receivables WHERE is_test = false), 0)::numeric(12, 2) AS total_courier_receivable,
  COALESCE((SELECT SUM(total_due) FROM public.v_supplier_payables_summary), 0)::numeric(12, 2) AS total_supplier_payable;

-- Lock down all accounting views from anon/public
REVOKE ALL ON
  public.v_order_financials,
  public.v_courier_receivables,
  public.v_supplier_payables,
  public.v_supplier_payables_summary,
  public.v_monthly_profit_loss,
  public.v_cash_position
FROM anon, public;

GRANT SELECT ON
  public.v_order_financials,
  public.v_courier_receivables,
  public.v_supplier_payables,
  public.v_supplier_payables_summary,
  public.v_monthly_profit_loss,
  public.v_cash_position
TO authenticated;

-- 7. Safe Admin RPC to Purge Test/Dummy Data (is_test = true ONLY)
CREATE OR REPLACE FUNCTION public.purge_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settlements int := 0;
  v_sup_payments int := 0;
  v_sup_orders int := 0;
  v_expenses int := 0;
  v_orders int := 0;
  v_products int := 0;
  v_suppliers int := 0;
  v_couriers int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admin or manager can purge test data.';
  END IF;

  -- Authorize bypass of immutability delete guard strictly within this transaction for is_test rows
  PERFORM set_config('app.purge_test_data', 'on', true);

  DELETE FROM public.settlement_orders
  WHERE is_test = true
     OR settlement_id IN (SELECT id FROM public.courier_settlements WHERE is_test = true)
     OR order_id IN (SELECT id FROM public.orders WHERE is_test = true);

  DELETE FROM public.courier_settlements WHERE is_test = true;
  GET DIAGNOSTICS v_settlements = ROW_COUNT;

  DELETE FROM public.supplier_payment_orders
  WHERE is_test = true
     OR payment_id IN (SELECT id FROM public.supplier_payments WHERE is_test = true)
     OR order_id IN (SELECT id FROM public.orders WHERE is_test = true);

  DELETE FROM public.supplier_payments WHERE is_test = true;
  GET DIAGNOSTICS v_sup_payments = ROW_COUNT;

  DELETE FROM public.supplier_orders
  WHERE is_test = true
     OR order_id IN (SELECT id FROM public.orders WHERE is_test = true);
  GET DIAGNOSTICS v_sup_orders = ROW_COUNT;

  DELETE FROM public.expenses WHERE is_test = true;
  GET DIAGNOSTICS v_expenses = ROW_COUNT;

  DELETE FROM public.orders WHERE is_test = true;
  GET DIAGNOSTICS v_orders = ROW_COUNT;

  DELETE FROM public.products WHERE is_test = true
    AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.product_id = products.id);
  GET DIAGNOSTICS v_products = ROW_COUNT;

  DELETE FROM public.suppliers WHERE is_test = true
    AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.supplier_id = suppliers.id)
    AND NOT EXISTS (SELECT 1 FROM public.supplier_orders so WHERE so.supplier_id = suppliers.id)
    AND NOT EXISTS (SELECT 1 FROM public.supplier_payments sp WHERE sp.supplier_id = suppliers.id);
  GET DIAGNOSTICS v_suppliers = ROW_COUNT;

  DELETE FROM public.couriers WHERE is_test = true
    AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.courier_id = couriers.id)
    AND NOT EXISTS (SELECT 1 FROM public.courier_settlements cs WHERE cs.courier_id = couriers.id);
  GET DIAGNOSTICS v_couriers = ROW_COUNT;

  RETURN jsonb_build_object(
    'settlements_deleted', v_settlements,
    'supplier_payments_deleted', v_sup_payments,
    'supplier_orders_deleted', v_sup_orders,
    'expenses_deleted', v_expenses,
    'orders_deleted', v_orders,
    'products_deleted', v_products,
    'suppliers_deleted', v_suppliers,
    'couriers_deleted', v_couriers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_test_data() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.purge_test_data() TO authenticated;

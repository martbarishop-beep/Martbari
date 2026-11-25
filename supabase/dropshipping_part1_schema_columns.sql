-- ============================================================================
-- MartBari Dropshipping & Accounting — PART 1: Schema Extensions, Couriers & Safe Backfill
-- Non-Destructive & Idempotent (Safe to re-run multiple times in Supabase SQL Editor)
-- ============================================================================

-- 1. Create Couriers table
CREATE TABLE IF NOT EXISTS public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  tracking_url_template text,
  default_charge_dhaka numeric(12, 2) NOT NULL DEFAULT 70 CHECK (default_charge_dhaka >= 0),
  default_charge_outside numeric(12, 2) NOT NULL DEFAULT 130 CHECK (default_charge_outside >= 0),
  cod_fee_percent numeric(5, 2) NOT NULL DEFAULT 1.00 CHECK (cod_fee_percent >= 0 AND cod_fee_percent <= 100),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed common Bangladeshi couriers idempotently
INSERT INTO public.couriers (name, phone, tracking_url_template, default_charge_dhaka, default_charge_outside, cod_fee_percent, notes)
VALUES
  ('Steadfast Courier', '09678045045', 'https://steadfast.com.bd/t/{tracking_code}', 70, 130, 1.00, 'Standard nationwide COD courier'),
  ('Pathao Courier', '09678100800', 'https://merchant.pathao.com/tracking?consignment_id={tracking_code}', 70, 130, 1.00, 'Fast intra-Dhaka & nationwide delivery'),
  ('RedX', '09610007339', 'https://redx.com.bd/track-global-parcel/?trackingId={tracking_code}', 70, 130, 1.00, 'Nationwide COD logistics'),
  ('Paperfly', '09666777999', 'https://paperfly.com.bd/tracking/?id={tracking_code}', 80, 140, 1.00, 'Point delivery coverage across 64 districts'),
  ('Sundarban Courier', '01711000000', NULL, 80, 150, 0.00, 'Condition / branch booking courier')
ON CONFLICT (name) DO NOTHING;

-- 2. Extend existing tables non-destructively (ADD COLUMN IF NOT EXISTS)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_charge_charged numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge_charged >= 0),
  ADD COLUMN IF NOT EXISTS delivery_charge_courier numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge_courier >= 0),
  ADD COLUMN IF NOT EXISTS cod_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cod_amount >= 0),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS courier_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_adjustment numeric(12, 2) NOT NULL DEFAULT 0 CHECK (return_adjustment >= 0),
  ADD COLUMN IF NOT EXISTS courier_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (courier_fee >= 0),
  ADD COLUMN IF NOT EXISTS cod_charge numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cod_charge >= 0),
  ADD COLUMN IF NOT EXISTS courier_settlement_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_received_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (payment_received_amount >= 0),
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_received_by text,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selling_price numeric(12, 2) CHECK (selling_price IS NULL OR selling_price >= 0),
  ADD COLUMN IF NOT EXISTS supplier_order_ref text,
  ADD COLUMN IF NOT EXISTS supplier_tracking_code text,
  ADD COLUMN IF NOT EXISTS return_adjustment numeric(12, 2) NOT NULL DEFAULT 0 CHECK (return_adjustment >= 0);

-- 3. Safely update CHECK constraints on public.orders (preserving legacy & new statuses/sources/methods)
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%status%'
        OR pg_get_constraintdef(c.oid) ILIKE '%source%'
        OR pg_get_constraintdef(c.oid) ILIKE '%payment_method%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'confirmed',
      'placed_with_supplier',
      'ordered_from_supplier',
      'shipped',
      'delivered',
      'courier_paid',
      'supplier_paid',
      'cancelled',
      'rejected',
      'returned'
    )
  ),
  ADD CONSTRAINT orders_source_check CHECK (
    source IN ('website', 'facebook', 'whatsapp', 'phone', 'ai_chat', 'messenger', 'manual')
  ),
  ADD CONSTRAINT orders_payment_method_check CHECK (
    payment_method IN ('cod', 'bkash', 'nagad', 'advance')
  ),
  ADD CONSTRAINT orders_courier_settlement_status_check CHECK (
    courier_settlement_status IN ('pending', 'waiting_settlement', 'received', 'problem')
  );

-- 4. Sync triggers to keep legacy and new accounting columns seamlessly synchronized
CREATE OR REPLACE FUNCTION public.sync_order_item_selling_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.selling_price IS NULL AND NEW.unit_price IS NOT NULL THEN
    NEW.selling_price := NEW.unit_price;
  ELSIF NEW.unit_price IS NULL AND NEW.selling_price IS NOT NULL THEN
    NEW.unit_price := NEW.selling_price;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_sync_selling_price ON public.order_items;
CREATE TRIGGER trg_order_items_sync_selling_price
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_item_selling_price();

CREATE OR REPLACE FUNCTION public.sync_order_accounting_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Keep delivery_charge and delivery_charge_charged aligned on insert
  IF COALESCE(NEW.delivery_charge_charged, 0) = 0 AND COALESCE(NEW.delivery_charge, 0) > 0 THEN
    NEW.delivery_charge_charged := NEW.delivery_charge;
  ELSIF COALESCE(NEW.delivery_charge, 0) = 0 AND COALESCE(NEW.delivery_charge_charged, 0) > 0 THEN
    NEW.delivery_charge := NEW.delivery_charge_charged;
  END IF;

  -- Keep delivery_charge_courier and courier_fee aligned
  IF COALESCE(NEW.delivery_charge_courier, 0) = 0 AND COALESCE(NEW.courier_fee, 0) > 0 THEN
    NEW.delivery_charge_courier := NEW.courier_fee;
  ELSIF COALESCE(NEW.courier_fee, 0) = 0 AND COALESCE(NEW.delivery_charge_courier, 0) > 0 THEN
    NEW.courier_fee := NEW.delivery_charge_courier;
  END IF;

  -- Default cod_amount for COD orders
  IF COALESCE(NEW.cod_amount, 0) = 0 AND NEW.payment_method = 'cod' AND COALESCE(NEW.total, 0) > 0 THEN
    NEW.cod_amount := NEW.total;
  END IF;

  -- Record lifecycle timestamps automatically
  IF NEW.status IN ('delivered', 'courier_paid', 'supplier_paid') AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  IF NEW.status = 'courier_paid' AND NEW.courier_paid_at IS NULL THEN
    NEW.courier_paid_at := now();
  END IF;
  IF NEW.status = 'supplier_paid' AND NEW.supplier_paid_at IS NULL THEN
    NEW.supplier_paid_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_accounting ON public.orders;
CREATE TRIGGER trg_orders_sync_accounting
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_accounting_fields();

-- 5. Safe non-destructive backfill for existing historical rows
UPDATE public.order_items
SET selling_price = unit_price
WHERE selling_price IS NULL;

UPDATE public.orders o
SET
  delivery_charge_charged = CASE
    WHEN o.delivery_charge_charged = 0 AND o.delivery_charge > 0 THEN o.delivery_charge
    ELSE o.delivery_charge_charged
  END,
  delivery_charge_courier = CASE
    WHEN o.delivery_charge_courier = 0 AND COALESCE(o.courier_fee, 0) > 0 THEN o.courier_fee
    ELSE o.delivery_charge_courier
  END,
  cod_amount = CASE
    WHEN o.cod_amount = 0 AND o.payment_method = 'cod' THEN o.total
    ELSE o.cod_amount
  END,
  delivered_at = CASE
    WHEN o.delivered_at IS NULL AND o.status IN ('delivered', 'courier_paid', 'supplier_paid') THEN o.updated_at
    ELSE o.delivered_at
  END,
  courier_id = COALESCE(
    o.courier_id,
    (SELECT c.id FROM public.couriers c WHERE lower(c.name) = lower(o.courier_name) LIMIT 1)
  )
WHERE o.delivery_charge_charged = 0
   OR o.delivery_charge_courier = 0
   OR (o.cod_amount = 0 AND o.payment_method = 'cod')
   OR (o.delivered_at IS NULL AND o.status IN ('delivered', 'courier_paid', 'supplier_paid'))
   OR (o.courier_id IS NULL AND o.courier_name IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON public.orders (courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders (delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_is_test ON public.orders (is_test);

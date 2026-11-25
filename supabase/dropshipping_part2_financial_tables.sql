-- ============================================================================
-- MartBari Dropshipping & Accounting — PART 2: Financial Voucher & Ledger Tables
-- Non-Destructive & Idempotent (Safe to re-run multiple times in Supabase SQL Editor)
-- ============================================================================

-- 1. Voucher Number Sequences & Generators
CREATE SEQUENCE IF NOT EXISTS public.courier_settlement_voucher_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.supplier_payment_voucher_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_cs_voucher_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.voucher_no IS NULL OR btrim(NEW.voucher_no) = '' THEN
    NEW.voucher_no := 'CS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.courier_settlement_voucher_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sp_voucher_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.voucher_no IS NULL OR btrim(NEW.voucher_no) = '' THEN
    NEW.voucher_no := 'SP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.supplier_payment_voucher_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Supplier Orders Table (Tracks per-order supplier placement, wholesale cost, partial payments & return adjustments)
CREATE TABLE IF NOT EXISTS public.supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'dispatched', 'delivered', 'returned', 'cancelled')),
  supplier_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (supplier_amount >= 0),
  paid_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  return_adjustment numeric(12, 2) NOT NULL DEFAULT 0 CHECK (return_adjustment >= 0),
  supplier_ref text,
  placed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  is_void boolean NOT NULL DEFAULT false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_supplier_orders_updated_at ON public.supplier_orders;
CREATE TRIGGER trg_supplier_orders_updated_at
  BEFORE UPDATE ON public.supplier_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON public.supplier_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_id ON public.supplier_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_active ON public.supplier_orders (is_void, status);

-- 3. Courier Settlements Table (Voucher header for COD cash received from couriers)
CREATE TABLE IF NOT EXISTS public.courier_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no text NOT NULL UNIQUE,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE RESTRICT,
  settlement_date date NOT NULL DEFAULT CURRENT_DATE,
  total_cod_collected numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_cod_collected >= 0),
  total_courier_charges numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_courier_charges >= 0),
  total_cod_fees numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_cod_fees >= 0),
  net_received numeric(12, 2) NOT NULL DEFAULT 0 CHECK (net_received >= 0),
  reference_no text,
  notes text,
  is_void boolean NOT NULL DEFAULT false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_courier_settlements_voucher ON public.courier_settlements;
CREATE TRIGGER trg_courier_settlements_voucher
  BEFORE INSERT ON public.courier_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_cs_voucher_no();

CREATE INDEX IF NOT EXISTS idx_courier_settlements_courier_date ON public.courier_settlements (courier_id, settlement_date DESC);

-- 4. Settlement Orders Junction Table (Orders included in a courier settlement voucher)
CREATE TABLE IF NOT EXISTS public.settlement_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.courier_settlements(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  cod_collected numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cod_collected >= 0),
  courier_charge numeric(12, 2) NOT NULL DEFAULT 0 CHECK (courier_charge >= 0),
  cod_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
  net_amount numeric(12, 2) NOT NULL DEFAULT 0,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (settlement_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_orders_order_id ON public.settlement_orders (order_id);

-- 5. Supplier Payments Table (Voucher header for payouts made to suppliers; supports partial & multi-order allocation)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'bkash' CHECK (payment_method IN ('bkash', 'nagad', 'bank', 'cash', 'rocket', 'other')),
  reference_no text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  is_void boolean NOT NULL DEFAULT false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_supplier_payments_voucher ON public.supplier_payments;
CREATE TRIGGER trg_supplier_payments_voucher
  BEFORE INSERT ON public.supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_sp_voucher_no();

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_date ON public.supplier_payments (supplier_id, paid_at DESC);

-- 6. Supplier Payment Orders Allocation Table (Supports partial payments per order)
CREATE TABLE IF NOT EXISTS public.supplier_payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.supplier_payments(id) ON DELETE RESTRICT,
  supplier_order_id uuid REFERENCES public.supplier_orders(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount_allocated numeric(12, 2) NOT NULL CHECK (amount_allocated > 0),
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payment_orders_payment_id ON public.supplier_payment_orders (payment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_orders_order_id ON public.supplier_payment_orders (order_id);

-- 7. Expenses Table (Ad spend, packaging, courier adjustments, office & internet, other)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('ads', 'packaging', 'courier_adjustment', 'office_internet', 'other')),
  title text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  is_void boolean NOT NULL DEFAULT false,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON public.expenses (is_void, category);

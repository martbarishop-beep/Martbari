-- ============================================================================
-- MartBari — Dropshipping Payments & Supplier Orders Schema (Idempotent)
-- ============================================================================
-- Run this script in the Supabase SQL Editor AFTER supabase/schema.sql.
-- Adds payment tracking columns, courier settlement fields, profit metrics,
-- supplier message templates, and a dedicated payments table with RLS.
-- ============================================================================

-- 1. Add payment & settlement columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_received_amount numeric(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_received_by text,
  ADD COLUMN IF NOT EXISTS courier_settlement_status text DEFAULT 'pending' CHECK (courier_settlement_status IN ('pending', 'waiting_settlement', 'received', 'problem')),
  ADD COLUMN IF NOT EXISTS courier_fee numeric(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_charge numeric(12, 2) DEFAULT 0;

-- 2. Add supplier tracking & order reference columns to order_items table
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS supplier_order_ref text,
  ADD COLUMN IF NOT EXISTS supplier_tracking_code text;

-- 3. Create payments table for detailed ledger records
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'cod' CHECK (method IN ('cod', 'bkash', 'nagad', 'courier_settlement')),
  trx_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Add supplier message templates to settings table
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS supplier_msg_template_en text DEFAULT 'Hello Supplier, please ship order #{order_number} for product {product} (Qty: {qty}). Customer: {name}, Phone: {phone}, Address: {address}.',
  ADD COLUMN IF NOT EXISTS supplier_msg_template_bn text DEFAULT 'হ্যালো সাপ্লায়ার, অর্ডার #{order_number} এর জন্য পণ্যটি পাঠিয়ে দিন। পণ্য: {product} (পরিমাণ: {qty})। কাস্টমার: {name}, ফোন: {phone}, ঠিকানা: {address}।';

-- 5. Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
CREATE POLICY "Staff manage payments"
ON public.payments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_settlement_status ON public.orders (courier_settlement_status);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier_status ON public.order_items (supplier_order_status);

-- ============================================================================
-- MartBari E-Commerce & Dropshipping Platform — Complete Supabase Schema
-- Idempotent & Re-runnable: Safe to execute multiple times in SQL Editor
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. SEQUENCES & UTILITY FUNCTIONS
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR btrim(NEW.order_number) = '' THEN
    NEW.order_number := 'MB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------

-- 2.1 Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'manager', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  seo_title_bn text,
  seo_title_en text,
  seo_desc_bn text,
  seo_desc_en text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.4 Suppliers (Dropshipping)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.5 Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bn text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_desc_bn text,
  short_desc_en text,
  description_bn text,
  description_en text,
  specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  sale_price numeric(12, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  cost_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  sku text NOT NULL UNIQUE,
  barcode text,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  warranty_bn text,
  warranty_en text,
  weight_grams integer CHECK (weight_grams IS NULL OR weight_grams >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  track_stock boolean NOT NULL DEFAULT true,
  seo_title_bn text,
  seo_title_en text,
  seo_desc_bn text,
  seo_desc_en text,
  -- Dropshipping columns (private to admin/manager)
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_product_url text,
  supplier_sku text,
  supplier_price numeric(12, 2) CHECK (supplier_price IS NULL OR supplier_price >= 0),
  estimated_delivery_days integer DEFAULT 3 CHECK (estimated_delivery_days IS NULL OR estimated_delivery_days >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.6 Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name_bn text NOT NULL,
  name_en text NOT NULL,
  sku text,
  price_override numeric(12, 2) CHECK (price_override IS NULL OR price_override >= 0),
  cost_override numeric(12, 2) CHECK (cost_override IS NULL OR cost_override >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.7 Product Images
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_bn text,
  alt_en text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.8 Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  default_address text,
  district text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric(12, 2) NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.9 Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  district text NOT NULL,
  delivery_charge numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  coupon_code text,
  total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'bkash', 'nagad')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_sender_number text,
  payment_trx_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ordered_from_supplier', 'shipped', 'delivered', 'cancelled', 'rejected', 'returned')),
  courier_name text,
  tracking_code text,
  tracking_url text,
  source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'facebook', 'whatsapp', 'phone', 'ai_chat')),
  customer_note text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.10 Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  cost_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_order_status text NOT NULL DEFAULT 'not_ordered' CHECK (supplier_order_status IN ('not_ordered', 'ordered', 'received', 'failed')),
  supplier_order_ref text,
  quantity integer NOT NULL CHECK (quantity > 0)
);

-- 2.11 Order Status History
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.12 Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent', 'fixed')),
  value numeric(12, 2) NOT NULL CHECK (value >= 0),
  min_order_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount numeric(12, 2) CHECK (max_discount IS NULL OR max_discount >= 0),
  usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.13 Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.14 Banners
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  label_bn text,
  label_en text,
  title_bn text,
  title_en text,
  subtitle_bn text,
  subtitle_en text,
  price_badge_bn text,
  price_badge_en text,
  button_text_bn text,
  button_text_en text,
  secondary_button_text_bn text,
  secondary_button_text_en text,
  secondary_link_url text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure existing databases receive new hero banner columns safely on re-run
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS label_bn text,
  ADD COLUMN IF NOT EXISTS label_en text,
  ADD COLUMN IF NOT EXISTS subtitle_bn text,
  ADD COLUMN IF NOT EXISTS subtitle_en text,
  ADD COLUMN IF NOT EXISTS price_badge_bn text,
  ADD COLUMN IF NOT EXISTS price_badge_en text,
  ADD COLUMN IF NOT EXISTS button_text_bn text,
  ADD COLUMN IF NOT EXISTS button_text_en text,
  ADD COLUMN IF NOT EXISTS secondary_button_text_bn text,
  ADD COLUMN IF NOT EXISTS secondary_button_text_en text,
  ADD COLUMN IF NOT EXISTS secondary_link_url text;

-- 2.15 Pages
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_bn text NOT NULL,
  title_en text NOT NULL,
  content_bn text,
  content_en text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.16 Settings (Singleton row id = 1)
CREATE TABLE IF NOT EXISTS public.settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name_bn text NOT NULL DEFAULT 'মার্টবাড়ি',
  store_name_en text NOT NULL DEFAULT 'MartBari',
  logo_url text,
  favicon_url text,
  phone text DEFAULT '+880 1770-501652',
  whatsapp text DEFAULT '8801770501652',
  email text DEFAULT 'martbari.shop@gmail.com',
  address_bn text,
  address_en text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  delivery_charge_dhaka numeric(12, 2) NOT NULL DEFAULT 70,
  delivery_charge_outside numeric(12, 2) NOT NULL DEFAULT 130,
  free_delivery_above numeric(12, 2),
  bkash_number text,
  nagad_number text,
  payment_note_bn text,
  payment_note_en text,
  announcement_bn text,
  announcement_en text,
  facebook_pixel_id text,
  google_analytics_id text,
  min_order_amount numeric(12, 2),
  maintenance_mode boolean NOT NULL DEFAULT false,
  show_demo_data boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure existing databases receive show_demo_data safely on re-run
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS show_demo_data boolean NOT NULL DEFAULT true;

-- 2.17 Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products (is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON public.product_images (product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON public.reviews (product_id, is_approved);

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS & AUTH PROFILE AUTOMATION
-- ----------------------------------------------------------------------------

-- Auto-create profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    'customer',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Helper functions (security definer, search_path pinned)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'manager', 'staff')
  );
$$;

-- Prevent users from escalating their own role or reactivating themselves
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Only an admin can change profile role or active status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_self_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pages_updated_at ON public.pages;
CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Order number trigger
DROP TRIGGER IF EXISTS trg_orders_generate_number ON public.orders;
CREATE TRIGGER trg_orders_generate_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- ----------------------------------------------------------------------------
-- 5. PUBLIC VIEWS (Storefront-safe projections)
-- ----------------------------------------------------------------------------

-- Excludes cost_price, supplier_id, supplier_price, supplier_product_url, supplier_sku
CREATE OR REPLACE VIEW public.public_products AS
SELECT
  id,
  name_bn,
  name_en,
  slug,
  short_desc_bn,
  short_desc_en,
  description_bn,
  description_en,
  specifications,
  price,
  sale_price,
  sale_starts_at,
  sale_ends_at,
  stock,
  low_stock_threshold,
  sku,
  barcode,
  brand_id,
  category_id,
  warranty_bn,
  warranty_en,
  weight_grams,
  is_active,
  is_featured,
  is_new,
  track_stock,
  seo_title_bn,
  seo_title_en,
  seo_desc_bn,
  seo_desc_en,
  estimated_delivery_days,
  created_at,
  updated_at
FROM public.products
WHERE is_active = true;

GRANT SELECT ON public.public_products TO anon, authenticated;

-- Excludes cost_override on variants for public storefront consumption
CREATE OR REPLACE VIEW public.public_product_variants AS
SELECT
  pv.id,
  pv.product_id,
  pv.name_bn,
  pv.name_en,
  pv.sku,
  pv.price_override,
  pv.stock,
  pv.image_url,
  pv.is_active
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
WHERE pv.is_active = true AND p.is_active = true;

GRANT SELECT ON public.public_product_variants TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) ON EVERY TABLE
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own_or_super_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_super_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_super_admin_all" ON public.profiles;
CREATE POLICY "profiles_super_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- CATEGORIES
DROP POLICY IF EXISTS "categories_public_select_active" ON public.categories;
CREATE POLICY "categories_public_select_active"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- BRANDS
DROP POLICY IF EXISTS "brands_public_select_active" ON public.brands;
CREATE POLICY "brands_public_select_active"
  ON public.brands FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "brands_admin_all" ON public.brands;
CREATE POLICY "brands_admin_all"
  ON public.brands FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SUPPLIERS (admin & manager only)
DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;
CREATE POLICY "suppliers_admin_all"
  ON public.suppliers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PRODUCTS (admin & manager only directly; public uses public_products view)
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PRODUCT VARIANTS
DROP POLICY IF EXISTS "product_variants_public_select_active" ON public.product_variants;
CREATE POLICY "product_variants_public_select_active"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PRODUCT IMAGES
DROP POLICY IF EXISTS "product_images_public_select" ON public.product_images;
CREATE POLICY "product_images_public_select"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "product_images_admin_all" ON public.product_images;
CREATE POLICY "product_images_admin_all"
  ON public.product_images FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- CUSTOMERS (staff can manage orders & customers; admin/manager full)
DROP POLICY IF EXISTS "customers_staff_select" ON public.customers;
CREATE POLICY "customers_staff_select"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "customers_staff_insert" ON public.customers;
CREATE POLICY "customers_staff_insert"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "customers_staff_update" ON public.customers;
CREATE POLICY "customers_staff_update"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "customers_admin_delete" ON public.customers;
CREATE POLICY "customers_admin_delete"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ORDERS (staff can manage orders; admin/manager full)
DROP POLICY IF EXISTS "orders_staff_select" ON public.orders;
CREATE POLICY "orders_staff_select"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "orders_staff_insert" ON public.orders;
CREATE POLICY "orders_staff_insert"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "orders_staff_update" ON public.orders;
CREATE POLICY "orders_staff_update"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "orders_admin_delete" ON public.orders;
CREATE POLICY "orders_admin_delete"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ORDER ITEMS
DROP POLICY IF EXISTS "order_items_staff_select" ON public.order_items;
CREATE POLICY "order_items_staff_select"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "order_items_staff_insert" ON public.order_items;
CREATE POLICY "order_items_staff_insert"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_items_staff_update" ON public.order_items;
CREATE POLICY "order_items_staff_update"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_items_admin_delete" ON public.order_items;
CREATE POLICY "order_items_admin_delete"
  ON public.order_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ORDER STATUS HISTORY
DROP POLICY IF EXISTS "order_status_history_staff_select" ON public.order_status_history;
CREATE POLICY "order_status_history_staff_select"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "order_status_history_staff_insert" ON public.order_status_history;
CREATE POLICY "order_status_history_staff_insert"
  ON public.order_status_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_status_history_admin_delete" ON public.order_status_history;
CREATE POLICY "order_status_history_admin_delete"
  ON public.order_status_history FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- COUPONS (admin & manager only; public uses validate_coupon RPC)
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- REVIEWS
DROP POLICY IF EXISTS "reviews_public_select_approved" ON public.reviews;
CREATE POLICY "reviews_public_select_approved"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

DROP POLICY IF EXISTS "reviews_public_insert_pending" ON public.reviews;
CREATE POLICY "reviews_public_insert_pending"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (is_approved = false AND rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
CREATE POLICY "reviews_admin_all"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- BANNERS
DROP POLICY IF EXISTS "banners_public_select_active" ON public.banners;
CREATE POLICY "banners_public_select_active"
  ON public.banners FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "banners_admin_all" ON public.banners;
CREATE POLICY "banners_admin_all"
  ON public.banners FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PAGES
DROP POLICY IF EXISTS "pages_public_select_active" ON public.pages;
CREATE POLICY "pages_public_select_active"
  ON public.pages FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "pages_admin_all" ON public.pages;
CREATE POLICY "pages_admin_all"
  ON public.pages FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- SETTINGS (public read; super admin only write)
DROP POLICY IF EXISTS "settings_public_select" ON public.settings;
CREATE POLICY "settings_public_select"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_super_admin_all" ON public.settings;
CREATE POLICY "settings_super_admin_all"
  ON public.settings FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ACTIVITY LOGS (admin & manager read/write; staff insert)
DROP POLICY IF EXISTS "activity_logs_admin_select" ON public.activity_logs;
CREATE POLICY "activity_logs_admin_select"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "activity_logs_staff_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_staff_insert"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------------------
-- 6B. ROLE GRANTS (anon & authenticated; Row Level Security enforces access)
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Storefront anonymous role: public catalog views, active metadata, and review submission
GRANT SELECT ON
  public.categories,
  public.brands,
  public.product_variants,
  public.product_images,
  public.reviews,
  public.banners,
  public.pages,
  public.settings,
  public.public_products,
  public.public_product_variants
TO anon;

GRANT INSERT ON public.reviews TO anon;

-- Authenticated role: table/view privileges (RLS policies restrict rows by role)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.categories,
  public.brands,
  public.suppliers,
  public.products,
  public.product_variants,
  public.product_images,
  public.customers,
  public.orders,
  public.order_items,
  public.order_status_history,
  public.coupons,
  public.reviews,
  public.banners,
  public.pages,
  public.settings,
  public.activity_logs
TO authenticated;

GRANT SELECT ON
  public.public_products,
  public.public_product_variants
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. STOREFRONT RPC FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- 7.1 Validate Coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_subtotal numeric
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric(12, 2) := 0;
  v_clean_code text := upper(btrim(COALESCE(p_code, '')));
BEGIN
  IF v_clean_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'reason', 'empty_code');
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(code) = v_clean_code
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'reason', 'not_found');
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'reason', 'not_started');
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'reason', 'expired');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'discount_amount', 0, 'reason', 'usage_limit_reached');
  END IF;

  IF COALESCE(p_subtotal, 0) < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'discount_amount', 0,
      'reason', 'min_order_not_met',
      'min_order_amount', v_coupon.min_order_amount
    );
  END IF;

  IF v_coupon.type = 'percent' THEN
    v_discount := round((COALESCE(p_subtotal, 0) * v_coupon.value) / 100.0, 2);
    IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
      v_discount := v_coupon.max_discount;
    END IF;
  ELSE
    v_discount := v_coupon.value;
  END IF;

  IF v_discount > COALESCE(p_subtotal, 0) THEN
    v_discount := COALESCE(p_subtotal, 0);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'type', v_coupon.type,
    'value', v_coupon.value,
    'discount_amount', v_discount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;

-- 7.2 Create Order (Authoritative server-side pricing, stock, rate-limit, customer upsert)
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_address text DEFAULT '',
  p_district text DEFAULT 'Dhaka',
  p_items jsonb DEFAULT '[]'::jsonb,
  p_coupon_code text DEFAULT NULL,
  p_payment_method text DEFAULT 'cod',
  p_payment_sender_number text DEFAULT NULL,
  p_payment_trx_id text DEFAULT NULL,
  p_customer_note text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_phone text := regexp_replace(btrim(COALESCE(p_phone, '')), '\s+', '', 'g');
  v_clean_name text := btrim(COALESCE(p_customer_name, ''));
  v_clean_address text := btrim(COALESCE(p_address, ''));
  v_clean_district text := btrim(COALESCE(p_district, 'Dhaka'));
  v_settings public.settings%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_customer_id uuid;
  v_recent_count integer := 0;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_qty integer;
  v_unit_price numeric(12, 2);
  v_unit_cost numeric(12, 2);
  v_item_name text;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_coupon_res jsonb;
  v_coupon_code text := NULL;
  v_delivery numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_order_id uuid;
  v_order_number text;
  v_sale_active boolean;
BEGIN
  IF v_clean_name = '' OR v_clean_phone = '' OR v_clean_address = '' THEN
    RAISE EXCEPTION 'Customer name, phone, and address are required.';
  END IF;

  IF p_payment_method NOT IN ('cod', 'bkash', 'nagad') THEN
    RAISE EXCEPTION 'Invalid payment method.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  SELECT * INTO v_settings FROM public.settings WHERE id = 1;
  IF v_settings.maintenance_mode THEN
    RAISE EXCEPTION 'Store is currently in maintenance mode.';
  END IF;

  -- Check if customer is blocked
  SELECT * INTO v_customer FROM public.customers WHERE phone = v_clean_phone LIMIT 1;
  IF FOUND AND v_customer.is_blocked THEN
    RAISE EXCEPTION 'Orders cannot be placed with this phone number.';
  END IF;

  -- Rate limit: max 5 orders per phone per hour
  SELECT count(*) INTO v_recent_count
  FROM public.orders
  WHERE phone = v_clean_phone
    AND created_at >= now() - interval '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many orders placed recently. Please try again later.';
  END IF;

  -- First pass: validate items, lock rows, compute real subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item ->> 'quantity')::integer, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero.';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item ->> 'product_id')::uuid
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or inactive.';
    END IF;

    v_sale_active := (
      v_product.sale_price IS NOT NULL
      AND (v_product.sale_starts_at IS NULL OR now() >= v_product.sale_starts_at)
      AND (v_product.sale_ends_at IS NULL OR now() <= v_product.sale_ends_at)
    );

    v_unit_price := CASE WHEN v_sale_active THEN v_product.sale_price ELSE v_product.price END;
    v_unit_cost := v_product.cost_price;

    IF (v_item ->> 'variant_id') IS NOT NULL AND btrim(v_item ->> 'variant_id') <> '' THEN
      SELECT * INTO v_variant
      FROM public.product_variants
      WHERE id = (v_item ->> 'variant_id')::uuid
        AND product_id = v_product.id
        AND is_active = true
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected product variant is unavailable.';
      END IF;

      IF v_product.track_stock AND v_variant.stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for % (%).', v_product.name_en, v_variant.name_en;
      END IF;

      IF v_variant.price_override IS NOT NULL THEN
        v_unit_price := v_variant.price_override;
      END IF;
      IF v_variant.cost_override IS NOT NULL THEN
        v_unit_cost := v_variant.cost_override;
      END IF;
    ELSE
      IF v_product.track_stock AND v_product.stock < v_qty THEN
        RAISE EXCEPTION 'Insufficient stock for %.', v_product.name_en;
      END IF;
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
  END LOOP;

  IF v_settings.min_order_amount IS NOT NULL AND v_subtotal < v_settings.min_order_amount THEN
    RAISE EXCEPTION 'Minimum order amount is %.', v_settings.min_order_amount;
  END IF;

  -- Coupon validation
  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    v_coupon_res := public.validate_coupon(p_coupon_code, v_subtotal);
    IF COALESCE((v_coupon_res ->> 'valid')::boolean, false) THEN
      v_coupon_code := v_coupon_res ->> 'code';
      v_discount := COALESCE((v_coupon_res ->> 'discount_amount')::numeric, 0);
    ELSE
      RAISE EXCEPTION 'Invalid or inapplicable coupon code.';
    END IF;
  END IF;

  -- Delivery charge calculation
  IF lower(v_clean_district) = 'dhaka' THEN
    v_delivery := COALESCE(v_settings.delivery_charge_dhaka, 70);
  ELSE
    v_delivery := COALESCE(v_settings.delivery_charge_outside, 130);
  END IF;

  IF v_settings.free_delivery_above IS NOT NULL AND v_subtotal >= v_settings.free_delivery_above THEN
    v_delivery := 0;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_delivery;

  -- Upsert customer by phone
  INSERT INTO public.customers (name, phone, email, default_address, district, total_orders, total_spent)
  VALUES (v_clean_name, v_clean_phone, NULLIF(btrim(COALESCE(p_email, '')), ''), v_clean_address, v_clean_district, 1, v_total)
  ON CONFLICT (phone) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, public.customers.email),
    default_address = EXCLUDED.default_address,
    district = EXCLUDED.district,
    total_orders = public.customers.total_orders + 1,
    total_spent = public.customers.total_spent + v_total
  RETURNING id INTO v_customer_id;

  -- Insert order
  INSERT INTO public.orders (
    order_number,
    customer_id,
    customer_name,
    phone,
    email,
    address,
    district,
    delivery_charge,
    subtotal,
    discount_amount,
    coupon_code,
    total,
    payment_method,
    payment_status,
    payment_sender_number,
    payment_trx_id,
    status,
    source,
    customer_note
  )
  VALUES (
    '',
    v_customer_id,
    v_clean_name,
    v_clean_phone,
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    v_clean_address,
    v_clean_district,
    v_delivery,
    v_subtotal,
    v_discount,
    v_coupon_code,
    v_total,
    p_payment_method,
    'unpaid',
    NULLIF(btrim(COALESCE(p_payment_sender_number, '')), ''),
    NULLIF(btrim(COALESCE(p_payment_trx_id, '')), ''),
    'pending',
    'website',
    NULLIF(btrim(COALESCE(p_customer_note, '')), '')
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Second pass: insert order items and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item ->> 'quantity')::integer;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item ->> 'product_id')::uuid;

    v_sale_active := (
      v_product.sale_price IS NOT NULL
      AND (v_product.sale_starts_at IS NULL OR now() >= v_product.sale_starts_at)
      AND (v_product.sale_ends_at IS NULL OR now() <= v_product.sale_ends_at)
    );

    v_unit_price := CASE WHEN v_sale_active THEN v_product.sale_price ELSE v_product.price END;
    v_unit_cost := v_product.cost_price;
    v_item_name := v_product.name_en;

    IF (v_item ->> 'variant_id') IS NOT NULL AND btrim(v_item ->> 'variant_id') <> '' THEN
      SELECT * INTO v_variant
      FROM public.product_variants
      WHERE id = (v_item ->> 'variant_id')::uuid;

      v_item_name := v_product.name_en || ' - ' || v_variant.name_en;
      IF v_variant.price_override IS NOT NULL THEN
        v_unit_price := v_variant.price_override;
      END IF;
      IF v_variant.cost_override IS NOT NULL THEN
        v_unit_cost := v_variant.cost_override;
      END IF;

      IF v_product.track_stock THEN
        UPDATE public.product_variants
        SET stock = stock - v_qty
        WHERE id = v_variant.id;
      END IF;
    ELSE
      IF v_product.track_stock THEN
        UPDATE public.products
        SET stock = stock - v_qty
        WHERE id = v_product.id;
      END IF;
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      unit_price,
      cost_price,
      supplier_id,
      quantity
    )
    VALUES (
      v_order_id,
      v_product.id,
      CASE WHEN (v_item ->> 'variant_id') IS NOT NULL AND btrim(v_item ->> 'variant_id') <> ''
           THEN (v_item ->> 'variant_id')::uuid ELSE NULL END,
      v_item_name,
      v_unit_price,
      v_unit_cost,
      v_product.supplier_id,
      v_qty
    );
  END LOOP;

  -- Increment coupon used_count
  IF v_coupon_code IS NOT NULL THEN
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE code = v_coupon_code;
  END IF;

  -- Insert initial status history row
  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (v_order_id, 'pending', 'Order placed via storefront');

  RETURN v_order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(text, text, text, text, text, jsonb, text, text, text, text, text) TO anon, authenticated;

-- 7.3 Track Order (requires matching BOTH order_number AND phone)
CREATE OR REPLACE FUNCTION public.track_order(
  p_order_number text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
  v_timeline jsonb;
  v_clean_order text := upper(btrim(COALESCE(p_order_number, '')));
  v_clean_phone text := regexp_replace(btrim(COALESCE(p_phone, '')), '\s+', '', 'g');
BEGIN
  IF v_clean_order = '' OR v_clean_phone = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE upper(order_number) = v_clean_order
    AND regexp_replace(btrim(phone), '\s+', '', 'g') = v_clean_phone
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      )
    ),
    '[]'::jsonb
  ) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'status', h.status,
        'note', h.note,
        'created_at', h.created_at
      )
      ORDER BY h.created_at ASC
    ),
    '[]'::jsonb
  ) INTO v_timeline
  FROM public.order_status_history h
  WHERE h.order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'subtotal', v_order.subtotal,
    'discount_amount', v_order.discount_amount,
    'delivery_charge', v_order.delivery_charge,
    'total', v_order.total,
    'district', v_order.district,
    'courier_name', v_order.courier_name,
    'tracking_code', v_order.tracking_code,
    'tracking_url', v_order.tracking_url,
    'created_at', v_order.created_at,
    'items', v_items,
    'timeline', v_timeline
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. REALTIME FOR ORDERS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 9. STORAGE BUCKETS & POLICIES
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('site-assets', 'site-assets', true),
  ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "martbari_storage_public_read" ON storage.objects;
CREATE POLICY "martbari_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('product-images', 'site-assets', 'category-images'));

DROP POLICY IF EXISTS "martbari_storage_staff_insert" ON storage.objects;
CREATE POLICY "martbari_storage_staff_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('product-images', 'site-assets', 'category-images')
    AND public.is_staff()
  );

DROP POLICY IF EXISTS "martbari_storage_staff_update" ON storage.objects;
CREATE POLICY "martbari_storage_staff_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'site-assets', 'category-images')
    AND public.is_staff()
  )
  WITH CHECK (
    bucket_id IN ('product-images', 'site-assets', 'category-images')
    AND public.is_staff()
  );

DROP POLICY IF EXISTS "martbari_storage_staff_delete" ON storage.objects;
CREATE POLICY "martbari_storage_staff_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'site-assets', 'category-images')
    AND public.is_staff()
  );

-- ----------------------------------------------------------------------------
-- 10. SEED DATA (Idempotent via ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------

-- 10.1 Settings (singleton id = 1)
INSERT INTO public.settings (
  id,
  store_name_bn,
  store_name_en,
  phone,
  whatsapp,
  email,
  address_bn,
  address_en,
  facebook_url,
  instagram_url,
  tiktok_url,
  youtube_url,
  delivery_charge_dhaka,
  delivery_charge_outside,
  free_delivery_above,
  bkash_number,
  nagad_number,
  payment_note_bn,
  payment_note_en,
  announcement_bn,
  announcement_en,
  min_order_amount,
  maintenance_mode,
  show_demo_data
)
VALUES (
  1,
  'মার্টবাড়ি',
  'MartBari',
  '+880 1770-501652',
  '8801770501652',
  'martbari.shop@gmail.com',
  'ঢাকা, বাংলাদেশ',
  'Dhaka, Bangladesh',
  'https://facebook.com/martbari',
  'https://instagram.com/martbari',
  'https://tiktok.com/@martbari',
  'https://youtube.com/@martbari',
  70,
  130,
  3000,
  '01770501652',
  '01770501652',
  'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। বিকাশ বা নগদেও পেমেন্ট করতে পারবেন।',
  'Cash on Delivery available all over Bangladesh. bKash and Nagad accepted.',
  '৳৩,০০০+ অর্ডারে ফ্রি ডেলিভারি! সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা।',
  'Free delivery on orders above ৳3,000! Cash on Delivery all over Bangladesh.',
  300,
  false,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 10.2 Categories (6 categories)
INSERT INTO public.categories (name_bn, name_en, slug, image_url, sort_order, is_active, seo_title_bn, seo_title_en)
VALUES
  ('স্মার্ট ওয়াচ', 'Smart Watches', 'smart-watches', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', 1, true, 'স্মার্ট ওয়াচ - মার্টবাড়ি', 'Smart Watches - MartBari'),
  ('হেডফোন', 'Headphones', 'headphones', 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80', 2, true, 'হেডফোন - মার্টবাড়ি', 'Headphones - MartBari'),
  ('ইয়ারবাডস', 'Earbuds', 'earbuds', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80', 3, true, 'ইয়ারবাডস - মার্টবাড়ি', 'Earbuds - MartBari'),
  ('হোম অ্যাপ্লায়েন্স', 'Home Appliances', 'home-appliances', 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800', 4, true, 'হোম অ্যাপ্লায়েন্স - মার্টবাড়ি', 'Home Appliances - MartBari'),
  ('লাইটিং', 'Lighting', 'lighting', 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800', 5, true, 'লাইটিং - মার্টবাড়ি', 'Lighting - MartBari'),
  ('মোবাইল এক্সেসরিজ', 'Mobile Accessories', 'mobile-accessories', 'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80', 6, true, 'মোবাইল এক্সেসরিজ - মার্টবাড়ি', 'Mobile Accessories - MartBari')
ON CONFLICT (slug) DO NOTHING;

-- 10.3 Brands (3 brands)
INSERT INTO public.brands (name, slug, logo_url, is_active)
VALUES
  ('ApexTime', 'apextime', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80', true),
  ('SoundWave', 'soundwave', 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=400&q=80', true),
  ('LuminaHome', 'luminahome', 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=400', true)
ON CONFLICT (slug) DO NOTHING;

-- 10.4 Suppliers (2 dropshipping suppliers)
INSERT INTO public.suppliers (name, phone, whatsapp, email, address, notes, is_active)
SELECT * FROM (
  VALUES
    ('Dhaka Gadget Wholesale', '+8801711000101', '8801711000101', 'wholesale@dhakagadget.example', 'Gulistan Tech Market, Dhaka', 'Primary smartwatch and earbuds supplier', true),
    ('Chattogram Home Tech Hub', '+8801811000202', '8801811000202', 'orders@ctghometech.example', 'Agrabad Commercial Area, Chattogram', 'Home appliances and smart lighting supplier', true)
) AS s(name, phone, whatsapp, email, address, notes, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers existing WHERE existing.name = s.name);

-- 10.5 Products (15 demo electronics products)
WITH
  c_watch AS (SELECT id FROM public.categories WHERE slug = 'smart-watches' LIMIT 1),
  c_head AS (SELECT id FROM public.categories WHERE slug = 'headphones' LIMIT 1),
  c_buds AS (SELECT id FROM public.categories WHERE slug = 'earbuds' LIMIT 1),
  c_home AS (SELECT id FROM public.categories WHERE slug = 'home-appliances' LIMIT 1),
  c_light AS (SELECT id FROM public.categories WHERE slug = 'lighting' LIMIT 1),
  c_acc AS (SELECT id FROM public.categories WHERE slug = 'mobile-accessories' LIMIT 1),
  b_apex AS (SELECT id FROM public.brands WHERE slug = 'apextime' LIMIT 1),
  b_sound AS (SELECT id FROM public.brands WHERE slug = 'soundwave' LIMIT 1),
  b_lumina AS (SELECT id FROM public.brands WHERE slug = 'luminahome' LIMIT 1),
  s_dhaka AS (SELECT id FROM public.suppliers WHERE name = 'Dhaka Gadget Wholesale' LIMIT 1),
  s_ctg AS (SELECT id FROM public.suppliers WHERE name = 'Chattogram Home Tech Hub' LIMIT 1)
INSERT INTO public.products (
  name_bn, name_en, slug, short_desc_bn, short_desc_en, description_bn, description_en,
  specifications, price, sale_price, cost_price, stock, sku, brand_id, category_id,
  warranty_bn, warranty_en, weight_grams, is_active, is_featured, is_new,
  supplier_id, supplier_sku, supplier_price, estimated_delivery_days
)
VALUES
  (
    'এপেক্সটাইম প্রো অ্যামোলেড স্মার্ট ওয়াচ', 'ApexTime Pro AMOLED Smart Watch', 'apextime-pro-amoled-watch',
    '১.৪৩" অ্যামোলেড ডিসপ্লে ও ব্লুটুথ কলিং সুবিধা', '1.43" AMOLED display with Bluetooth calling & 7-day battery',
    'দৈনন্দিন ফিটনেস ট্র্যাকিং, হার্ট রেট মনিটর, IP68 ওয়াটার রেজিস্ট্যান্স এবং স্পষ্ট অ্যামোলেড স্ক্রিন সহ স্মার্টওয়াচ।',
    'Built with a vibrant 1.43-inch AMOLED display, Bluetooth calling, SpO2 & heart-rate monitoring, and IP68 water resistance.',
    '[{"key_bn":"ডিসপ্লে","key_en":"Display","value_bn":"১.৪৩ ইঞ্চি অ্যামোলেড","value_en":"1.43-inch AMOLED"},{"key_bn":"ব্যাটারি","key_en":"Battery","value_bn":"৭ দিন","value_en":"7 Days"}]'::jsonb,
    3490, 2990, 2050, 25, 'MB-SW-001', (SELECT id FROM b_apex), (SELECT id FROM c_watch),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 160, true, true, true,
    (SELECT id FROM s_dhaka), 'SUP-SW-101', 1950, 2
  ),
  (
    'এপেক্সটাইম আল্ট্রা ফিটনেস ওয়াচ', 'ApexTime Ultra Fitness Watch', 'apextime-ultra-fitness-watch',
    'স্পোর্টস মোড ও দীর্ঘস্থায়ী ব্যাটারি ব্যাকআপ', 'Rugged titanium-style bezel with 100+ sports modes',
    'অ্যাক্টিভ লাইফস্টাইলের জন্য উপযোগী মাল্টি-স্পোর্টস স্মার্টওয়াচ, স্লিপ ট্র্যাকিং ও ফাস্ট চার্জিং সাপোর্ট।',
    'Designed for active users with 100+ workout modes, sleep analytics, and magnetic fast charging.',
    '[{"key_bn":"ওয়াটারপ্রুফ","key_en":"Water Resistance","value_bn":"IP68","value_en":"IP68"}]'::jsonb,
    2850, 2490, 1680, 30, 'MB-SW-002', (SELECT id FROM b_apex), (SELECT id FROM c_watch),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 180, true, false, true,
    (SELECT id FROM s_dhaka), 'SUP-SW-102', 1600, 2
  ),
  (
    'এপেক্সটাইম লাইট স্লিম স্মার্ট ওয়াচ', 'ApexTime Lite Slim Watch', 'apextime-lite-slim-watch',
    'হালকা ওজন ও সহজ বাংলা নোটিফিকেশন সাপোর্ট', 'Featherweight everyday watch with clear notifications',
    'হালকা ডিজাইন, সারাদিনের স্টেপ কাউন্টার ও স্মার্টফোন নোটিফিকেশন এলার্ট সহ নির্ভরযোগ্য ঘড়ি।',
    'Lightweight daily smartwatch featuring step tracking, call alerts, and up to 10 days standby.',
    '[{"key_bn":"ওজন","key_en":"Weight","value_bn":"৩৪ গ্রাম","value_en":"34g"}]'::jsonb,
    1890, NULL, 1150, 40, 'MB-SW-003', (SELECT id FROM b_apex), (SELECT id FROM c_watch),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 120, true, false, false,
    (SELECT id FROM s_dhaka), 'SUP-SW-103', 1100, 3
  ),
  (
    'সাউন্ডওয়েভ এএনসি স্টুডিও হেডফোন', 'SoundWave ANC Studio Headphones', 'soundwave-anc-studio-headphones',
    'অ্যাক্টিভ নয়েজ ক্যান্সেলেশন ও ৪০ ঘণ্টা প্লেটাইম', 'Hybrid Active Noise Cancellation with 40H battery life',
    'ডিপ বেস, সফট মেমোরি-ফোম ইয়ারকাপ এবং ইউএসবি-সি ফাস্ট চার্জিং সহ প্রিমিয়াম ওয়্যারলেস হেডফোন।',
    'Over-ear wireless headphones with hybrid ANC, plush memory foam earcups, and USB-C fast charging.',
    '[{"key_bn":"ব্লুটুথ","key_en":"Bluetooth","value_bn":"৫.৩","value_en":"5.3"},{"key_bn":"প্লেটাইম","key_en":"Playtime","value_bn":"৪০ ঘণ্টা","value_en":"40 Hours"}]'::jsonb,
    4490, 3890, 2650, 18, 'MB-HP-001', (SELECT id FROM b_sound), (SELECT id FROM c_head),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 320, true, true, true,
    (SELECT id FROM s_dhaka), 'SUP-HP-201', 2550, 2
  ),
  (
    'সাউন্ডওয়েভ বেস প্রো ওয়্যারলেস হেডফোন', 'SoundWave Bass Pro Wireless', 'soundwave-bass-pro-wireless',
    'ফোল্ডেবল ডিজাইন ও ক্লিয়ার কল মাইক্রোফোন', 'Foldable wireless headset with dual-device pairing',
    'ক্লাস, মিটিং ও মিউজিকের জন্য আরামদায়ক হেডফোন। তারযুক্ত ও ওয়্যারলেস দুই মোডেই ব্যবহারযোগ্য।',
    'Dual-mode wired and Bluetooth headset ideal for online classes, work calls, and daily travel.',
    '[{"key_bn":"ড্রাইভার","key_en":"Driver","value_bn":"৪০ মিমি","value_en":"40mm Dynamic"}]'::jsonb,
    2250, 1950, 1320, 28, 'MB-HP-002', (SELECT id FROM b_sound), (SELECT id FROM c_head),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 260, true, false, false,
    (SELECT id FROM s_dhaka), 'SUP-HP-202', 1250, 3
  ),
  (
    'সাউন্ডওয়েভ পডস প্রো ইয়ারবাডস', 'SoundWave Pods Pro Earbuds', 'soundwave-pods-pro-earbuds',
    'ইএনসি কোয়াড মাইক ও ৩০ ঘণ্টা কেস ব্যাকআপ', 'Quad-mic ENC call clarity & 30-hour charging case',
    'পরিষ্কার ভয়েস কল, লো-ল্যাটেন্সি গেমিং মোড এবং IPX5 স্প্ল্যাশ রেজিস্ট্যান্স সহ ট্রু ওয়্যারলেস ইয়ারবাডস।',
    'True wireless earbuds delivering crisp ENC calls, low-latency gaming mode, and IPX5 sweat protection.',
    '[{"key_bn":"চার্জিং পোর্ট","key_en":"Charging Port","value_bn":"ইউএসবি টাইপ-সি","value_en":"USB Type-C"}]'::jsonb,
    1790, 1490, 920, 50, 'MB-EB-001', (SELECT id FROM b_sound), (SELECT id FROM c_buds),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 95, true, true, true,
    (SELECT id FROM s_dhaka), 'SUP-EB-301', 880, 2
  ),
  (
    'সাউন্ডওয়েভ মিনি এয়ার বাডস', 'SoundWave Mini Air Buds', 'soundwave-mini-air-buds',
    'কম্প্যাক্ট পকেট কেস ও টাচ কন্ট্রোল', 'Pocket-friendly case with instant auto-pairing',
    'দৈনন্দিন যাতায়াতের জন্য ছোট ও আরামদায়ক ইয়ারবাডস, টাচ সেন্সর ও ফাস্ট পেয়ারিং সহ।',
    'Ultra-compact earbuds with tactile touch controls and reliable Bluetooth 5.3 connection.',
    '[{"key_bn":"ব্যাটারি","key_en":"Battery","value_bn":"২৪ ঘণ্টা","value_en":"24 Hours"}]'::jsonb,
    1150, 990, 620, 65, 'MB-EB-002', (SELECT id FROM b_sound), (SELECT id FROM c_buds),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 80, true, false, false,
    (SELECT id FROM s_dhaka), 'SUP-EB-302', 590, 2
  ),
  (
    'সাউন্ডওয়েভ গেমিং লো-ল্যাটেন্সি বাডস', 'SoundWave Gaming Buds X', 'soundwave-gaming-buds-x',
    '৪৫ms আল্ট্রা লো-ল্যাটেন্সি গেমিং মোড', '45ms ultra-low latency mode for mobile gaming',
    'মোবাইল গেমারদের জন্য নিখুঁত সাউন্ড সিঙ্ক ও ডুয়াল মোড ইয়ারবাডস।',
    'Tuned for mobile esports with 45ms low-latency audio sync and crisp spatial footsteps.',
    '[{"key_bn":"ল্যাটেন্সি","key_en":"Latency","value_bn":"৪৫ মিলিসেকেন্ড","value_en":"45ms"}]'::jsonb,
    1550, NULL, 940, 35, 'MB-EB-003', (SELECT id FROM b_sound), (SELECT id FROM c_buds),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 105, true, false, true,
    (SELECT id FROM s_dhaka), 'SUP-EB-303', 900, 3
  ),
  (
    'লুমিনাহোম ডিজিটাল ইলেকট্রিক কেটলি', 'LuminaHome Digital Smart Kettle', 'luminahome-digital-smart-kettle',
    'টেম্পারেচার কন্ট্রোল ও ফুড-গ্রেড স্টেইনলেস স্টিল', 'Precision temperature control & 304 stainless steel body',
    '১.৫ লিটার ক্যাপাসিটি, ডিজিটাল এলইডি ডিসপ্লে ও অটো শাট-অফ নিরাপত্তা সহ আধুনিক ইলেকট্রিক কেটলি।',
    '1.5L electric kettle with real-time LED temperature readout, keep-warm mode, and boil-dry protection.',
    '[{"key_bn":"ধারণক্ষমতা","key_en":"Capacity","value_bn":"১.৫ লিটার","value_en":"1.5 Liters"},{"key_bn":"পাওয়ার","key_en":"Power","value_bn":"১৫০০ ওয়াট","value_en":"1500W"}]'::jsonb,
    2950, 2590, 1780, 22, 'MB-HA-001', (SELECT id FROM b_lumina), (SELECT id FROM c_home),
    '১ বছরের ওয়ারেন্টি', '1 Year Warranty', 1150, true, true, true,
    (SELECT id FROM s_ctg), 'SUP-HA-401', 1700, 3
  ),
  (
    'লুমিনাহোম পোর্টেবল রিচার্জেবল ব্লেন্ডার', 'LuminaHome Portable USB Blender', 'luminahome-portable-usb-blender',
    '৬ ব্লেড ও টাইপ-সি চার্জিং জুসার', '6-blade stainless cutter for smoothies anywhere',
    'ফ্রেশ জুস ও স্মুদি তৈরির জন্য ৩৮০ মিলি পোর্টেবল রিচার্জেবল ব্লেন্ডার।',
    '380ml BPA-free travel blender powered by USB-C rechargeable battery for instant shakes.',
    '[{"key_bn":"ব্লেড","key_en":"Blades","value_bn":"৬টি স্টিল ব্লেড","value_en":"6 Steel Blades"}]'::jsonb,
    1390, 1190, 740, 42, 'MB-HA-002', (SELECT id FROM b_lumina), (SELECT id FROM c_home),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 480, true, false, false,
    (SELECT id FROM s_ctg), 'SUP-HA-402', 700, 3
  ),
  (
    'লুমিনাহোম মিনি ডেস্ক এয়ার কুলার ফ্যান', 'LuminaHome Mist Desk Fan', 'luminahome-mist-desk-fan',
    'রিচার্জেবল মিস্ট কুলিং ও ৩ স্পিড মোড', '3-speed quiet desk fan with cooling mist tank',
    'গরমে আরামদায়ক বাতাস ও হালকা মিস্ট কুলিং সুবিধা, লো-নয়েজ মোটর সহ।',
    'Whisper-quiet personal cooling fan with 3 airflow levels and built-in rechargeable battery.',
    '[{"key_bn":"স্পিড","key_en":"Speed Levels","value_bn":"৩টি","value_en":"3 Levels"}]'::jsonb,
    1650, NULL, 980, 27, 'MB-HA-003', (SELECT id FROM b_lumina), (SELECT id FROM c_home),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 650, true, false, false,
    (SELECT id FROM s_ctg), 'SUP-HA-403', 930, 3
  ),
  (
    'লুমিনাহোম আই-কেয়ার এলইডি ডেস্ক ল্যাম্প', 'LuminaHome Eye-Care Desk Lamp', 'luminahome-eyecare-desk-lamp',
    'টাচ ডিমিং ও ৩টি কালার টেম্পারেচার মোড', 'Flicker-free reading lamp with stepless touch dimming',
    'পড়াশোনা ও অফিস ডেস্কের জন্য চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি টেবিল ল্যাম্প, রিচার্জেবল ব্যাকআপ সহ।',
    'Architect-style foldable LED desk lamp offering warm, neutral, and daylight modes with USB backup.',
    '[{"key_bn":"মোড","key_en":"Light Modes","value_bn":"৩টি কালার","value_en":"3 Color Temps"}]'::jsonb,
    1490, 1290, 810, 33, 'MB-LT-001', (SELECT id FROM b_lumina), (SELECT id FROM c_light),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 520, true, true, false,
    (SELECT id FROM s_ctg), 'SUP-LT-501', 760, 3
  ),
  (
    'লুমিনাহোম মোশন সেন্সর ওয়্যারলেস লাইট', 'LuminaHome Motion Sensor Bar Light', 'luminahome-motion-sensor-light',
    'ম্যাগনেটিক মাউন্ট ও অটো মোশন ডিটেকশন', 'Magnetic under-cabinet USB rechargeable sensor light',
    'ওয়ার্ডরোব, রান্নাঘর বা সিঁড়ির জন্য অটো মোশন সেন্সর রিচার্জেবল এলইডি লাইট।',
    'Installs in seconds with magnetic adhesive strips and lights up automatically on motion detection.',
    '[{"key_bn":"দৈর্ঘ্য","key_en":"Length","value_bn":"৩০ সেমি","value_en":"30 cm"}]'::jsonb,
    750, 650, 380, 60, 'MB-LT-002', (SELECT id FROM b_lumina), (SELECT id FROM c_light),
    '৩ মাসের ওয়ারেন্টি', '3 Months Warranty', 190, true, false, true,
    (SELECT id FROM s_ctg), 'SUP-LT-502', 350, 3
  ),
  (
    'এপেক্সটাইম ১০,০০০ এমএএইচ ফাস্ট পাওয়ার ব্যাংক', 'ApexTime 10000mAh 22.5W Power Bank', 'apextime-10000mah-power-bank',
    '২২.৫ ওয়াট পিডি ফাস্ট চার্জিং ও ডিজিটাল ডিসপ্লে', '22.5W PD fast charging with LED percentage readout',
    'স্লিম পকেট-সাইজ পাওয়ার ব্যাংক, টাইপ-সি ও ডুয়াল ইউএসবি আউটপুট সহ।',
    'Compact 10000mAh power bank supporting 22.5W PD/QC fast charging for phones and accessories.',
    '[{"key_bn":"ক্ষমতা","key_en":"Capacity","value_bn":"১০,০০০ mAh","value_en":"10000mAh"}]'::jsonb,
    1590, 1390, 910, 45, 'MB-MA-001', (SELECT id FROM b_apex), (SELECT id FROM c_acc),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 240, true, true, false,
    (SELECT id FROM s_dhaka), 'SUP-MA-601', 860, 2
  ),
  (
    'এপেক্সটাইম ৩৩ ওয়াট গাণ ফাস্ট চার্জার ও কেবল', 'ApexTime 33W GaN Fast Charger Kit', 'apextime-33w-gan-charger-kit',
    'ইউএসবি-সি + ইউএসবি-এ ডুয়াল পোর্ট ও ব্রেইডেড কেবল', 'Dual-port 33W GaN adapter with 1.5m braided USB-C cable',
    'স্মার্টফোন, ট্যাবলেট ও ইয়ারবাডসের নিরাপদ ও দ্রুত চার্জিংয়ের জন্য কমপ্যাক্ট GaN চার্জার।',
    'Cool-running 33W GaN wall charger with dual USB-C & USB-A outputs plus durable braided cable.',
    '[{"key_bn":"আউটপুট","key_en":"Output","value_bn":"৩৩ ওয়াট","value_en":"33W Max"}]'::jsonb,
    890, 790, 470, 55, 'MB-MA-002', (SELECT id FROM b_apex), (SELECT id FROM c_acc),
    '৬ মাসের ওয়ারেন্টি', '6 Months Warranty', 130, true, false, true,
    (SELECT id FROM s_dhaka), 'SUP-MA-602', 440, 2
  )
ON CONFLICT (slug) DO NOTHING;

-- 10.6 Product Images (linked to verified external stock photos)
WITH demo_gallery(slug, sort_order, image_url) AS (
  VALUES
    ('apextime-pro-amoled-watch', 0, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'),
    ('apextime-pro-amoled-watch', 1, 'https://images.pexels.com/photos/5081914/pexels-photo-5081914.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-pro-amoled-watch', 2, 'https://images.pexels.com/photos/9528216/pexels-photo-9528216.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-ultra-fitness-watch', 0, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80'),
    ('apextime-ultra-fitness-watch', 1, 'https://images.pexels.com/photos/9584702/pexels-photo-9584702.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-lite-slim-watch', 0, 'https://images.unsplash.com/photo-1503327431567-3ab5e6e79140?auto=format&fit=crop&w=800&q=80'),
    ('apextime-lite-slim-watch', 1, 'https://images.pexels.com/photos/5237704/pexels-photo-5237704.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-anc-studio-headphones', 0, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-anc-studio-headphones', 1, 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-bass-pro-wireless', 0, 'https://images.unsplash.com/photo-1520170350707-b2da59970118?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-bass-pro-wireless', 1, 'https://images.unsplash.com/photo-1597859359746-f6efe49ce11a?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-pods-pro-earbuds', 0, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-pods-pro-earbuds', 1, 'https://images.pexels.com/photos/8553999/pexels-photo-8553999.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-mini-air-buds', 0, 'https://images.unsplash.com/photo-1525825691042-e14d9042fc70?auto=format&fit=crop&w=800&q=80'),
    ('soundwave-mini-air-buds', 1, 'https://images.pexels.com/photos/13387311/pexels-photo-13387311.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-gaming-buds-x', 0, 'https://images.pexels.com/photos/10104890/pexels-photo-10104890.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('soundwave-gaming-buds-x', 1, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-digital-smart-kettle', 0, 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-digital-smart-kettle', 1, 'https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-portable-usb-blender', 0, 'https://images.unsplash.com/photo-1500388953054-0d94398c7bf1?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-portable-usb-blender', 1, 'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-mist-desk-fan', 0, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-mist-desk-fan', 1, 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-eyecare-desk-lamp', 0, 'https://images.pexels.com/photos/19240055/pexels-photo-19240055/free-photo-of-vignette-image-of-a-lamp-on-a-desk.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-eyecare-desk-lamp', 1, 'https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('luminahome-motion-sensor-light', 0, 'https://plus.unsplash.com/premium_photo-1681412205156-bb506a4ea970?auto=format&fit=crop&w=800&q=80'),
    ('luminahome-motion-sensor-light', 1, 'https://plus.unsplash.com/premium_photo-1668005190411-1042cd38522e?auto=format&fit=crop&w=800&q=80'),
    ('apextime-10000mah-power-bank', 0, 'https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=800&q=80'),
    ('apextime-10000mah-power-bank', 1, 'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800'),
    ('apextime-33w-gan-charger-kit', 0, 'https://images.unsplash.com/photo-1600490722773-35753aea6332?auto=format&fit=crop&w=800&q=80'),
    ('apextime-33w-gan-charger-kit', 1, 'https://images.pexels.com/photos/4072683/pexels-photo-4072683.jpeg?auto=compress&cs=tinysrgb&w=800')
)
INSERT INTO public.product_images (product_id, image_url, alt_bn, alt_en, sort_order)
SELECT p.id, g.image_url, p.name_bn, p.name_en, g.sort_order
FROM demo_gallery g
JOIN public.products p ON p.slug = g.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id
);

-- 10.7 Sample Product Variants (for select flagship products)
INSERT INTO public.product_variants (product_id, name_bn, name_en, sku, price_override, cost_override, stock, is_active)
SELECT p.id, 'ম্যাট ব্ল্যাক', 'Matte Black', p.sku || '-BLK', NULL, NULL, 15, true
FROM public.products p
WHERE p.sku IN ('MB-SW-001', 'MB-HP-001', 'MB-EB-001')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.sku = p.sku || '-BLK'
  );

INSERT INTO public.product_variants (product_id, name_bn, name_en, sku, price_override, cost_override, stock, is_active)
SELECT p.id, 'সিলভার মিস্ট', 'Silver Mist', p.sku || '-SLV', NULL, NULL, 10, true
FROM public.products p
WHERE p.sku IN ('MB-SW-001', 'MB-HP-001')
  AND NOT EXISTS (
    SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id AND pv.sku = p.sku || '-SLV'
  );

-- 10.8 Banners (5 verified hero banners)
INSERT INTO public.banners (image_url, title_bn, title_en, link_url, sort_order, is_active)
SELECT * FROM (
  VALUES
    ('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=85', 'অ্যামোলেড স্মার্ট ওয়াচ ও ফিটনেস ট্র্যাকার', 'AMOLED Smart Watches Built for Everyday Life', '/category/smart-watches', 1, true),
    ('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=85', 'স্টুডিও এএনসি হেডফোন ও ওয়্যারলেস ইয়ারবাডস', 'Crystal-Clear Audio with Hybrid Noise Cancellation', '/category/headphones', 2, true),
    ('https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=1600', 'আধুনিক হোম ও কিচেন অ্যাপ্লায়েন্স', 'Smart Home & Kitchen Essentials Delivered Fast', '/category/home-appliances', 3, true),
    ('https://images.pexels.com/photos/8369211/pexels-photo-8369211.jpeg?auto=compress&cs=tinysrgb&w=1600', 'চোখের আরামদায়ক ফ্লিকার-ফ্রি এলইডি লাইটিং', 'Minimal LED Desk Lamps & Motion Sensor Lights', '/category/lighting', 4, true),
    ('https://images.unsplash.com/photo-1566554738544-d962991c3fee?auto=format&fit=crop&w=1600&q=85', 'ফাস্ট পাওয়ার ব্যাংক ও গাণ চার্জার কিট', '22.5W Power Banks & Compact GaN Chargers', '/category/mobile-accessories', 5, true)
) AS b(image_url, title_bn, title_en, link_url, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.banners existing WHERE existing.link_url = b.link_url);

-- 10.9 Pages (4 content pages)
INSERT INTO public.pages (slug, title_bn, title_en, content_bn, content_en, is_active)
VALUES
  (
    'about',
    'আমাদের সম্পর্কে',
    'About MartBari',
    'মার্টবাড়ি বাংলাদেশের একটি বিশ্বস্ত অনলাইন ইলেকট্রনিক্স ও হোম অ্যাপ্লায়েন্স স্টোর। আমরা সেরা মানের স্মার্ট ওয়াচ, ইয়ারবাডস, হেডফোন এবং ঘরোয়া স্মার্ট পণ্য সারা বাংলাদেশে দ্রুত ক্যাশ অন ডেলিভারিতে পৌঁছে দিই।',
    'MartBari is your trusted online electronics, gadgets, and home appliances destination in Bangladesh. We curate reliable daily tech with transparent pricing and nationwide Cash on Delivery.',
    true
  ),
  (
    'return-policy',
    'রিটার্ন ও রিফান্ড নীতিমালা',
    'Return & Refund Policy',
    'ডেলিভারি গ্রহণের ৭ দিনের মধ্যে কোনো উৎপাদনজনিত ত্রুটি থাকলে পণ্য রিটার্ন বা পরিবর্তন করা যাবে। পণ্যটি অবশ্যই অক্ষত অবস্থায় ও আসল প্যাকেজিং সহ থাকতে হবে।',
    'Products with manufacturing defects or transit damage may be returned or replaced within 7 days of delivery, provided original packaging and accessories remain intact.',
    true
  ),
  (
    'privacy-policy',
    'গোপনীয়তা নীতি',
    'Privacy Policy',
    'আপনার নাম, ফোন নম্বর এবং ডেলিভারি ঠিকানা শুধুমাত্র অর্ডার প্রক্রিয়াকরণ ও কুরিয়ার ডেলিভারির জন্য ব্যবহার করা হয়। আমরা তৃতীয় পক্ষের কাছে ব্যক্তিগত তথ্য বিক্রি করি না।',
    'Your name, phone number, and delivery address are used strictly for order fulfillment, tracking, and customer support. We never sell personal customer information.',
    true
  ),
  (
    'terms',
    'শর্তাবলী',
    'Terms & Conditions',
    'মার্টবাড়ি থেকে অর্ডার করার মাধ্যমে আপনি আমাদের ডেলিভারি সময়সীমা, পেমেন্ট নিয়মাবলী এবং ওয়ারেন্টি শর্তাবলীতে সম্মতি প্রদান করছেন।',
    'By placing an order with MartBari, you agree to our standard delivery timelines, Cash on Delivery verification rules, and brand warranty terms.',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- 10.10 Coupons (WELCOME10 & FREESHIP)
INSERT INTO public.coupons (code, type, value, min_order_amount, max_discount, usage_limit, is_active)
VALUES
  ('WELCOME10', 'percent', 10, 500, 500, 1000, true),
  ('FREESHIP', 'fixed', 130, 1000, 130, 1000, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- HOW TO MAKE YOUR ACCOUNT AN ADMIN AFTER SIGNING UP:
-- 1. Sign up via Supabase Auth (Authentication -> Users) or the app login page.
-- 2. Run the following query in the Supabase SQL Editor (replace the email):
--
-- UPDATE public.profiles
-- SET role = 'admin', is_active = true
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'martbari.shop@gmail.com' LIMIT 1
-- );
-- ============================================================================

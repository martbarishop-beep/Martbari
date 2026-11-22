export type UserRole = 'customer' | 'admin' | 'manager' | 'staff';

export type PaymentMethod = 'cod' | 'bkash' | 'nagad';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'ordered_from_supplier'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';
export type OrderSource = 'website' | 'facebook' | 'whatsapp' | 'phone';
export type SupplierOrderStatus = 'not_ordered' | 'ordered' | 'received' | 'failed';
export type CouponType = 'percent' | 'fixed';

export interface ProductSpecification {
  key_bn: string;
  key_en: string;
  value_bn: string;
  value_en: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title_bn: string | null;
  seo_title_en: string | null;
  seo_desc_bn: string | null;
  seo_desc_en: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PublicProduct {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  short_desc_bn: string | null;
  short_desc_en: string | null;
  description_bn: string | null;
  description_en: string | null;
  specifications: ProductSpecification[];
  price: number;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock: number;
  low_stock_threshold: number;
  sku: string;
  barcode: string | null;
  brand_id: string | null;
  category_id: string | null;
  warranty_bn: string | null;
  warranty_en: string | null;
  weight_grams: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  track_stock: boolean;
  seo_title_bn: string | null;
  seo_title_en: string | null;
  seo_desc_bn: string | null;
  seo_desc_en: string | null;
  estimated_delivery_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Product extends PublicProduct {
  cost_price: number;
  supplier_id: string | null;
  supplier_product_url: string | null;
  supplier_sku: string | null;
  supplier_price: number | null;
}

export interface PublicProductVariant {
  id: string;
  product_id: string;
  name_bn: string;
  name_en: string;
  sku: string | null;
  price_override: number | null;
  stock: number;
  image_url: string | null;
  is_active: boolean;
}

export interface ProductVariant extends PublicProductVariant {
  cost_override: number | null;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_bn: string | null;
  alt_en: string | null;
  sort_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  default_address: string | null;
  district: string | null;
  total_orders: number;
  total_spent: number;
  is_blocked: boolean;
  block_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string;
  district: string;
  delivery_charge: number;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_sender_number: string | null;
  payment_trx_id: string | null;
  status: OrderStatus;
  courier_name: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  source: OrderSource;
  customer_note: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  unit_price: number;
  cost_price: number;
  supplier_id: string | null;
  supplier_order_status: SupplierOrderStatus;
  supplier_order_ref: string | null;
  quantity: number;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  image_url: string;
  title_bn: string | null;
  title_en: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PageContent {
  id: string;
  slug: string;
  title_bn: string;
  title_en: string;
  content_bn: string | null;
  content_en: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface StoreSettings {
  id: number;
  store_name_bn: string;
  store_name_en: string;
  logo_url: string | null;
  favicon_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address_bn: string | null;
  address_en: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  delivery_charge_dhaka: number;
  delivery_charge_outside: number;
  free_delivery_above: number | null;
  bkash_number: string | null;
  nagad_number: string | null;
  payment_note_bn: string | null;
  payment_note_en: string | null;
  announcement_bn: string | null;
  announcement_en: string | null;
  facebook_pixel_id: string | null;
  google_analytics_id: string | null;
  min_order_amount: number | null;
  maintenance_mode: boolean;
  show_demo_data?: boolean;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface TrackedOrderResult {
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  delivery_charge: number;
  total: number;
  district: string;
  courier_name: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  timeline: Array<{
    status: string;
    note: string | null;
    created_at: string;
  }>;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  type?: CouponType;
  value?: number;
  discount_amount: number;
  reason?: string;
  min_order_amount?: number;
}

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  User,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { isNonNegativeNumber, isValidBdPhone, normalizeBdPhone } from '../../lib/validation';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Product, ProductVariant, Customer, OrderSource, PaymentMethod, Courier } from '../../types/database';

interface OrderItemDraft {
  productId: string;
  variantId: string | null;
  productName: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  supplierId: string | null;
}

export const AdminOrderCreatePage: React.FC = () => {
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { adminLang, at, tAdminField, formatAdminPrice } = useAdminLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  // Customer Form
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isCustomerBlocked, setIsCustomerBlocked] = useState(false);

  // Order Details
  const [source, setSource] = useState<OrderSource>('manual');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(60);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [adminNote, setAdminNote] = useState('');
  const [isTestOrder, setIsTestOrder] = useState(false);

  // Selected Items
  const [items, setItems] = useState<OrderItemDraft[]>([]);

  // Product Search / Selector
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [addQty, setAddQty] = useState(1);

  // Fetch product catalog and couriers for selection
  useEffect(() => {
    const fetchCatalog = async () => {
      if (!supabase) return;
      try {
        const [pRes, vRes, cRes] = await Promise.all([
          supabase.from('products').select('*').eq('is_active', true).order('name_en'),
          supabase.from('product_variants').select('*').eq('is_active', true),
          supabase.from('couriers').select('*').eq('is_active', true).order('name'),
        ]);
        setProducts((pRes.data || []) as Product[]);
        setVariants((vRes.data || []) as ProductVariant[]);
        if (!cRes.error && cRes.data) {
          setCouriers(cRes.data as Courier[]);
        }
      } catch (err: unknown) {
        showToast({ type: 'error', title: 'Failed to load catalog', description: (err as Error)?.message });
      } finally {
        setLoading(false);
      }
    };
    void fetchCatalog();
  }, []);

  const computeAutoDeliveryCharge = (dist: string, courierId: string) => {
    const isDhaka = dist.toLowerCase() === 'dhaka';
    const courier = couriers.find((c) => c.id === courierId);
    if (courier) {
      return isDhaka ? courier.default_charge_dhaka : courier.default_charge_outside;
    }
    return isDhaka ? 60 : 120;
  };

  // Update delivery charge automatically based on District
  const handleDistrictChange = (d: string) => {
    setDistrict(d);
    setDeliveryCharge(computeAutoDeliveryCharge(d, selectedCourierId));
  };

  const handleCourierChange = (courierId: string) => {
    setSelectedCourierId(courierId);
    setDeliveryCharge(computeAutoDeliveryCharge(district, courierId));
  };

  // Lookup customer automatically by phone (debounced)
  useEffect(() => {
    const client = supabase;
    const normalized = normalizeBdPhone(phone);
    if (!normalized || normalized.length < 11 || !client) return;

    const timer = setTimeout(async () => {
      const { data } = await client
        .from('customers')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle();

      if (data) {
        const c = data as Customer;
        setCustomerName(c.name);
        if (c.default_address) setAddress(c.default_address);
        if (c.district) handleDistrictChange(c.district);
        if (c.email) setCustomerEmail(c.email);
        setIsCustomerBlocked(c.is_blocked);
        if (c.is_blocked) {
          showToast({
            type: 'error',
            title: 'Customer is Blocked',
            description: `Reason: ${c.block_reason || 'Previous delivery fraud'}`,
          });
        } else {
          showToast({
            type: 'info',
            title: 'Repeat Customer Found',
            description: `${c.name} (${c.total_orders} previous orders)`,
          });
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone]);

  // Add Item to draft
  const handleAddItem = () => {
    if (!selectedProductId) return;
    const p = products.find((prod) => prod.id === selectedProductId);
    if (!p) return;

    let price = p.sale_price ?? p.price;
    let cost = p.cost_price;
    let name = p.name_en;

    if (selectedVariantId) {
      const v = variants.find((variant) => variant.id === selectedVariantId);
      if (v) {
        name = `${p.name_en} - ${v.name_en}`;
        if (v.price_override) price = v.price_override;
        if (v.cost_override) cost = v.cost_override;
      }
    }

    setItems((prev) => [
      ...prev,
      {
        productId: p.id,
        variantId: selectedVariantId || null,
        productName: name,
        unitPrice: price,
        costPrice: cost,
        quantity: addQty,
        supplierId: p.supplier_id,
      },
    ]);

    setSelectedProductId('');
    setSelectedVariantId('');
    setAddQty(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(0, subtotal + deliveryCharge - discountAmount);

  // Submit Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const normalizedPhone = normalizeBdPhone(phone);

    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'কাস্টমারের নাম, ফোন ও ঠিকানা প্রয়োজন' : 'Customer name, phone, and delivery address are required',
      });
      return;
    }

    if (!isValidBdPhone(phone)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'সঠিক ১১ সংখ্যার ফোন নম্বর দিন (01XXXXXXXXX)' : 'Enter a valid 11-digit Bangladesh phone number (01XXXXXXXXX)',
      });
      return;
    }

    if (!isNonNegativeNumber(deliveryCharge) || !isNonNegativeNumber(discountAmount)) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'ডেলিভারি চার্জ এবং ডিসকাউন্ট ০ বা তার বেশি হতে হবে' : 'Delivery charge and discount must be 0 or greater',
      });
      return;
    }

    if (items.length === 0) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অন্তত একটি পণ্য যোগ করুন' : 'Please add at least one product to the order',
      });
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = `MB-${Date.now().toString().slice(-6)}`;
      const selectedCourier = couriers.find((c) => c.id === selectedCourierId) || null;

      // 1. Create or update customer record
      let customerId: string | null = null;
      const { data: custData } = await supabase
        .from('customers')
        .select('id, total_orders, total_spent')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (custData) {
        customerId = custData.id;
        if (!isTestOrder) {
          await supabase
            .from('customers')
            .update({
              name: customerName.trim(),
              default_address: address.trim(),
              district,
              total_orders: (custData.total_orders || 0) + 1,
              total_spent: (custData.total_spent || 0) + total,
            })
            .eq('id', custData.id);
        }
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            name: customerName.trim(),
            phone: normalizedPhone,
            email: customerEmail.trim() || null,
            default_address: address.trim(),
            district,
            total_orders: isTestOrder ? 0 : 1,
            total_spent: isTestOrder ? 0 : total,
          })
          .select('id')
          .single();
        if (newCust) customerId = newCust.id;
      }

      // 2. Insert into orders table
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          customer_name: customerName.trim(),
          phone: normalizedPhone,
          email: customerEmail.trim() || null,
          address: address.trim(),
          district,
          delivery_charge: deliveryCharge,
          delivery_charge_charged: deliveryCharge,
          courier_id: selectedCourier?.id || null,
          courier_name: selectedCourier?.name || null,
          subtotal,
          discount_amount: discountAmount,
          total,
          cod_amount: paymentMethod === 'cod' ? total : 0,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'advance' ? 'paid' : 'unpaid',
          status: 'confirmed',
          source,
          customer_note: customerNote.trim() || null,
          admin_note: adminNote.trim() || null,
          is_test: isTestOrder,
        })
        .select('id')
        .single();

      if (orderErr) throw orderErr;

      // 3. Insert into order_items
      const itemInserts = items.map((it) => ({
        order_id: orderData.id,
        product_id: it.productId,
        variant_id: it.variantId,
        product_name: it.productName,
        unit_price: it.unitPrice,
        selling_price: it.unitPrice,
        cost_price: it.costPrice,
        quantity: it.quantity,
        supplier_id: it.supplierId,
        supplier_order_status: 'not_ordered',
        is_test: isTestOrder,
      }));
      await supabase.from('order_items').insert(itemInserts);

      // 4. Insert status history
      await supabase.from('order_status_history').insert({
        order_id: orderData.id,
        status: 'confirmed',
        note: `Manual order created via ${source.toUpperCase()} by staff${isTestOrder ? ' (TEST)' : ''}`,
        changed_by: user?.id || null,
      });

      // 5. Decrement product stock (skip for test orders)
      if (!isTestOrder) {
        for (const it of items) {
          const p = products.find((prod) => prod.id === it.productId);
          if (p) {
            const newStock = Math.max(0, p.stock - it.quantity);
            await supabase.from('products').update({ stock: newStock }).eq('id', p.id);
          }
        }
      }

      await logActivity('CREATE_MANUAL_ORDER', 'orders', orderData.id, {
        order_number: orderNumber,
        total,
        is_test: isTestOrder,
      });

      showToast({
        type: 'success',
        title: adminLang === 'bn' ? 'অর্ডার তৈরি হয়েছে!' : 'Order Created!',
        description: `Order #${orderNumber}`,
      });
      navigate(`/admin/orders/${orderData.id}`);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: adminLang === 'bn' ? 'অর্ডার তৈরি ব্যর্থ হয়েছে' : 'Order creation failed',
        description: (err as Error)?.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const productVariantsForSelected = variants.filter((v) => v.product_id === selectedProductId);

  return (
    <form onSubmit={handleCreateOrder} className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E1E4EA] bg-white text-[#5B6577] hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F1A2C]">
              {at('orderCreate.title')}
            </h1>
            <p className="text-xs text-[#5B6577]">
              {at('orderCreate.subtitle')}
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#F47125] text-white hover:bg-[#e05e13] gap-1.5"
        >
          <Save className="h-4 w-4" />
          {submitting ? at('orderCreate.creating') : at('orderCreate.submit')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Customer Info & Product Selection */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer Details Card */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F3F5] pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C]">
                {at('orderCreate.customerInfo')}
              </h2>
              {isCustomerBlocked && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="h-3.5 w-3.5" /> {at('orderCreate.blockWarning')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('orderCreate.phoneLabel')} <span className="text-[#5B6577]">{at('orderCreate.autoDetect')}</span>
                </label>
                <Input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('orderCreate.fullName')}
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Tanvir Ahmed"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('orderCreate.district')}</label>
                <select
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="Dhaka">Dhaka (৳60)</option>
                  <option value="Chittagong">Chittagong (৳120)</option>
                  <option value="Sylhet">Sylhet (৳120)</option>
                  <option value="Rajshahi">Rajshahi (৳120)</option>
                  <option value="Khulna">Khulna (৳120)</option>
                  <option value="Barisal">Barisal (৳120)</option>
                  <option value="Rangpur">Rangpur (৳120)</option>
                  <option value="Mymensingh">Mymensingh (৳120)</option>
                  <option value="Gazipur">Gazipur (৳120)</option>
                  <option value="Narayanganj">Narayanganj (৳120)</option>
                  <option value="Comilla">Comilla (৳120)</option>
                  <option value="Bogra">Bogra (৳120)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('suppliers.email')} <span className="text-[#5B6577]">({at('common.optional')})</span>
                </label>
                <Input
                  type="email"
                  placeholder="customer@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                {at('orderCreate.fullAddress')}
              </label>
              <textarea
                rows={2}
                placeholder="..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full rounded-xl border border-[#E1E4EA] p-2.5 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
              />
            </div>
          </div>

          {/* Add Product Items */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('orderCreate.selectProducts')}
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('orderCreate.product')}</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedVariantId('');
                  }}
                  className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="">{at('orderCreate.chooseProduct')}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {tAdminField(p, 'name')} — {formatAdminPrice(p.sale_price ?? p.price)} ({at('products.col.stock')}: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {productVariantsForSelected.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('orderCreate.variant')}</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                  >
                    <option value="">—</option>
                    {productVariantsForSelected.map((v) => (
                      <option key={v.id} value={v.id}>
                        {tAdminField(v, 'name')} {v.price_override ? `(+৳${v.price_override})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">{at('orderCreate.qty')}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-xl border border-[#E1E4EA] px-2 py-2 text-xs font-bold text-center"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={!selectedProductId}
                    className="bg-[#17263E] text-white flex-1"
                  >
                    <Plus className="h-4 w-4" /> {at('common.add')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Added Items List */}
            {items.length === 0 ? (
              <p className="text-xs text-[#5B6577] py-4 text-center">{at('orderCreate.noItemsAdded')}</p>
            ) : (
              <div className="overflow-x-auto border-t border-[#F1F3F5] pt-3">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#5B6577] border-b border-[#F1F3F5]">
                    <tr>
                      <th className="pb-2">{at('orderCreate.product')}</th>
                      <th className="pb-2">{at('orderDetail.col.price')}</th>
                      <th className="pb-2">{at('orderCreate.qty')}</th>
                      <th className="pb-2">{at('orderDetail.col.total')}</th>
                      <th className="pb-2 text-right">{at('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F5]">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-semibold text-[#0F1A2C]">{it.productName}</td>
                        <td className="py-2.5 tabular-nums">{formatAdminPrice(it.unitPrice)}</td>
                        <td className="py-2.5 font-bold">{it.quantity}</td>
                        <td className="py-2.5 font-bold text-[#F47125] tabular-nums">
                          {formatAdminPrice(it.unitPrice * it.quantity)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Summary & Channels */}
        <div className="space-y-6">
          {/* Channel & Payment Card */}
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
              {at('orderCreate.sourcePayment')}
            </h2>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('orderCreate.orderSource')}
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as OrderSource)}
                  className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="manual">{at('orders.source.manual')}</option>
                  <option value="messenger">{at('orders.source.messenger')}</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">{at('suppliers.phone')}</option>
                  <option value="ai_chat">AI Chat</option>
                  <option value="facebook">Facebook</option>
                  <option value="website">Website</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('orderCreate.paymentMethod')}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                >
                  <option value="cod">{at('orders.cod')}</option>
                  <option value="advance">{at('orders.advancePayment')}</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                </select>
              </div>

              {couriers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                    {adminLang === 'bn' ? 'কুরিয়ার সার্ভিস (ঐচ্ছিক)' : 'Courier Service (Optional)'}
                  </label>
                  <select
                    value={selectedCourierId}
                    onChange={(e) => handleCourierChange(e.target.value)}
                    className="w-full rounded-xl border border-[#E1E4EA] bg-white px-3 py-2 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
                  >
                    <option value="">
                      {adminLang === 'bn' ? '— পরে নির্বাচন করুন —' : '— Select later —'}
                    </option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (৳{c.default_charge_dhaka}/{c.default_charge_outside})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 rounded-xl border border-[#E1E4EA] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#0F1A2C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTestOrder}
                  onChange={(e) => setIsTestOrder(e.target.checked)}
                  className="rounded border-[#E1E4EA]"
                />
                <span>
                  {adminLang === 'bn' ? 'টেস্ট অর্ডার হিসেবে মার্ক করুন (is_test)' : 'Mark as Test Order (is_test)'}
                </span>
              </label>
            </div>

            {/* Pricing Calculation Summary */}
            <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F1A2C] border-b border-[#F1F3F5] pb-2">
                {at('orderCreate.pricingSummary')}
              </h2>

              <div className="flex justify-between text-xs text-[#5B6577]">
                <span>{at('orderDetail.subtotal')}</span>
                <span className="font-semibold text-[#0F1A2C] tabular-nums">{formatAdminPrice(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#5B6577]">
                <span>{at('orderDetail.deliveryCharge')}</span>
                <div className="flex items-center gap-1 w-24">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))}
                    className="rounded border border-[#E1E4EA] px-1.5 py-1 text-xs font-bold text-right w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#5B6577]">
                <span>{at('orderCreate.discountAmount')}</span>
                <div className="flex items-center gap-1 w-24">
                  <span>-৳</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="rounded border border-[#E1E4EA] px-1.5 py-1 text-xs font-bold text-right text-[#F47125] w-full"
                  />
                </div>
              </div>

              <div className="flex justify-between border-t border-[#E1E4EA] pt-2 text-base font-black text-[#0F1A2C]">
                <span>{at('orderCreate.grandTotal')}</span>
                <span className="text-[#F47125] tabular-nums">{formatAdminPrice(total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-xs space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  {at('orderDetail.staffNoteTitle')}
                </label>
                <textarea
                  rows={2}
                  placeholder={at('orderDetail.staffNotePlaceholder')}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E4EA] p-2 text-xs"
                />
              </div>
            </div>
        </div>
      </div>
    </form>
  );
};

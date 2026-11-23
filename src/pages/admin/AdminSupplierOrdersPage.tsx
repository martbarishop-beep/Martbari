import React, { useEffect, useState } from 'react';
import { Truck, ExternalLink, Copy, Check, MessageSquare, Package, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/admin/StatusBadge';

interface OrderItemWithDetails {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  variant_info: string | null;
  quantity: number;
  price: number;
  supplier_order_status: string;
  supplier_order_ref: string | null;
  supplier_tracking_code: string | null;
  orders: {
    order_number: string;
    customer_name: string;
    phone: string;
    address: string;
    district: string;
    status: string;
    created_at: string;
  } | null;
  products: {
    supplier_id: string | null;
    supplier_sku: string | null;
    suppliers: {
      name: string;
      phone: string;
      whatsapp: string;
      website: string;
    } | null;
  } | null;
}

export const AdminSupplierOrdersPage: React.FC = () => {
  const { at, formatAdminPrice } = useAdminLanguage();
  const { showToast } = useToast();

  const [items, setItems] = useState<OrderItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'not_ordered' | 'ordered' | 'all'>('not_ordered');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal / Inline Ref Editing
  const [editingItem, setEditingItem] = useState<OrderItemWithDetails | null>(null);
  const [supplierRef, setSupplierRef] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchSupplierOrders = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders:order_id (
            order_number,
            customer_name,
            phone,
            address,
            district,
            status,
            created_at
          ),
          products:product_id (
            supplier_id,
            supplier_sku,
            suppliers:supplier_id (
              name,
              phone,
              whatsapp,
              website
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as OrderItemWithDetails[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load supplier orders', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSupplierOrders();
  }, []);

  const handleCopyMessage = async (item: OrderItemWithDetails) => {
    const text = `Hello Supplier, please ship order #${item.orders?.order_number || ''} for product ${item.product_name} (${item.variant_info || ''}) Qty: ${item.quantity}. Customer: ${item.orders?.customer_name}, Phone: ${item.orders?.phone}, Address: ${item.orders?.address}, ${item.orders?.district}.`;
    await navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast({ type: 'success', title: 'Order message copied to clipboard!' });
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleOpenWhatsApp = (item: OrderItemWithDetails) => {
    const phone = item.products?.suppliers?.whatsapp || item.products?.suppliers?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello Supplier, please ship order #${item.orders?.order_number || ''} for product ${item.product_name} (${item.variant_info || ''}) Qty: ${item.quantity}. Customer: ${item.orders?.customer_name}, Phone: ${item.orders?.phone}, Address: ${item.orders?.address}, ${item.orders?.district}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleSaveStatus = async () => {
    if (!supabase || !editingItem) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          supplier_order_status: 'ordered',
          supplier_order_ref: supplierRef.trim() || null,
          supplier_tracking_code: trackingCode.trim() || null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      showToast({ type: 'success', title: 'Supplier order status updated successfully' });
      setEditingItem(null);
      await fetchSupplierOrders();
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setUpdating(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'not_ordered' && item.supplier_order_status === 'ordered') return false;
    if (activeTab === 'ordered' && item.supplier_order_status !== 'ordered') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = item.orders?.order_number?.toLowerCase().includes(q) || false;
      const matchProduct = item.product_name.toLowerCase().includes(q);
      const matchCustomer = item.orders?.customer_name?.toLowerCase().includes(q) || false;
      const matchSupplier = item.products?.suppliers?.name?.toLowerCase().includes(q) || false;
      if (!matchOrder && !matchProduct && !matchCustomer && !matchSupplier) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">Supplier Orders</h1>
          <p className="text-sm text-[#5B6577]">
            Easily manage orders waiting to be placed with dropshipping suppliers, copy WhatsApp messages, and track ref numbers.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-[#E1E4EA] shadow-xs">
        <div className="flex gap-2">
          {(
            [
              { id: 'not_ordered', label: 'Needs Ordering', count: items.filter((i) => i.supplier_order_status !== 'ordered').length },
              { id: 'ordered', label: 'Already Ordered', count: items.filter((i) => i.supplier_order_status === 'ordered').length },
              { id: 'all', label: 'All Items', count: items.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#17263E] text-white'
                  : 'bg-gray-100 text-[#5B6577] hover:bg-gray-200 hover:text-[#0F1A2C]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
          <Input
            type="text"
            placeholder="Search order, product, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[#5B6577]">
            <Package className="h-10 w-10 text-gray-300 mb-2" />
            <p className="font-semibold text-[#0F1A2C]">No supplier order items found</p>
            <p className="text-xs text-[#5B6577] mt-1">All customer orders have been ordered from suppliers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Order / Date</th>
                  <th className="py-3 px-4 font-semibold">Product & Variant</th>
                  <th className="py-3 px-4 font-semibold">Supplier</th>
                  <th className="py-3 px-4 font-semibold">Customer & Address</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredItems.map((item) => {
                  const supplier = item.products?.suppliers;
                  const isOrdered = item.supplier_order_status === 'ordered';

                  return (
                    <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Order */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-[#0F1A2C] block">
                          #{item.orders?.order_number || '---'}
                        </span>
                        <span className="text-[10px] text-[#5B6577]">
                          Qty: <strong className="text-[#0F1A2C]">{item.quantity}</strong> | {formatAdminPrice(item.price * item.quantity)}
                        </span>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="font-semibold text-[#0F1A2C] truncate" title={item.product_name}>
                          {item.product_name}
                        </div>
                        {item.variant_info && (
                          <div className="text-[10px] text-[#F47125] font-semibold">
                            {item.variant_info}
                          </div>
                        )}
                        {item.products?.supplier_sku && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            SKU: {item.products.supplier_sku}
                          </div>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-4">
                        {supplier ? (
                          <div>
                            <div className="font-bold text-[#0F1A2C]">{supplier.name}</div>
                            <div className="text-[10px] text-[#5B6577] font-mono">{supplier.phone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No supplier assigned</span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <div className="font-semibold text-[#0F1A2C]">{item.orders?.customer_name}</div>
                        <div className="text-[10px] text-[#5B6577] truncate" title={`${item.orders?.address}, ${item.orders?.district}`}>
                          {item.orders?.address}, {item.orders?.district}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">{item.orders?.phone}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isOrdered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isOrdered ? 'Ordered from Supplier' : 'Not Ordered'}
                        </span>
                        {item.supplier_order_ref && (
                          <div className="text-[10px] text-gray-500 font-mono mt-1">
                            Ref: {item.supplier_order_ref}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyMessage(item)}
                          className="h-8 px-2.5 text-xs gap-1"
                          title="Copy WhatsApp order message"
                        >
                          {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy Msg
                        </Button>

                        {supplier?.whatsapp && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenWhatsApp(item)}
                            className="h-8 px-2.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 gap-1"
                            title="Send on WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setSupplierRef(item.supplier_order_ref || '');
                            setTrackingCode(item.supplier_tracking_code || '');
                          }}
                          className="h-8 px-2.5 text-xs bg-[#17263E] text-white hover:bg-[#0F1A2C]"
                        >
                          {isOrdered ? 'Edit Ref' : 'Mark Ordered'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Marking as Ordered / Editing Ref */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1A2C]/60 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#0F1A2C]">
              Mark Supplier Order for #{editingItem.orders?.order_number}
            </h3>
            <p className="text-xs text-[#5B6577]">
              Product: <strong className="text-[#0F1A2C]">{editingItem.product_name}</strong> (Qty: {editingItem.quantity})
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Supplier Order Reference / Invoice No
                </label>
                <Input
                  type="text"
                  placeholder="e.g. SUP-982341"
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F1A2C] mb-1">
                  Supplier Tracking / Courier Code
                </label>
                <Input
                  type="text"
                  placeholder="e.g. STEADFAST-83920"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E1E4EA]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSaveStatus()}
                disabled={updating}
                className="bg-[#F47125] text-white hover:bg-[#e05e13]"
              >
                {updating ? 'Saving...' : 'Save & Mark Ordered'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

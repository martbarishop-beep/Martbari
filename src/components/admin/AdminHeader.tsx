import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import type { Order, PublicProduct } from '../../types';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onToggleSidebar }) => {
  const { profile, role, signOut } = useAdminAuth();
  const { adminLang, setAdminLang, at, tAdminField } = useAdminLanguage();
  const navigate = useNavigate();

  // Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{
    orders: Order[];
    products: PublicProduct[];
  }>({ orders: [], products: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notifications
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // User menu dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Fetch pending orders and low stock count
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    async function loadAlertCounts() {
      try {
        const [{ count: pendingCount }, { data: prods }] = await Promise.all([
          client
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          client
            .from('products')
            .select('id, stock, low_stock_threshold, track_stock')
            .eq('is_active', true),
        ]);

        if (typeof pendingCount === 'number') {
          setPendingOrdersCount(pendingCount);
        }

        if (prods) {
          const low = prods.filter(
            (p) => p.track_stock && p.stock <= p.low_stock_threshold,
          ).length;
          setLowStockCount(low);
        }
      } catch {
        // Ignore
      }
    }
    void loadAlertCounts();
  }, []);

  // Global search debounced lookup
  useEffect(() => {
    const term = globalSearch.trim();
    if (term.length < 2) {
      setSearchResults({ orders: [], products: [] });
      setIsSearching(false);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowSearchDropdown(true);

    const timer = setTimeout(async () => {
      if (!supabase) return;
      try {
        const [{ data: orderData }, { data: prodData }] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .or(`order_number.ilike.%${term}%,phone.ilike.%${term}%,customer_name.ilike.%${term}%`)
            .limit(4),
          supabase
            .from('products')
            .select('*')
            .or(`name_en.ilike.%${term}%,name_bn.ilike.%${term}%,sku.ilike.%${term}%`)
            .limit(4),
        ]);

        setSearchResults({
          orders: (orderData ?? []) as Order[],
          products: (prodData ?? []) as PublicProduct[],
        });
      } catch {
        setSearchResults({ orders: [], products: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  const totalAlerts = pendingOrdersCount + lowStockCount;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-[#17263E]/10 bg-white px-4 sm:px-6 shadow-soft">
      {/* Left: Mobile hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#5B6577] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div ref={searchContainerRef} className="relative flex-1">
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onFocus={() => {
              if (globalSearch.trim().length >= 2) setShowSearchDropdown(true);
            }}
            placeholder={at('header.searchPlaceholder')}
            className="h-10 w-full rounded-[10px] border border-[#17263E]/15 bg-[#F5F7FA] pl-9 pr-8 text-xs text-[#0F1A2C] placeholder:text-[#5B6577] focus:border-[#F47125] focus:bg-white focus:outline-none"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5B6577]" />

          {globalSearch && (
            <button
              type="button"
              onClick={() => {
                setGlobalSearch('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5B6577] hover:text-[#0F1A2C] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-y-auto rounded-[12px] border border-[#17263E]/15 bg-white p-2 shadow-card space-y-3">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-[#5B6577]">{at('header.searching')}</div>
              ) : searchResults.orders.length === 0 && searchResults.products.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#5B6577]">
                  {at('header.noSearchMatch', { query: globalSearch })}
                </div>
              ) : (
                <>
                  {searchResults.orders.length > 0 && (
                    <div>
                      <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[#5B6577]">
                        {at('nav.orders')}
                      </span>
                      <div className="divide-y divide-[#17263E]/5">
                        {searchResults.orders.map((ord) => (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => {
                              setShowSearchDropdown(false);
                              setGlobalSearch('');
                              navigate(`/admin/orders/${ord.id}`);
                            }}
                            className="flex w-full items-center justify-between p-2 text-left hover:bg-[#F5F7FA] rounded cursor-pointer"
                          >
                            <div>
                              <p className="font-mono text-xs font-bold text-[#F47125]">
                                {ord.order_number}
                              </p>
                              <p className="text-[11px] text-[#5B6577]">
                                {ord.customer_name} • {ord.phone}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#0F1A2C]">
                              ৳{ord.total}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.products.length > 0 && (
                    <div>
                      <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[#5B6577]">
                        {at('nav.products')}
                      </span>
                      <div className="divide-y divide-[#17263E]/5">
                        {searchResults.products.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setShowSearchDropdown(false);
                              setGlobalSearch('');
                              navigate(`/admin/products/${prod.id}`);
                            }}
                            className="flex w-full items-center justify-between p-2 text-left hover:bg-[#F5F7FA] rounded cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-[#0F1A2C]">
                                {tAdminField(prod, 'name')}
                              </p>
                              <p className="font-mono text-[11px] text-[#5B6577]">
                                SKU: {prod.sku} • Stock: {prod.stock}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#F47125]">
                              ৳{prod.price}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Language Toggle (EN | বাংলা) + Notification Bell + User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Admin Language Toggle */}
        <div
          role="group"
          aria-label={at('lang.switch')}
          className="inline-flex items-center rounded-[10px] border border-[#17263E]/12 bg-[#F5F7FA] p-0.5"
        >
          <button
            type="button"
            onClick={() => setAdminLang('en')}
            className={cn(
              'min-h-[30px] rounded-[7px] px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
              adminLang === 'en'
                ? 'bg-[#17263E] text-white shadow-xs'
                : 'text-[#5B6577] hover:text-[#0F1A2C]',
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setAdminLang('bn')}
            className={cn(
              'min-h-[30px] rounded-[7px] px-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
              adminLang === 'bn'
                ? 'bg-[#F47125] text-white shadow-xs'
                : 'text-[#5B6577] hover:text-[#0F1A2C]',
            )}
          >
            বাংলা
          </button>
        </div>

        {/* Notification Bell */}
        <div ref={notifContainerRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label={at('header.notifications')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#17263E]/15 text-[#5B6577] hover:bg-[#F5F7FA] hover:text-[#0F1A2C] transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {totalAlerts > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white tabular-nums">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-40 mt-1.5 w-72 rounded-[12px] border border-[#17263E]/15 bg-white p-3 shadow-card space-y-2">
              <div className="flex items-center justify-between border-b border-[#17263E]/10 pb-2">
                <span className="text-xs font-bold text-[#0F1A2C]">{at('header.notifications')}</span>
                <span className="text-[10px] font-semibold text-[#5B6577]">
                  {at('header.actionable', { count: totalAlerts })}
                </span>
              </div>

              <div className="space-y-1.5">
                <Link
                  to="/admin/orders?status=pending"
                  onClick={() => setShowNotifications(false)}
                  className="flex items-center justify-between p-2 rounded hover:bg-[#F5F7FA] text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[#F47125]" />
                    <span className="font-semibold text-[#0F1A2C]">{at('header.pendingOrders')}</span>
                  </div>
                  <span className="rounded bg-[#F47125]/10 px-2 py-0.5 font-bold text-[#F47125] tabular-nums">
                    {pendingOrdersCount}
                  </span>
                </Link>

                <Link
                  to="/admin/inventory"
                  onClick={() => setShowNotifications(false)}
                  className="flex items-center justify-between p-2 rounded hover:bg-[#F5F7FA] text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                    <span className="font-semibold text-[#0F1A2C]">{at('header.lowStockItems')}</span>
                  </div>
                  <span className="rounded bg-[#DC2626]/10 px-2 py-0.5 font-bold text-[#DC2626] tabular-nums">
                    {lowStockCount}
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Menu Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2 rounded-[8px] border border-[#17263E]/15 bg-[#F5F7FA] p-1.5 sm:pr-3 hover:bg-[#E5E9F0] transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17263E] text-[11px] font-bold text-white">
              {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#0F1A2C] leading-none">
                {profile?.full_name || 'Admin'}
              </p>
              <span className="text-[10px] uppercase font-semibold text-[#F47125]">
                {role}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-40 mt-1.5 w-48 rounded-[12px] border border-[#17263E]/15 bg-white p-1.5 shadow-card space-y-1">
              <div className="border-b border-[#17263E]/10 p-2 text-xs">
                <p className="font-bold text-[#0F1A2C]">{profile?.full_name}</p>
                <p className="text-[11px] text-[#5B6577]">{profile?.phone || at('header.noPhone')}</p>
              </div>

              <Link
                to="/bn"
                target="_blank"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 p-2 rounded text-xs text-[#0F1A2C] hover:bg-[#F5F7FA] transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-[#F47125]" />
                <span>{at('header.viewStore')}</span>
              </Link>

              <button
                type="button"
                onClick={async () => {
                  setShowUserMenu(false);
                  await signOut();
                  navigate('/admin/login');
                }}
                className="flex w-full items-center gap-2 p-2 rounded text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{at('nav.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

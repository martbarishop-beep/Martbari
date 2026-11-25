import React, { useEffect, useState } from 'react';
import {
  Archive,
  BarChart3,
  Database,
  FileText,
  FolderTree,
  History,
  Image,
  LayoutDashboard,
  LogOut,
  Navigation,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Users,
  X,
  CreditCard,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { role, profile, canAccess, signOut } = useAdminAuth();
  const { at } = useAdminLanguage();
  const navigate = useNavigate();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const fetchPending = async () => {
      try {
        const { count } = await client
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (active && typeof count === 'number') {
          setPendingOrdersCount(count);
        }
      } catch {
        // Ignore
      }
    };
    void fetchPending();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navGroups = [
    {
      title: at('sidebar.group.sales'),
      items: [
        { label: at('nav.dashboard'), to: '/admin', icon: LayoutDashboard, exact: true, show: true },
        {
          label: at('nav.orders'),
          to: '/admin/orders',
          icon: ShoppingBag,
          show: true,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
        },
        { label: at('nav.supplierOrders'), to: '/admin/supplier-orders', icon: Truck, show: true },
        { label: at('nav.payments'), to: '/admin/payments', icon: CreditCard, show: canAccess('reports') },
        { label: at('nav.expenses'), to: '/admin/expenses', icon: Receipt, show: canAccess('reports') },
        { label: at('nav.customers'), to: '/admin/customers', icon: Users, show: true },
      ],
    },
    {
      title: at('sidebar.group.catalog'),
      items: [
        { label: at('nav.products'), to: '/admin/products', icon: Package, show: canAccess('catalog') },
        { label: at('nav.categories'), to: '/admin/categories', icon: FolderTree, show: canAccess('catalog') },
        { label: at('nav.brands'), to: '/admin/brands', icon: Tag, show: canAccess('catalog') },
        { label: at('nav.suppliers'), to: '/admin/suppliers', icon: Truck, show: canAccess('catalog') },
        { label: at('nav.couriers'), to: '/admin/couriers', icon: Navigation, show: canAccess('catalog') },
        { label: at('nav.inventory'), to: '/admin/inventory', icon: Archive, show: canAccess('catalog') },
      ],
    },
    {
      title: at('sidebar.group.marketing'),
      items: [
        { label: at('nav.coupons'), to: '/admin/coupons', icon: Tag, show: canAccess('catalog') },
        { label: at('nav.reviews'), to: '/admin/reviews', icon: ShieldCheck, show: canAccess('catalog') },
        { label: at('nav.banners'), to: '/admin/banners', icon: Image, show: canAccess('catalog') },
        { label: at('nav.pages'), to: '/admin/pages', icon: FileText, show: canAccess('catalog') },
      ],
    },
    {
      title: at('sidebar.group.admin'),
      items: [
        { label: at('nav.reports'), to: '/admin/reports', icon: BarChart3, show: canAccess('reports') },
        { label: at('nav.settings'), to: '/admin/settings', icon: Settings, show: canAccess('settings') },
        { label: at('nav.staff'), to: '/admin/staff', icon: Users, show: canAccess('staff') },
        { label: at('nav.activity'), to: '/admin/activity', icon: History, show: role === 'admin' || role === 'manager' },
        { label: at('nav.backup'), to: '/admin/backup', icon: Database, show: role === 'admin' || role === 'manager' },
        { label: at('nav.demoData'), to: '/admin/demo-data', icon: Image, show: role === 'admin' || role === 'manager' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="print:hidden fixed inset-0 z-40 bg-[#0F1A2C]/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'print:hidden fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#17263E] text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 shadow-card',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link to="/admin" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F47125] text-lg font-bold text-white shadow-sm">
              M
            </span>
            <div>
              <span className="text-base font-bold tracking-tight">MartBari</span>
              <span className="ml-1.5 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/80">
                {at('sidebar.adminBadge')}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#F47125]">
              {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {profile?.full_name || 'Admin User'}
              </p>
              <span className="inline-block rounded bg-[#F47125]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F47125]">
                {role ?? 'Staff'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/45 mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex min-h-[38px] items-center gap-3 rounded-[8px] px-3 text-xs font-semibold transition-colors',
                            isActive
                              ? 'bg-[#F47125] text-white shadow-sm'
                              : 'text-white/75 hover:bg-white/10 hover:text-white',
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{item.label}</span>
                        {'badge' in item && typeof item.badge === 'number' && (
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold text-white tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Footer Actions: View Store & Logout */}
        <div className="border-t border-white/10 p-3 space-y-1">
          <Link
            to="/bn"
            target="_blank"
            className="flex min-h-[38px] items-center gap-3 rounded-[8px] px-3 text-xs font-semibold text-white/75 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Store className="h-4 w-4 text-[#F47125]" />
            <span>{at('nav.viewStorefront')}</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[38px] w-full items-center gap-3 rounded-[8px] px-3 text-xs font-semibold text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{at('nav.signOut')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

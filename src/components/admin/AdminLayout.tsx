import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../ui/Spinner';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

// Web Audio API synthesized chime for incoming real-time orders
function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export const AdminLayout: React.FC = () => {
  const { user, profile, loading, canAccess } = useAdminAuth();
  const { adminLang, at } = useAdminLanguage();
  const { showToast } = useToast();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Supabase Realtime listener for incoming orders
  useEffect(() => {
    const client = supabase;
    if (!client || !user) return;

    const channel = client
      .channel('admin-realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as { order_number?: string; customer_name?: string; total?: number };
          playOrderChime();
          showToast({
            type: 'warning',
            title:
              adminLang === 'bn'
                ? `নতুন অর্ডার এসেছে: ${newOrder.order_number ?? 'Order'}`
                : `New Order Received: ${newOrder.order_number ?? 'Order'}`,
            description:
              adminLang === 'bn'
                ? `${newOrder.customer_name ?? 'কাস্টমার'} ৳${newOrder.total ?? 0} টাকার অর্ডার দিয়েছেন`
                : `${newOrder.customer_name ?? 'Customer'} placed an order of ৳${newOrder.total ?? 0}`,
          }, 6000);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [user, showToast, adminLang]);

  // Handle route authorization guards
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-[#F47125]" />
          <p className="text-xs font-semibold text-[#5B6577]">
            {at('common.verifying')}
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!user || !profile) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }

  // Path permission guards
  const path = location.pathname;
  if (path.startsWith('/admin/staff') && !canAccess('staff')) {
    return <Navigate to="/admin" replace />;
  }
  if (path.startsWith('/admin/settings') && !canAccess('settings')) {
    return <Navigate to="/admin" replace />;
  }
  if (
    (path.startsWith('/admin/products') ||
      path.startsWith('/admin/categories') ||
      path.startsWith('/admin/brands') ||
      path.startsWith('/admin/suppliers') ||
      path.startsWith('/admin/inventory')) &&
    !canAccess('catalog')
  ) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div
      lang={adminLang}
      className={`flex min-h-screen bg-[#F5F7FA] text-[#0F1A2C] antialiased print:min-h-0 print:bg-white ${
        adminLang === 'bn' ? 'font-bangla' : 'font-english'
      }`}
    >
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

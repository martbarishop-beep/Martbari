import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../hooks/useSettings';
import { resetAllBodyScrollLocks } from '../lib/scrollLock';
import { Footer } from './Footer';
import { Header } from './Header';
import { MaintenanceScreen } from './MaintenanceScreen';
import { MobileContactButtons } from './MobileContactButtons';
import { OfflineIndicator } from './OfflineIndicator';
import { AiShoppingAssistant } from './AiShoppingAssistant';
import { Spinner } from './ui/Spinner';

const LazyMiniCartDrawer = lazy(() =>
  import('./MiniCartDrawer').then((m) => ({ default: m.MiniCartDrawer })),
);

export const StorefrontLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const { isMiniCartOpen } = useCart();
  const { pathname } = useLocation();
  const [hasOpenedMiniCart, setHasOpenedMiniCart] = useState(false);

  useEffect(() => {
    if (isMiniCartOpen && !hasOpenedMiniCart) {
      setHasOpenedMiniCart(true);
    }
  }, [isMiniCartOpen, hasOpenedMiniCart]);

  // Safety guarantee: clear any leftover body scroll lock on route changes
  useEffect(() => {
    resetAllBodyScrollLocks();
  }, [pathname]);

  if (settings.maintenance_mode) {
    return <MaintenanceScreen />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-[#FAF8F5] text-[#0F1A2C]">
      <Header />
      <main className="flex-1 min-w-0">
        <Suspense
          fallback={
            <div className="flex min-h-[50dvh] items-center justify-center py-16">
              <Spinner size="lg" className="text-[#F47125]" />
            </div>
          }
        >
          {children ?? <Outlet />}
        </Suspense>
      </main>
      <Footer />
      {hasOpenedMiniCart && (
        <Suspense fallback={null}>
          <LazyMiniCartDrawer />
        </Suspense>
      )}
      <AiShoppingAssistant />
      <MobileContactButtons />
      <OfflineIndicator />
    </div>
  );
};

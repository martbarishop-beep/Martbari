import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { Footer } from './Footer';
import { Header } from './Header';
import { MaintenanceScreen } from './MaintenanceScreen';
import { MiniCartDrawer } from './MiniCartDrawer';
import { MobileContactButtons } from './MobileContactButtons';
import { OfflineIndicator } from './OfflineIndicator';
import { Spinner } from './ui/Spinner';

export const StorefrontLayout: React.FC = () => {
  const { settings } = useSettings();

  if (settings.maintenance_mode) {
    return <MaintenanceScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F1A2C]">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center py-16">
              <Spinner size="lg" className="text-[#F47125]" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MiniCartDrawer />
      <MobileContactButtons />
      <OfflineIndicator />
    </div>
  );
};

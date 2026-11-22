import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { AnnouncementBar } from './AnnouncementBar';
import { Footer } from './Footer';
import { Header } from './Header';
import { MaintenanceScreen } from './MaintenanceScreen';
import { MiniCartDrawer } from './MiniCartDrawer';
import { MobileContactButtons } from './MobileContactButtons';
import { OfflineIndicator } from './OfflineIndicator';

export const StorefrontLayout: React.FC = () => {
  const { settings } = useSettings();

  if (settings.maintenance_mode) {
    return <MaintenanceScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F1A2C]">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MiniCartDrawer />
      <MobileContactButtons />
      <OfflineIndicator />
    </div>
  );
};

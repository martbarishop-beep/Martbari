import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminLanguageProvider } from '../../context/AdminLanguageContext';

export const AdminWorkspaceShell: React.FC = () => {
  return (
    <AdminLanguageProvider>
      <Outlet />
    </AdminLanguageProvider>
  );
};

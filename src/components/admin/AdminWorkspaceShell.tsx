import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';
import { AdminLanguageProvider } from '../../context/AdminLanguageContext';

export const AdminWorkspaceShell: React.FC = () => {
  return (
    <AdminLanguageProvider>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Outlet />
    </AdminLanguageProvider>
  );
};

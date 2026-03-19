import React, { useState } from 'react';
import { SessionProvider, useSession } from './components/shared/AppSession';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LoginScreen from './components/shared/LoginScreen';
import DriverPortalView from './components/driver/DriverPortalView';
import BottomNav from './components/mobile/BottomNav';
import useAndroidBackButton from './hooks/useAndroidBackButton';

const pageTitles = {
  Dashboard: 'Dashboard',
  Loads: 'Loads',
  LoadDetail: 'Load Detail',
  UploadDocument: 'Upload Document',
  Companies: 'Companies',
  CompanyDetail: 'Company Detail',
  Drivers: 'Drivers',
  DriverDetail: 'Driver Detail',
  Trucks: 'Trucks',
  Trailers: 'Trailers',
  Invoices: 'Invoices',
  InvoiceDetail: 'Invoice Detail',
  FuelImport: 'Fuel Import',
  DriverStatements: 'Driver Statements',
  StatementBuilder: 'Statement Builder',
  Reports: 'Reports',
  AuditLogPage: 'Audit Log',
  SettingsPage: 'Settings',
  AdminDriverDocuments: 'Driver Documents',
  DeletedItems: 'Deleted Items',
};

function AppShell({ children, currentPageName }) {
  const { session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  useAndroidBackButton();

  if (!session) {
    return <LoginScreen />;
  }

  if (session.role === 'driver') {
    return <DriverPortalView />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Sidebar: hidden on mobile, visible on md+ */}
      <div className="hidden lg:flex">
        <Sidebar
          currentPage={currentPageName}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar pageTitle={pageTitles[currentPageName] || currentPageName} currentPageName={currentPageName} />
        {/* Extra bottom padding on mobile to clear the bottom nav */}
        <main className="flex-1 overflow-auto px-2 lg:px-0 pb-16 lg:pb-0">
          {children}
        </main>
      </div>
      {/* Bottom nav: mobile only */}
      <BottomNav currentPage={currentPageName} />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <SessionProvider>
      <AppShell currentPageName={currentPageName}>{children}</AppShell>
    </SessionProvider>
  );
}
import React, { useState } from 'react';
import { SessionProvider, useSession } from './components/shared/AppSession';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LoginScreen from './components/shared/LoginScreen';
import DriverPortalView from './components/driver/DriverPortalView';

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

  if (!session) {
    return <LoginScreen />;
  }

  if (session.role === 'driver') {
    return <DriverPortalView />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentPage={currentPageName}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar pageTitle={pageTitles[currentPageName] || currentPageName} currentPageName={currentPageName} />
        <main className="flex-1 overflow-auto px-2 md:px-0">
          {children}
        </main>
      </div>
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
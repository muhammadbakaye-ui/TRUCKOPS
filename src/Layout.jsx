import React, { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';

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
};

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentPage={currentPageName}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar pageTitle={pageTitles[currentPageName] || currentPageName} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SessionProvider, useSession } from './components/shared/AppSession';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import LoginScreen from './components/shared/LoginScreen';
import DriverPortalView from './components/driver/DriverPortalView';
import BottomNav from './components/mobile/BottomNav';
import useAndroidBackButton from './hooks/useAndroidBackButton';
import GlobalBroadcastListener from './components/shared/GlobalBroadcastListener';
import { UploadProvider } from './context/UploadContext';
import UploadProgressFloat from './components/shared/UploadProgressFloat';
import { PreviewModeBanner, useHasSubscription } from './components/shared/SubscriptionGate';
import SubscriptionModal from './components/shared/SubscriptionModal';

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

function useMainScrollRestoration(currentPageName) {
  const mainRef = useRef(null);
  const location = useLocation();
  const key = `scroll_${currentPageName}`;

  // Restore on page change
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem(key);
    const timer = setTimeout(() => {
      if (mainRef.current) mainRef.current.scrollTop = saved ? parseInt(saved, 10) : 0;
    }, 60);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search, key]);

  // Save on scroll
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => sessionStorage.setItem(key, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [key]);

  return mainRef;
}

function AppShell({ children, currentPageName }) {
  const { session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const mainRef = useMainScrollRestoration(currentPageName);
  const location = useLocation();
  const navigate = useNavigate();
  useAndroidBackButton();

  // No subscription redirect - preview mode is open

  if (!session) {
    return <LoginScreen />;
  }

  if (session.role === 'driver') {
    return (
      <>
        <GlobalBroadcastListener />
        <DriverPortalView />
      </>
    );
  }

  return (
    <>
      <GlobalBroadcastListener />
      <div className="flex h-screen overflow-hidden bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Sidebar: hidden on mobile, visible on md+ */}
        <div className="hidden md:flex">
          <Sidebar
            currentPage={currentPageName}
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PreviewModeBanner />
          <TopBar pageTitle={pageTitles[currentPageName] || currentPageName} currentPageName={currentPageName} />
          {/* Extra bottom padding on mobile to clear the bottom nav */}
          <main ref={mainRef} className="flex-1 overflow-auto px-2 lg:px-0 pb-16 md:pb-0">
            {children}
          </main>
        </div>
        {/* Bottom nav: mobile only */}
        <BottomNav currentPage={currentPageName} />
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <SessionProvider>
      <UploadProvider>
        <AppShell currentPageName={currentPageName}>{children}</AppShell>
        <UploadProgressFloat />
      </UploadProvider>
    </SessionProvider>
  );
}
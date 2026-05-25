import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
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
  DispatchBoard: 'Dispatch Board',
  Taxes1099: '1099s',
  Factoring: 'Factoring',
  DriverQualifications: 'Driver Qualifications',
  DriverViolations: 'Driver Violations',
  DrugAlcoholTests: 'Drug & Alcohol Tests',
  AccidentsClaims: 'Accidents & Claims',
  LicenseExpirationWarnings: 'License Expiration Warnings',
  VehicleMaintenance: 'Vehicle Maintenance',
  TruckInspections: 'Truck Inspections',
  EquipmentWarnings: 'Equipment Warnings',
  IFTAReports: 'IFTA Reports',
  InsurancePolicies: 'Insurance Policies',
  PermitsLicenses: 'Permits & Licenses',
  AdminDriverDocuments: 'Driver Documents',
  DeletedItems: 'Deleted Items',
};

function useMainScrollRestoration() {
  const mainRef = useRef(null);
  const location = useLocation();
  const key = `scroll_${location.pathname}`;

  // Save scroll position on every scroll event
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    
    const onScroll = () => {
      sessionStorage.setItem(key, el.scrollTop);
    };
    
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [key]);

  // Restore scroll position when route changes
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    
    // Reset to top first (ensures clean state)
    el.scrollTop = 0;
    
    // Then restore saved position after a brief delay for content to render
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const target = parseInt(saved, 10);
      const timer = setTimeout(() => {
        if (mainRef.current) {
          mainRef.current.scrollTop = target;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return mainRef;
}

function useSidebarScrollRestoration() {
  const sidebarRef = useRef(null);
  const location = useLocation();
  const sidebarKey = 'scroll_sidebar';

  // Save scroll position on every scroll event
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    
    const onScroll = () => {
      sessionStorage.setItem(sidebarKey, el.scrollTop);
    };
    
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Restore scroll position when route changes
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    
    // Restore saved position after a brief delay
    const saved = sessionStorage.getItem(sidebarKey);
    if (saved) {
      const target = parseInt(saved, 10);
      const timer = setTimeout(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = target;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return sidebarRef;
}

function AppShell({ children, currentPageName }) {
  const { session, login, validating } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check if onboarding is needed for this session
  useEffect(() => {
    if (validating) { setOnboardingChecked(false); return; }
    if (!session || session.role === 'driver') { setOnboardingChecked(true); return; }
    if (session.onboarding_completed) { setOnboardingChecked(true); return; }
    setOnboardingChecked(false);
    // Check DB via authAdmin (Admin entity requires service-role)
    base44.functions.invoke('authAdmin', {
      action: 'get_settings',
      email: session.admin_email,
      session_token: session.session_token,
    })
      .then(res => {
        if (res.data?.onboarding_completed) {
          login({ ...session, onboarding_completed: true });
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => { /* keep onboarding hidden on error */ })
      .finally(() => setOnboardingChecked(true));
  }, [session?.admin_email, validating]);

  const handleOnboardingComplete = () => {
    login({ ...session, onboarding_completed: true });
    setShowOnboarding(false);
  };
  const mainRef = useMainScrollRestoration();
  const sidebarRef = useSidebarScrollRestoration();
  const location = useLocation();
  const navigate = useNavigate();
  useAndroidBackButton();

  // No subscription redirect - preview mode is open

  if (validating || !onboardingChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-sidebar">
        <div className="w-8 h-8 border-4 border-sidebar-border border-t-sidebar-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (showOnboarding && session) {
    return <OnboardingFlow session={session} onComplete={handleOnboardingComplete} />;
  }

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
        <div className="hidden md:flex" ref={sidebarRef}>
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
    <UploadProvider>
      <AppShell currentPageName={currentPageName}>{children}</AppShell>
      <UploadProgressFloat />
    </UploadProvider>
  );
}
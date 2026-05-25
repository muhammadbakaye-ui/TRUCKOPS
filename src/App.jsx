import { Toaster } from "@/components/ui/toaster"
import Landing from './pages/Landing';
import DispatchBoard from './pages/DispatchBoard';
import Taxes1099 from './pages/Taxes1099';
import Factoring from './pages/Factoring';
import DriverQualifications from './pages/DriverQualifications';
import DriverViolations from './pages/DriverViolations';
import DrugAlcoholTests from './pages/DrugAlcoholTests';
import AccidentsClaims from './pages/AccidentsClaims';
import LicenseExpirationWarnings from './pages/LicenseExpirationWarnings';
import VehicleMaintenance from './pages/VehicleMaintenance';
import TruckInspections from './pages/TruckInspections';
import EquipmentWarnings from './pages/EquipmentWarnings';
import LandingFeatures from './pages/LandingFeatures';
import LandingPricing from './pages/LandingPricing';
import LandingAbout from './pages/LandingAbout';
import DeletedItems from './pages/DeletedItems';
import DriverPublicPortal from './pages/DriverPublicPortal';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import LoginScreen from './components/shared/LoginScreen';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import PageTransition from '@/components/shared/PageTransition';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  // Call hook unconditionally at top level (required by React)
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const isElectron = urlParams.get('platform') === 'electron' || !!window.isElectron;

  // Electron version: app only, no marketing pages
  if (isElectron) {
    return (
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Web version: full app with auth

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/features" element={<LandingFeatures />} />
      <Route path="/pricing-landing" element={<LandingPricing />} />
      <Route path="/about" element={<LandingAbout />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <PageTransition>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </PageTransition>
          }
        />
      ))}
      <Route path="/DeletedItems" element={<PageTransition><LayoutWrapper currentPageName="DeletedItems"><DeletedItems /></LayoutWrapper></PageTransition>} />
      <Route path="/DispatchBoard" element={<PageTransition><LayoutWrapper currentPageName="DispatchBoard"><DispatchBoard /></LayoutWrapper></PageTransition>} />
      <Route path="/Taxes1099" element={<PageTransition><LayoutWrapper currentPageName="Taxes1099"><Taxes1099 /></LayoutWrapper></PageTransition>} />
      <Route path="/Factoring" element={<PageTransition><LayoutWrapper currentPageName="Factoring"><Factoring /></LayoutWrapper></PageTransition>} />
      <Route path="/DriverQualifications" element={<PageTransition><LayoutWrapper currentPageName="DriverQualifications"><DriverQualifications /></LayoutWrapper></PageTransition>} />
      <Route path="/DriverViolations" element={<PageTransition><LayoutWrapper currentPageName="DriverViolations"><DriverViolations /></LayoutWrapper></PageTransition>} />
      <Route path="/DrugAlcoholTests" element={<PageTransition><LayoutWrapper currentPageName="DrugAlcoholTests"><DrugAlcoholTests /></LayoutWrapper></PageTransition>} />
      <Route path="/AccidentsClaims" element={<PageTransition><LayoutWrapper currentPageName="AccidentsClaims"><AccidentsClaims /></LayoutWrapper></PageTransition>} />
      <Route path="/LicenseExpirationWarnings" element={<PageTransition><LayoutWrapper currentPageName="LicenseExpirationWarnings"><LicenseExpirationWarnings /></LayoutWrapper></PageTransition>} />
      <Route path="/VehicleMaintenance" element={<PageTransition><LayoutWrapper currentPageName="VehicleMaintenance"><VehicleMaintenance /></LayoutWrapper></PageTransition>} />
      <Route path="/TruckInspections" element={<PageTransition><LayoutWrapper currentPageName="TruckInspections"><TruckInspections /></LayoutWrapper></PageTransition>} />
      <Route path="/EquipmentWarnings" element={<PageTransition><LayoutWrapper currentPageName="EquipmentWarnings"><EquipmentWarnings /></LayoutWrapper></PageTransition>} />

      <Route path="/DriverPublicPortal" element={<PageTransition><DriverPublicPortal /></PageTransition>} />
      <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
      <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
      <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
      <Route path="/SubscriptionSuccess" element={<PageTransition><SubscriptionSuccess /></PageTransition>} />
      <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
      <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
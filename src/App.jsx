import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MarketingApp from '@/components/MarketingApp';
import AppRoutes from '@/components/AppRoutes';
import { SessionProvider } from '@/components/shared/AppSession';
import { UploadProvider } from '@/context/UploadContext';

const AuthenticatedApp = () => {
  // Call hook unconditionally at top level (required by React)
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const isElectron = urlParams.get('platform') === 'electron' || !!window.isElectron;

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

  // Electron: show app only (no marketing pages)
  if (isElectron) {
    return (
      <SessionProvider>
        <UploadProvider>
          <AppRoutes />
        </UploadProvider>
      </SessionProvider>
    );
  }

  // Web: show marketing pages
  return <MarketingApp />;
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
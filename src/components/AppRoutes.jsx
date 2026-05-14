import { Routes, Route } from 'react-router-dom';
import LoginScreen from './shared/LoginScreen';
import DeletedItems from '../pages/DeletedItems';
import SystemAdmins from '../pages/SystemAdmins';
import DriverPublicPortal from '../pages/DriverPublicPortal';
import PageNotFound from '../lib/PageNotFound';
import PageTransition from './shared/PageTransition';
import { pagesConfig } from '../pages.config';
import { useSession } from './shared/AppSession';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

export default function AppRoutes() {
  const { session } = useSession();

  // Not logged in—show login
  if (!session) {
    return (
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  // Logged in—show dashboard
  return (
    <Routes>
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
      <Route path="/SystemAdmins" element={<PageTransition><LayoutWrapper currentPageName="SystemAdmins"><SystemAdmins /></LayoutWrapper></PageTransition>} />
      <Route path="/DriverPublicPortal" element={<PageTransition><DriverPublicPortal /></PageTransition>} />
      <Route path="/" element={<PageTransition><LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper></PageTransition>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}
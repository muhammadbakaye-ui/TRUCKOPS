import { Routes, Route } from 'react-router-dom';
import Landing from '../pages/Landing';
import LandingFeatures from '../pages/LandingFeatures';
import LandingPricing from '../pages/LandingPricing';
import LandingAbout from '../pages/LandingAbout';
import Pricing from '../pages/Pricing';
import Privacy from '../pages/Privacy';
import Terms from '../pages/Terms';
import SubscriptionSuccess from '../pages/SubscriptionSuccess';
import VerifyEmail from '../pages/VerifyEmail';
import ResetPassword from '../pages/ResetPassword';
import PageNotFound from '../lib/PageNotFound';
import PageTransition from './shared/PageTransition';

export default function MarketingApp() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/features" element={<LandingFeatures />} />
      <Route path="/pricing" element={<LandingPricing />} />
      <Route path="/about" element={<LandingAbout />} />
      <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
      <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
      <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
      <Route path="/subscription-success" element={<PageTransition><SubscriptionSuccess /></PageTransition>} />
      <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
      <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}
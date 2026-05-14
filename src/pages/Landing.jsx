import { useNavigate } from 'react-router-dom';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCTA from '@/components/landing/LandingCTA';

export default function Landing() {
  const navigate = useNavigate();

  const handleContinue = () => {
    const isLoggedIn = (() => {
      try { return !!JSON.parse(localStorage.getItem('truckops_session')); }
      catch { return false; }
    })();
    
    navigate(isLoggedIn ? '/Dashboard' : '/pricing-landing');
  };

  return (
    <div className="bg-sidebar-background min-h-screen">
      <LandingNav onContinue={handleContinue} />
      <LandingHero onContinue={handleContinue} />
      <LandingFeatures />
      <LandingCTA onContinue={handleContinue} />
    </div>
  );
}
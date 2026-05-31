import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCTA from '@/components/landing/LandingCTA';
import MobileLanding from '@/components/landing/MobileLanding';

export default function Landing() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleContinue = () => {
    navigate('/Dashboard');
  };

  if (isMobile) {
    return <MobileLanding onContinue={handleContinue} />;
  }

  return (
    <div className="bg-sidebar-background min-h-screen">
      <LandingNav onContinue={handleContinue} />
      <LandingHero onContinue={handleContinue} />
      <LandingFeatures />
      <LandingCTA onContinue={handleContinue} />
    </div>
  );
}
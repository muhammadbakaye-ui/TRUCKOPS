import { useNavigate, Navigate } from 'react-router-dom';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingCTA from '@/components/landing/LandingCTA';

export default function Landing() {
  const navigate = useNavigate();

  if (window.innerWidth < 768) {
    return <Navigate to="/Dashboard" replace />;
  }

  const handleContinue = () => {
    navigate('/Dashboard');
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
import React, { useState, useEffect } from 'react';
import { useSession } from './AppSession';
import { useNavigate } from 'react-router-dom';
import PreLoginSlideshow from '../tutorial/PreLoginSlideshow';
import AdminAuthOptions from './AdminAuthOptions.jsx';

export default function LoginScreen() {
  const { login, session } = useSession();
  const navigate = useNavigate();
  const [showSlideshow, setShowSlideshow] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('signup') === '1' ? 'signup' : 'login';
  const returnPlan = params.get('plan');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (session) {
      navigate('/Dashboard');
    }
  }, [session, navigate]);

  useEffect(() => {
    const seen = localStorage.getItem('truckops_slideshow_seen');
    if (!seen) setShowSlideshow(true);
  }, []);

  const closeSlideshow = () => {
    localStorage.setItem('truckops_slideshow_seen', '1');
    setShowSlideshow(false);
  };

  return (
    <>
      {showSlideshow && <PreLoginSlideshow onClose={closeSlideshow} />}
      <AdminAuthOptions
        initialMode={initialMode}
        onBack={null}
        onSuccess={(adminId, adminName, extra = {}) => {
          login({ role: 'admin', admin_id: adminId, admin_name: adminName, ...extra });
          if (returnPlan) {
            window.location.href = `/pricing?plan=${returnPlan}`;
          }
        }}
        onShowTour={() => setShowSlideshow(true)}
      />
    </>
  );
}
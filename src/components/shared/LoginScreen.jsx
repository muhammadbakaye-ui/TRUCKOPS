import React, { useState, useEffect } from 'react';
import { useSession } from './AppSession';
import PreLoginSlideshow from '../tutorial/PreLoginSlideshow';
import AdminAuthOptions from './AdminAuthOptions.jsx';

export default function LoginScreen() {
  const { login } = useSession();
  const [showSlideshow, setShowSlideshow] = useState(false);

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
        onBack={null}
        onSuccess={(adminId, adminName, extra = {}) => {
          login({ role: 'admin', admin_id: adminId, admin_name: adminName, ...extra });
        }}
        onShowTour={() => setShowSlideshow(true)}
      />
    </>
  );
}
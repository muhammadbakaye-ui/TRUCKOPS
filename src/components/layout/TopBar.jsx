import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LogOut, Shield } from 'lucide-react';
import { useSession } from '../shared/AppSession';
import NotificationBell from './NotificationBell';
import TourButton from '../tutorial/TourButton';
import AppTour, { ADMIN_TOUR_STEPS } from '../tutorial/AppTour';

export default function TopBar({ pageTitle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTour, setShowTour] = useState(false);
  const navigate = useNavigate();
  const { logout } = useSession();

  // Auto-show tour on first admin login
  const startTour = () => setShowTour(true);
  React.useEffect(() => {
    const seen = localStorage.getItem('truckops_admin_tour_seen');
    if (!seen) {
      const t = setTimeout(() => { setShowTour(true); localStorage.setItem('truckops_admin_tour_seen', '1'); }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Loads?search=${encodeURIComponent(searchQuery.trim())}`));
    }
  };

  return (
    <React.Fragment>
      {showTour && <AppTour steps={ADMIN_TOUR_STEPS} onClose={() => setShowTour(false)} />}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
      <div>
        <p className="text-[10px] text-muted-foreground font-medium tracking-wide leading-none mb-0.5">Unity Transportation LLC</p>
        <h1 className="text-sm font-semibold text-foreground leading-none">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative" data-tour="topbar-search">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search loads, invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 h-8 pl-8 text-xs bg-muted border-0"
          />
        </form>
        <div data-tour="notification-bell"><NotificationBell /></div>
        <TourButton onClick={startTour} />
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>
      </div>
    </React.Fragment>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LogOut, Shield, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useSession } from '../shared/AppSession';
import NotificationBell from './NotificationBell';
import TourButton from '../tutorial/TourButton';
import AppTour, { ADMIN_TOUR_STEPS, UPLOAD_TOUR_STEPS } from '../tutorial/AppTour';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';

export default function TopBar({ pageTitle, currentPageName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTour, setShowTour] = useState(false);
  const [showUploadTour, setShowUploadTour] = useState(false);
  const navigate = useNavigate();
  const { logout, session } = useSession();
  const companyName = session?.company_name || '';
  const queryClient = useQueryClient();

  const startTour = () => setShowTour(true);

  React.useEffect(() => {
    const seen = localStorage.getItem('truckops_admin_tour_seen');
    if (!seen) {
      const t = setTimeout(() => { setShowTour(true); localStorage.setItem('truckops_admin_tour_seen', '1'); }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  React.useEffect(() => {
    if (currentPageName === 'UploadDocument') {
      const seen = localStorage.getItem('truckops_upload_tour_seen');
      if (!seen) {
        const t = setTimeout(() => { setShowUploadTour(true); localStorage.setItem('truckops_upload_tour_seen', '1'); }, 600);
        return () => clearTimeout(t);
      }
    }
  }, [currentPageName]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Loads?search=${encodeURIComponent(searchQuery.trim())}`));
    }
  };

  const handleReload = async () => {
    await queryClient.invalidateQueries();
    navigate(0);
  };

  return (
    <>
      {showTour && <AppTour steps={ADMIN_TOUR_STEPS} onClose={() => setShowTour(false)} />}
      {showUploadTour && <AppTour steps={UPLOAD_TOUR_STEPS} onClose={() => setShowUploadTour(false)} />}
      <div className="sticky top-0 z-40 h-14 border-b border-border bg-card flex items-center justify-between px-3 lg:px-4 flex-shrink-0" style={{ paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
        {/* Left: Page Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleReload}>
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <h1 className="text-sm font-semibold text-foreground leading-none truncate">{pageTitle}</h1>
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <form onSubmit={handleSearch} className="relative hidden lg:block" data-tour="topbar-search">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search loads, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 h-8 pl-8 text-xs bg-muted border-0"
            />
          </form>
          <div data-tour="notification-bell" className="flex-shrink-0"><NotificationBell /></div>
          <TourButton onClick={startTour} className="lg:flex hidden flex-shrink-0" />
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-border flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-medium">Admin</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log Out</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to log out?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={logout}>Log Out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}
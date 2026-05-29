import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '../shared/AppSession';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import MobileMenuDrawer from './MobileMenuDrawer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const BOTTOM_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', tourAttr: 'mobile-nav-dashboard' },
  { label: 'Loads', icon: Container, page: 'Loads', tourAttr: 'mobile-nav-loads' },
];

export default function BottomNav({ currentPage }) {
  const { logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleQuickAction = () => {
    // Quick action menu - navigate to most common actions
    // For now, navigate to UploadDocument as it's a common mobile action
    window.location.href = createPageUrl('UploadDocument');
  };

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {BOTTOM_NAV_ITEMS.map(({ label, icon: Icon, page, tourAttr }) => {
          const isActive = currentPage === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              data-tour={tourAttr}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px]',
                isActive ? 'text-sidebar-primary bg-sidebar-accent/20' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5px]')} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* More Menu Button */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <MoreHorizontal className="w-6 h-6" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <MobileMenuDrawer open={menuOpen} onOpenChange={setMenuOpen} currentPage={currentPage} />
        </Sheet>

        {/* Quick Action Button */}
        <button 
          onClick={handleQuickAction}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] text-sidebar-primary hover:text-sidebar-primary/80 bg-sidebar-accent/10"
        >
          <Plus className="w-6 h-6" />
          <span>Action</span>
        </button>

        {/* Logout button - moved to More menu, replaced with spacer */}
        <div className="flex-1" />
      </nav>
    </>
  );
}
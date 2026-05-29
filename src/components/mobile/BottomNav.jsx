import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, MoreHorizontal, FileText, Users, Truck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '../shared/AppSession';
import MobileMenuDrawer from './MobileMenuDrawer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import CustomizeLayoutModal from './CustomizeLayoutModal';

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', tourAttr: 'mobile-nav-dashboard' },
  { label: 'Loads', icon: Container, page: 'Loads', tourAttr: 'mobile-nav-loads' },
  { label: 'Invoices', icon: FileText, page: 'Invoices', tourAttr: 'mobile-nav-invoices' },
  { label: 'Drivers', icon: Users, page: 'Drivers', tourAttr: 'mobile-nav-drivers' },
  { label: 'Trucks', icon: Truck, page: 'Trucks', tourAttr: 'mobile-nav-trucks' },
];

export default function BottomNav({ currentPage }) {
  const { logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      setVisiblePages(JSON.parse(saved));
    } else {
      setVisiblePages(['Dashboard', 'Loads']);
    }
  }, []);

  const getIconForPage = (page) => {
    const item = ALL_NAV_ITEMS.find(i => i.page === page);
    return item?.icon || LayoutDashboard;
  };

  return (
    <>
      <CustomizeLayoutModal open={customizeOpen} onOpenChange={setCustomizeOpen} />
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {visiblePages.map(page => {
          const item = ALL_NAV_ITEMS.find(i => i.page === page);
          if (!item) return null;
          const Icon = item.icon;
          const isActive = currentPage === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              data-tour={item.tourAttr}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px]',
                isActive ? 'text-sidebar-primary bg-sidebar-accent/20' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5px]')} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu Button - always on the right */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <MoreHorizontal className="w-6 h-6" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <MobileMenuDrawer 
            open={menuOpen} 
            onOpenChange={setMenuOpen} 
            currentPage={currentPage}
            onCustomizeClick={() => {
              setMenuOpen(false);
              setCustomizeOpen(true);
            }}
          />
        </Sheet>
      </nav>
    </>
  );
}
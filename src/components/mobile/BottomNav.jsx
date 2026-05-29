import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, MoreHorizontal, FileText, Users, Truck, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '../shared/AppSession';
import MobileMenuDrawer from './MobileMenuDrawer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', tourAttr: 'mobile-nav-dashboard' },
  { label: 'Loads', icon: Container, page: 'Loads', tourAttr: 'mobile-nav-loads' },
  { label: 'Invoices', icon: FileText, page: 'Invoices', tourAttr: 'mobile-nav-invoices' },
  { label: 'Drivers', icon: Users, page: 'Drivers', tourAttr: 'mobile-nav-drivers' },
  { label: 'Trucks', icon: Truck, page: 'Trucks', tourAttr: 'mobile-nav-trucks' },
];

const ALL_AVAILABLE_PAGES = [
  { label: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { label: 'Loads', page: 'Loads', icon: Container },
  { label: 'Invoices', page: 'Invoices', icon: FileText },
  { label: 'Drivers', page: 'Drivers', icon: Users },
  { label: 'Trucks', page: 'Trucks', icon: Truck },
  { label: 'Companies', page: 'Companies', icon: Users },
  { label: 'Trailers', page: 'Trailers', icon: Truck },
  { label: 'Dispatch Board', page: 'DispatchBoard', icon: Container },
  { label: 'Upload Document', page: 'UploadDocument', icon: FileText },
  { label: 'Fuel Import', page: 'FuelImport', icon: FileText },
  { label: 'Driver Statements', page: 'DriverStatements', icon: FileText },
  { label: 'Reports', page: 'Reports', icon: LayoutDashboard },
  { label: 'Settings', page: 'SettingsPage', icon: LayoutDashboard },
];

export default function BottomNav({ currentPage }) {
  const { logout } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [tempSelection, setTempSelection] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      setVisiblePages(JSON.parse(saved));
    } else {
      setVisiblePages(['Dashboard', 'Loads']);
    }
  }, []);

  useEffect(() => {
    if (editMode) {
      setTempSelection(visiblePages);
    }
  }, [editMode]);

  const getIconForPage = (page) => {
    const item = ALL_NAV_ITEMS.find(i => i.page === page);
    return item?.icon || LayoutDashboard;
  };

  const handleTogglePage = (page) => {
    setTempSelection(prev => {
      const isSelected = prev.includes(page);
      if (isSelected) {
        return prev.filter(p => p !== page);
      } else {
        if (prev.length < 4) {
          return [...prev, page];
        }
        return prev;
      }
    });
  };

  const handleSaveCustomization = () => {
    localStorage.setItem('bottomNav_customization', JSON.stringify(tempSelection));
    setVisiblePages(tempSelection);
    setEditMode(false);
  };

  // Show 4 customizable slots + "More" as permanent 5th slot
  const displayPages = editMode ? tempSelection : visiblePages;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* 4 customizable tabs */}
        {displayPages.map((page, index) => {
          if (index >= 4) return null; // Only show first 4
          const item = ALL_NAV_ITEMS.find(i => i.page === page) || ALL_AVAILABLE_PAGES.find(p => p.page === page);
          if (!item) return null;
          const Icon = item.icon;
          const isActive = currentPage === page;
          
          if (editMode) {
            return (
              <div
                key={page}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium relative min-h-[56px]"
              >
                <Checkbox
                  checked={tempSelection.includes(page)}
                  onCheckedChange={() => handleTogglePage(page)}
                  className="absolute top-1 right-1 h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5px]')} />
                <span className={isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'}>{item.label}</span>
              </div>
            );
          }
          
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

        {/* "More" Menu Button - always visible as 5th slot */}
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
            editMode={editMode}
            onEditModeChange={setEditMode}
            tempSelection={tempSelection}
            onTogglePage={handleTogglePage}
            onSaveCustomization={handleSaveCustomization}
          />
        </Sheet>
      </nav>
    </>
  );
}
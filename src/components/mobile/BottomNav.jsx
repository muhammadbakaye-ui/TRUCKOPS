import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, MoreHorizontal, FileText, Users, Truck, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const PAGE_GROUPS = {
  'Core': [
    { label: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
    { label: 'Loads', page: 'Loads', icon: Container },
    { label: 'Invoices', page: 'Invoices', icon: FileText },
    { label: 'Driver Statements', page: 'DriverStatements', icon: FileText },
  ],
  'Operations': [
    { label: 'Drivers', page: 'Drivers', icon: Users },
    { label: 'Trucks', page: 'Trucks', icon: Truck },
    { label: 'Trailers', page: 'Trailers', icon: Truck },
    { label: 'Companies', page: 'Companies', icon: Users },
    { label: 'Dispatch Board', page: 'DispatchBoard', icon: Container },
  ],
  'Management': [
    { label: 'Upload Document', page: 'UploadDocument', icon: FileText },
    { label: 'Fuel Import', page: 'FuelImport', icon: FileText },
    { label: 'Reports', page: 'Reports', icon: LayoutDashboard },
    { label: 'Settings', page: 'SettingsPage', icon: LayoutDashboard },
  ],
};

const DEFAULT_PAGES = ['Dashboard', 'Loads', 'Invoices', 'DriverStatements'];

export default function BottomNav({ currentPage }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState(DEFAULT_PAGES);
  const [editMode, setEditMode] = useState(false);
  const [tempSelection, setTempSelection] = useState(DEFAULT_PAGES);

  useEffect(() => {
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      setVisiblePages(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (menuOpen && editMode) {
      setTempSelection(visiblePages.length > 0 ? visiblePages : DEFAULT_PAGES);
    }
  }, [menuOpen, editMode, visiblePages]);

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
    setMenuOpen(false);
  };

  const handleNavigate = (page) => {
    navigate(createPageUrl(page));
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {visiblePages.slice(0, 4).map((page, index) => {
          const allPages = Object.values(PAGE_GROUPS).flat();
          const item = allPages.find(p => p.page === page);
          if (!item) return null;
          const Icon = item.icon;
          const isActive = currentPage === page;

          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] relative',
                isActive ? 'text-sidebar-primary bg-sidebar-accent/20' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              {editMode && (
                <Checkbox
                  checked={tempSelection.includes(page)}
                  className="absolute top-1 right-1 h-4 w-4 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTogglePage(page);
                  }}
                />
              )}
              <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5px]')} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Sheet open={menuOpen} onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) setEditMode(false);
        }}>
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <MoreHorizontal className="w-6 h-6" />
            <span>More</span>
          </button>
          <SheetContent side="bottom" className="h-[85vh] pb-0">
            <SheetHeader className="pb-4 border-b mb-4">
              <div className="flex justify-between items-center">
                <SheetTitle className="text-left">All Pages</SheetTitle>
                {editMode ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveCustomization}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditMode(true);
                      setTempSelection(visiblePages.length > 0 ? visiblePages : DEFAULT_PAGES);
                    }}
                  >
                    Customize
                  </Button>
                )}
              </div>
              {editMode && tempSelection.length < 4 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Select {4 - tempSelection.length} more to fill all slots
                </p>
              )}
              {editMode && tempSelection.length === 4 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ All 4 slots filled
                </p>
              )}
            </SheetHeader>

            <ScrollArea className="h-full pb-20">
              {Object.entries(PAGE_GROUPS).map(([groupName, pages]) => (
                <div key={groupName} className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {groupName}
                  </h3>
                  {pages.map((item) => {
                    const isChecked = tempSelection.includes(item.page);
                    return (
                      <button
                        key={item.page}
                        onClick={() => editMode ? handleTogglePage(item.page) : handleNavigate(item.page)}
                        className="w-full flex items-center justify-between p-3 hover:bg-accent rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {editMode ? (
                            <Checkbox
                              checked={isChecked}
                              className="mr-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <item.icon className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span className="text-sm">{item.label}</span>
                        </div>
                        {editMode ? (
                          <span className="text-xs text-muted-foreground">
                            {isChecked ? 'Selected' : 'Tap to select'}
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                  <Separator className="my-3" />
                </div>
              ))}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
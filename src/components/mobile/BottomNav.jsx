import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, MoreHorizontal, FileText, Users, Truck, Check, ChevronRight, Shield, Settings, BarChart2, Fuel, AlertTriangle, ClipboardList, BookOpen, Wrench, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const PAGE_GROUPS = {
  'OPERATIONS': [
    { label: 'Loads', page: 'Loads', icon: Container },
    { label: 'Upload Document', page: 'UploadDocument', icon: FileText },
    { label: 'Dispatch Board', page: 'DispatchBoard', icon: MapPin },
  ],
  'DIRECTORY': [
    { label: 'Companies', page: 'Companies', icon: Users },
    { label: 'Drivers', page: 'Drivers', icon: Users },
    { label: 'Trucks', page: 'Trucks', icon: Truck },
    { label: 'Trailers', page: 'Trailers', icon: Truck },
  ],
  'BILLING': [
    { label: 'Invoices', page: 'Invoices', icon: FileText },
    { label: 'Driver Statements', page: 'DriverStatements', icon: FileText },
    { label: 'Fuel Import', page: 'FuelImport', icon: Fuel },
  ],
  'SAFETY': [
    { label: 'Driver Qualifications', page: 'DriverQualifications', icon: Shield },
    { label: 'Driver Violations', page: 'DriverViolations', icon: AlertTriangle },
    { label: 'Drug & Alcohol Tests', page: 'DrugAlcoholTests', icon: ClipboardList },
    { label: 'Accidents & Claims', page: 'AccidentsClaims', icon: AlertTriangle },
    { label: 'License Expiration Warnings', page: 'LicenseExpirationWarnings', icon: AlertTriangle },
  ],
  'MAINTENANCE': [
    { label: 'Vehicle Maintenance', page: 'VehicleMaintenance', icon: Wrench },
    { label: 'Truck Inspections', page: 'TruckInspections', icon: Wrench },
    { label: 'Equipment Warnings', page: 'EquipmentWarnings', icon: AlertTriangle },
  ],
  'COMPLIANCE': [
    { label: 'IFTA Reporting', page: 'IFTAReports', icon: BookOpen },
    { label: 'Highway Use Tax', page: 'HighwayUseTax', icon: BookOpen },
    { label: 'Driver Docs', page: 'AdminDriverDocuments', icon: FileText },
  ],
  'ADMIN': [
    { label: 'Audit Log', page: 'AuditLogPage', icon: ClipboardList },
    { label: 'Settings', page: 'SettingsPage', icon: Settings },
  ],
  'REPORTS': [
    { label: 'Reports', page: 'Reports', icon: BarChart2 },
  ],
};

const ALL_PAGES = Object.values(PAGE_GROUPS).flat();
const DEFAULT_PAGES = ['Dashboard', 'Loads', 'Invoices', 'DriverStatements'];

// Dashboard nav item (always available for bottom nav selection)
const DASHBOARD_ITEM = { label: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard };
const ALL_PAGES_WITH_DASH = [DASHBOARD_ITEM, ...ALL_PAGES];

export default function BottomNav({ currentPage }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState(DEFAULT_PAGES);
  const [editMode, setEditMode] = useState(false);
  const [tempSelection, setTempSelection] = useState(DEFAULT_PAGES);
  const [overLimit, setOverLimit] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      try { setVisiblePages(JSON.parse(saved)); } catch {}
    }
  }, []);

  const handleTogglePage = (page) => {
    setOverLimit(false);
    setTempSelection(prev => {
      const isSelected = prev.includes(page);
      if (isSelected) return prev.filter(p => p !== page);
      if (prev.length >= 4) {
        setOverLimit(true);
        return prev;
      }
      return [...prev, page];
    });
  };

  const handleSaveCustomization = () => {
    localStorage.setItem('bottomNav_customization', JSON.stringify(tempSelection));
    setVisiblePages(tempSelection);
    setEditMode(false);
    // Stay in drawer (browse mode)
  };

  const handleNavigate = (page) => {
    navigate(createPageUrl(page));
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {visiblePages.slice(0, 4).map((page) => {
          const item = ALL_PAGES_WITH_DASH.find(p => p.page === page);
          if (!item) return null;
          const Icon = item.icon;
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => isActive
                ? document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
                : navigate(createPageUrl(page), { replace: true })
              }
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px]',
                isActive ? 'text-sidebar-primary bg-sidebar-accent/20' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              <span className="truncate max-w-full px-0.5" style={{ fontSize: '10px', lineHeight: '1.2' }}>
                {item.label === 'Driver Statements' ? 'Statements' : item.label}
              </span>
            </button>
          );
        })}

        <Sheet open={menuOpen} onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) { setEditMode(false); setOverLimit(false); }
        }}>
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>

          <SheetContent
            side="bottom"
            className="h-[85vh] pb-0 bg-sidebar text-sidebar-foreground border-t border-sidebar-border"
          >
            {/* Header */}
            <SheetHeader className="pb-3 border-b border-sidebar-border mb-0 px-4 pt-4">
              <div className="flex justify-between items-center">
                <SheetTitle className="text-left text-sidebar-foreground text-base font-semibold">
                  {editMode ? 'Customize Nav' : 'All Pages'}
                </SheetTitle>
                {editMode ? (
                  <Button
                    size="sm"
                    onClick={handleSaveCustomization}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Done
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 text-xs border border-sidebar-border"
                    onClick={() => {
                      setEditMode(true);
                      setTempSelection(visiblePages.length > 0 ? visiblePages : DEFAULT_PAGES);
                      setOverLimit(false);
                    }}
                  >
                    Customize
                  </Button>
                )}
              </div>
              {editMode && (
                <p className={cn("text-xs mt-1", overLimit ? 'text-red-400' : 'text-sidebar-foreground/50')}>
                  {overLimit
                    ? 'Unselect one first'
                    : tempSelection.length < 4
                      ? `Select ${4 - tempSelection.length} more`
                      : '4 / 4 slots filled'}
                </p>
              )}
            </SheetHeader>

            <ScrollArea className="h-[calc(85vh-80px)] pb-20">
              <div className="px-4 py-2">
                {/* Dashboard in customize mode */}
                {editMode && (
                  <div className="mb-3">
                    <h3 className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">NAVIGATION</h3>
                    {[DASHBOARD_ITEM].map((item) => {
                      const isChecked = tempSelection.includes(item.page);
                      return (
                        <button
                          key={item.page}
                          onClick={() => handleTogglePage(item.page)}
                          className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-sidebar-accent/60 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-[18px] h-[18px] rounded border flex items-center justify-center flex-shrink-0",
                              isChecked ? "bg-sidebar-primary border-sidebar-primary" : "border-sidebar-border"
                            )}>
                              {isChecked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm text-sidebar-foreground">{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                    <div className="my-2 border-b border-sidebar-border/50" />
                  </div>
                )}

                {Object.entries(PAGE_GROUPS).map(([groupName, pages]) => (
                  <div key={groupName} className="mb-3">
                    <h3 className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">
                      {groupName}
                    </h3>
                    {pages.map((item) => {
                      const isChecked = tempSelection.includes(item.page);
                      return (
                        <button
                          key={item.page}
                          onClick={() => editMode ? handleTogglePage(item.page) : handleNavigate(item.page)}
                          className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-sidebar-accent/60 rounded-md transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {editMode ? (
                              <div className={cn(
                                "w-[18px] h-[18px] rounded border flex items-center justify-center flex-shrink-0",
                                isChecked ? "bg-sidebar-primary border-sidebar-primary" : "border-sidebar-border"
                              )}>
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                            ) : (
                              <item.icon className="w-4 h-4 text-sidebar-foreground/50 flex-shrink-0" />
                            )}
                            <span className="text-sm text-sidebar-foreground">{item.label}</span>
                          </div>
                          {!editMode && (
                            <ChevronRight className="w-4 h-4 text-sidebar-foreground/30" />
                          )}
                        </button>
                      );
                    })}
                    <div className="my-2 border-b border-sidebar-border/50" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
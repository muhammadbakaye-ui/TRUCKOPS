import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Container, MoreHorizontal, FileText, Users, Truck, Check,
  ChevronRight, Shield, Settings, BarChart2, Fuel, AlertTriangle, ClipboardList,
  BookOpen, Wrench, MapPin, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
const DASHBOARD_ITEM = { label: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard };
const ALL_PAGES_WITH_DASH = [DASHBOARD_ITEM, ...ALL_PAGES];

const TAB_CHILD_PAGES = {
  Dashboard: [],
  Loads: ['LoadDetail', 'UploadDocument'],
  Invoices: ['InvoiceDetail'],
  DriverStatements: ['StatementBuilder'],
  Companies: ['CompanyDetail'],
  Drivers: ['DriverDetail'],
  Trucks: [],
  Trailers: [],
};

// ─── Custom draggable bottom sheet ──────────────────────────────────────────

function DraggableSheet({ open, onClose, children }) {
  const sheetRef = useRef(null);
  const dragState = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);

  // Open/close animation
  useEffect(() => {
    if (open) {
      setDragY(0);
      setVisible(true);
      setAnimating(false);
    } else {
      // Animate out
      setAnimating(true);
      setDragY(window.innerHeight);
      const t = setTimeout(() => { setVisible(false); setAnimating(false); }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const doClose = useCallback(() => {
    setAnimating(true);
    setDragY(window.innerHeight);
    setTimeout(() => {
      setVisible(false);
      setAnimating(false);
      onClose();
    }, 300);
  }, [onClose]);

  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    dragState.current = {
      startY: touch.clientY,
      lastY: touch.clientY,
      lastTime: Date.now(),
      velocity: 0,
    };
    setAnimating(false);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragState.current) return;
    const touch = e.touches[0];
    const now = Date.now();
    const dt = now - dragState.current.lastTime || 16;
    dragState.current.velocity = (touch.clientY - dragState.current.lastY) / dt;
    dragState.current.lastY = touch.clientY;
    dragState.current.lastTime = now;

    const dy = Math.max(0, touch.clientY - dragState.current.startY);
    setDragY(dy);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragState.current) return;
    const sheetH = sheetRef.current?.offsetHeight || window.innerHeight * 0.85;
    const threshold = sheetH * 0.4;
    const velocity = dragState.current.velocity;

    // Flick down (velocity > 0.4 px/ms) OR dragged past 40% → close
    if (velocity > 0.4 || dragY > threshold) {
      doClose();
    } else {
      // Snap back to open
      setAnimating(true);
      setDragY(0);
      setTimeout(() => setAnimating(false), 300);
    }
    dragState.current = null;
  }, [dragY, doClose]);

  if (!visible) return null;

  const translateY = dragY;
  const backdropOpacity = Math.max(0, 1 - dragY / (window.innerHeight * 0.5));

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: `rgba(0,0,0,${backdropOpacity * 0.5})`,
          transition: animating ? 'opacity 280ms ease-out' : 'none',
        }}
        onPointerDown={doClose}
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 61,
          height: '85vh',
          transform: `translateY(${translateY}px)`,
          transition: animating ? 'transform 280ms cubic-bezier(0.22,1,0.36,1)' : 'none',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'hsl(var(--sidebar-background))',
          borderTop: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        {/* Drag indicator pill */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'hsl(var(--sidebar-foreground) / 0.2)' }} />
        </div>

        {/* Draggable header row */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'none', flexShrink: 0 }}
        >
          {children[0]}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children[1]}
        </div>
      </div>
    </>
  );
}

// ─── Main BottomNav ──────────────────────────────────────────────────────────

export default function BottomNav({ currentPage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState(DEFAULT_PAGES);
  const [editMode, setEditMode] = useState(false);
  const [tempSelection, setTempSelection] = useState(DEFAULT_PAGES);
  const [overLimit, setOverLimit] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      try { setVisiblePages(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    for (const tab of visiblePages) {
      const children = TAB_CHILD_PAGES[tab] || [];
      if (currentPage === tab || children.includes(currentPage)) {
        sessionStorage.setItem(`bnav_stack_${tab}`, path);
        break;
      }
    }
  }, [location.pathname, location.search, currentPage, visiblePages]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setEditMode(false);
    setOverLimit(false);
    // Fix 1: blur the close button so focus ring never persists
    closeButtonRef.current?.blur();
    if (document.activeElement) document.activeElement.blur();
  }, []);

  const handleTogglePage = (page) => {
    setOverLimit(false);
    setTempSelection(prev => {
      const isSelected = prev.includes(page);
      if (isSelected) return prev.filter(p => p !== page);
      if (prev.length >= 4) { setOverLimit(true); return prev; }
      return [...prev, page];
    });
  };

  const handleSaveCustomization = () => {
    localStorage.setItem('bottomNav_customization', JSON.stringify(tempSelection));
    setVisiblePages(tempSelection);
    setEditMode(false);
  };

  const handleNavigate = useCallback((page) => {
    navigate(createPageUrl(page));
    setMenuOpen(false);
  }, [navigate]);

  const handleTabPress = useCallback((page) => {
    if (currentPage === page || (TAB_CHILD_PAGES[page] || []).includes(currentPage)) {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(createPageUrl(page));
  }, [navigate, currentPage]);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
      >
        {visiblePages.slice(0, 4).map((page) => {
          const item = ALL_PAGES_WITH_DASH.find(p => p.page === page);
          if (!item) return null;
          const Icon = item.icon;
          const childPages = TAB_CHILD_PAGES[page] || [];
          const isActive = currentPage === page || childPages.includes(currentPage);
          return (
            <button
              key={page}
              onClick={() => handleTabPress(page)}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer', minHeight: '56px', paddingLeft: 0, paddingRight: 0, maxWidth: 'none', fontSize: '10px' }}
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

        {/* More button */}
        <button
          onClick={() => setMenuOpen(true)}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer', minHeight: '56px', paddingLeft: 0, paddingRight: 0, maxWidth: 'none', fontSize: '10px' }}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-medium transition-colors select-none min-h-[56px] text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Custom draggable sheet */}
      <DraggableSheet open={menuOpen} onClose={closeMenu}>
        {/* Child 0: header (draggable) */}
        <div
          className="px-4 pb-3 border-b border-sidebar-border"
          style={{ color: 'hsl(var(--sidebar-foreground))' }}
        >
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-sidebar-foreground">
              {editMode ? 'Customize Nav' : 'All Pages'}
            </span>
            <div className="flex items-center gap-2">
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
              {/* X button — Fix 1: blur on tap */}
              <button
                ref={closeButtonRef}
                onClick={() => {
                  closeButtonRef.current?.blur();
                  closeMenu();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors focus:outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
        </div>

        {/* Child 1: scrollable content */}
        <ScrollArea className="h-full pb-20">
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
      </DraggableSheet>
    </>
  );
}
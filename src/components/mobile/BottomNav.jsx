import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Container, MoreHorizontal, FileText, Users, Truck, Check,
  ChevronRight, Shield, Settings, BarChart2, Fuel, AlertTriangle, ClipboardList,
  BookOpen, Wrench, X, LayoutGrid, Upload, Building2, Receipt, FileSpreadsheet,
  Banknote, Trash2, ShieldPlus, ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Authoritative page order — mirrors desktop sidebar exactly
const SIDEBAR_ORDER = [
  'Dashboard',
  'Loads', 'DispatchBoard', 'UploadDocument',
  'Companies', 'Drivers', 'Trucks', 'Trailers',
  'Invoices', 'FuelImport', 'DriverStatements', 'Taxes1099', 'Factoring',
  'DriverQualifications', 'DriverViolations', 'DrugAlcoholTests', 'AccidentsClaims', 'LicenseExpirationWarnings',
  'VehicleMaintenance', 'TruckInspections', 'EquipmentWarnings',
  'IFTAReports', 'InsurancePolicies', 'PermitsLicenses', 'HighwayUseTax',
  'AdminDriverDocuments',
  'Reports', 'AuditLogPage', 'DeletedItems', 'SettingsPage',
];

const PAGE_GROUPS = {
  'OPERATIONS': [
    { label: 'Loads', page: 'Loads', icon: Container },
    { label: 'Dispatch Board', page: 'DispatchBoard', icon: LayoutGrid },
    { label: 'Upload Doc', page: 'UploadDocument', icon: Upload },
  ],
  'DIRECTORY': [
    { label: 'Companies', page: 'Companies', icon: Building2 },
    { label: 'Drivers', page: 'Drivers', icon: Users },
    { label: 'Trucks', page: 'Trucks', icon: Truck },
    { label: 'Trailers', page: 'Trailers', icon: Container },
  ],
  'BILLING': [
    { label: 'Invoices', page: 'Invoices', icon: Receipt },
    { label: 'Fuel Import', page: 'FuelImport', icon: Fuel },
    { label: 'Statements', page: 'DriverStatements', icon: ClipboardList },
    { label: '1099s', page: 'Taxes1099', icon: FileSpreadsheet },
    { label: 'Factoring', page: 'Factoring', icon: Banknote },
  ],
  'SAFETY': [
    { label: 'Driver Qualifications', page: 'DriverQualifications', icon: Shield },
    { label: 'Driver Violations', page: 'DriverViolations', icon: AlertTriangle },
    { label: 'Drug & Alcohol Tests', page: 'DrugAlcoholTests', icon: ClipboardList },
    { label: 'Accidents & Claims', page: 'AccidentsClaims', icon: AlertTriangle },
    { label: 'License Warnings', page: 'LicenseExpirationWarnings', icon: AlertTriangle },
  ],
  'MAINTENANCE': [
    { label: 'Vehicle Maintenance', page: 'VehicleMaintenance', icon: Wrench },
    { label: 'Truck Inspections', page: 'TruckInspections', icon: Wrench },
    { label: 'Equipment Warnings', page: 'EquipmentWarnings', icon: AlertTriangle },
  ],
  'COMPLIANCE': [
    { label: 'IFTA Reports', page: 'IFTAReports', icon: BookOpen },
    { label: 'Insurance Policies', page: 'InsurancePolicies', icon: ShieldPlus },
    { label: 'Permits & Licenses', page: 'PermitsLicenses', icon: ScrollText },
    { label: 'Highway Use Tax', page: 'HighwayUseTax', icon: Banknote },
  ],
  'ADMIN': [
    { label: 'Driver Docs', page: 'AdminDriverDocuments', icon: FileText },
  ],
  'SYSTEM': [
    { label: 'Reports', page: 'Reports', icon: BarChart2 },
    { label: 'Audit Log', page: 'AuditLogPage', icon: ClipboardList },
    { label: 'Deleted Items', page: 'DeletedItems', icon: Trash2 },
    { label: 'Settings', page: 'SettingsPage', icon: Settings },
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
  const overlayRef = useRef(null);
  const touchState = useRef(null);
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (open) {
      isClosingRef.current = false;
      setVisible(true);
      // Animate in next frame
      requestAnimationFrame(() => {
        const el = sheetRef.current;
        if (!el) return;
        el.style.transition = 'none';
        el.style.transform = 'translateY(100%)';
        requestAnimationFrame(() => {
          el.style.transition = 'transform 280ms cubic-bezier(0.22,1,0.36,1)';
          el.style.transform = 'translateY(0)';
        });
      });
    } else if (visible) {
      animateClose();
    }
  }, [open]);

  const animateClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    const el = sheetRef.current;
    if (el) {
      el.style.transition = 'transform 280ms cubic-bezier(0.22,1,0.36,1)';
      el.style.transform = 'translateY(100%)';
    }
    const ov = overlayRef.current;
    if (ov) {
      ov.style.transition = 'opacity 280ms ease-out';
      ov.style.opacity = '0';
    }
    setTimeout(() => {
      setVisible(false);
      isClosingRef.current = false;
      onClose();
    }, 285);
  }, [onClose]);

  const onTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    const el = sheetRef.current;
    if (!el) return;
    // Remove transition so drag is instant
    el.style.transition = 'none';
    touchState.current = {
      startY: e.touches[0].clientY,
      lastY: e.touches[0].clientY,
      lastTime: Date.now(),
      velocity: 0,
    };
  }, []);

  const onTouchMove = useCallback((e) => {
    const ts = touchState.current;
    const el = sheetRef.current;
    const ov = overlayRef.current;
    if (!ts || !el) return;

    const now = Date.now();
    const currentY = e.touches[0].clientY;
    const dt = Math.max(now - ts.lastTime, 1);
    ts.velocity = (currentY - ts.lastY) / dt;
    ts.lastY = currentY;
    ts.lastTime = now;

    const delta = Math.max(0, currentY - ts.startY); // only downward
    el.style.transform = `translateY(${delta}px)`;

    // Fade backdrop proportionally
    if (ov) {
      const sheetH = el.offsetHeight || window.innerHeight * 0.85;
      const opacity = Math.max(0, 1 - delta / (sheetH * 0.7));
      ov.style.opacity = String(opacity);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const ts = touchState.current;
    const el = sheetRef.current;
    if (!ts || !el) return;
    touchState.current = null;

    const sheetH = el.offsetHeight || window.innerHeight * 0.85;
    // Read current translateY from inline style
    const match = el.style.transform.match(/translateY\(([\d.]+)px\)/);
    const currentDelta = match ? parseFloat(match[1]) : 0;
    const threshold = sheetH * 0.4;

    if (ts.velocity > 0.4 || currentDelta > threshold) {
      animateClose();
    } else {
      // Snap back open
      el.style.transition = 'transform 280ms cubic-bezier(0.22,1,0.36,1)';
      el.style.transform = 'translateY(0)';
      const ov = overlayRef.current;
      if (ov) {
        ov.style.transition = 'opacity 280ms ease-out';
        ov.style.opacity = '1';
      }
    }
  }, [animateClose]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.5)',
          opacity: 1,
        }}
        onPointerDown={animateClose}
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 61,
          height: '85vh',
          transform: 'translateY(100%)',
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

        {/* Draggable header row — touch handlers here, direct DOM manipulation */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'none', flexShrink: 0, cursor: 'grab' }}
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
    // Sort selected pages by their sidebar position
    const sorted = [...tempSelection].sort((a, b) => {
      const ai = SIDEBAR_ORDER.indexOf(a);
      const bi = SIDEBAR_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    localStorage.setItem('bottomNav_customization', JSON.stringify(sorted));
    setVisiblePages(sorted);
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
                <button
                  onClick={handleSaveCustomization}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sidebar-accent transition-colors focus:outline-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Done"
                >
                  <Check className="w-5 h-5 text-green-500" />
                </button>
              ) : (
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors focus:outline-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onClick={() => {
                    setEditMode(true);
                    setTempSelection(visiblePages.length > 0 ? visiblePages : DEFAULT_PAGES);
                    setOverLimit(false);
                  }}
                  aria-label="Customize"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              {/* X button — blur on tap */}
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
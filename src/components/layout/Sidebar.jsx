import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Truck, Users, Building2, Container,
  FileText, Receipt, Fuel, ClipboardList, BarChart3,
  Settings, History, Upload, ChevronLeft, ChevronRight, FolderOpen, Trash2,
  LayoutGrid, FileSpreadsheet, Banknote,
  ShieldCheck, AlertTriangle, FlaskConical, ShieldAlert, Bell,
  Wrench, ClipboardCheck, CircleAlert,
  Map, ShieldPlus, ScrollText, TableProperties
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '../shared/AppSession';
import { usePendingReviewCounts } from '@/hooks/usePendingReviewCounts';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { type: 'divider', label: 'OPERATIONS' },
  { label: 'Loads', icon: Container, page: 'Loads', tourAttr: 'loads-nav' },
  { label: 'Dispatch Board', icon: LayoutGrid, page: 'DispatchBoard' },
  { label: 'Upload Doc', icon: Upload, page: 'UploadDocument', tourAttr: 'upload-doc-nav' },
  { label: 'Data Sheets', icon: TableProperties, page: 'DataSheets' },
  { type: 'divider', label: 'DIRECTORY' },
  { label: 'Companies', icon: Building2, page: 'Companies' },
  { label: 'Drivers', icon: Users, page: 'Drivers' },
  { label: 'Trucks', icon: Truck, page: 'Trucks' },
  { label: 'Trailers', icon: Container, page: 'Trailers' },
  { type: 'divider', label: 'BILLING' },
  { label: 'Invoices', icon: Receipt, page: 'Invoices' },
  { label: 'Fuel Import', icon: Fuel, page: 'FuelImport', tourAttr: 'fuel-nav' },
  { label: 'Statements', icon: ClipboardList, page: 'DriverStatements', tourAttr: 'statements-nav' },
  { label: '1099s', icon: FileSpreadsheet, page: 'Taxes1099' },
  { label: 'Factoring', icon: Banknote, page: 'Factoring' },
  { type: 'divider', label: 'SAFETY' },
  { label: 'Driver Qualifications', icon: ShieldCheck, page: 'DriverQualifications' },
  { label: 'Driver Violations', icon: AlertTriangle, page: 'DriverViolations' },
  { label: 'Drug & Alcohol Tests', icon: FlaskConical, page: 'DrugAlcoholTests' },
  { label: 'Accidents & Claims', icon: ShieldAlert, page: 'AccidentsClaims' },
  { label: 'License Warnings', icon: Bell, page: 'LicenseExpirationWarnings' },
  { type: 'divider', label: 'MAINTENANCE' },
  { label: 'Vehicle Maintenance', icon: Wrench, page: 'VehicleMaintenance' },
  { label: 'Truck Inspections', icon: ClipboardCheck, page: 'TruckInspections' },
  { label: 'Equipment Warnings', icon: CircleAlert, page: 'EquipmentWarnings' },
  { type: 'divider', label: 'COMPLIANCE' },
  { label: 'IFTA Reports', icon: Map, page: 'IFTAReports' },
  { label: 'Insurance Policies', icon: ShieldPlus, page: 'InsurancePolicies' },
  { label: 'Permits & Licenses', icon: ScrollText, page: 'PermitsLicenses' },
  { label: 'Highway Use Tax', icon: Banknote, page: 'HighwayUseTax' },
  { type: 'divider', label: 'ADMIN' },
  { label: 'Driver Docs', icon: FolderOpen, page: 'AdminDriverDocuments' },
  { type: 'divider', label: 'SYSTEM' },
   { label: 'Reports', icon: BarChart3, page: 'Reports' },
   { label: 'Audit Log', icon: History, page: 'AuditLogPage' },
   { label: 'Deleted Items', icon: Trash2, page: 'DeletedItems' },
   { label: 'Settings', icon: Settings, page: 'SettingsPage' },
];

export default function Sidebar({ currentPage, collapsed, onToggle }) {
  const { session } = useSession();
  const companyName = session?.company_name || '';
  const pendingCounts = usePendingReviewCounts();
  const navRef = React.useRef(null);

  // Save scroll position before navigation
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (navRef.current) {
        sessionStorage.setItem('sidebar_scroll', navRef.current.scrollTop.toString());
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Restore scroll position on mount/route change
  React.useEffect(() => {
    const saved = sessionStorage.getItem('sidebar_scroll');
    if (saved && navRef.current) {
      navRef.current.scrollTop = parseInt(saved, 10);
    }
  }, [currentPage]);

  return (
    <div data-tour="sidebar" className={cn(
      "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-200 flex-shrink-0",
      collapsed ? "w-16" : "w-56 md:w-56"
    )}>
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/6a0409fc37a632ab53db20fd/34c5d2a43_TruckOpsLogo.png" alt="TruckOps" className="w-6 h-6 object-contain" />
            <span className="font-bold text-sidebar-primary-foreground text-sm tracking-wide">TRUCKOPS</span>
          </div>
        )}
        {collapsed && <img src="https://media.base44.com/images/public/6a0409fc37a632ab53db20fd/34c5d2a43_TruckOpsLogo.png" alt="TruckOps" className="w-6 h-6 object-contain mx-auto" />}
      </div>
      {!collapsed && (
        <div className="px-4 pb-2 border-b border-sidebar-border">
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#a855f7' }}>{companyName}</span>
        </div>
      )}

      {/* Nav */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item, i) => {
          if (item.type === 'divider') {
            return !collapsed ? (
              <div key={i} className="px-3 pt-4 pb-1.5">
                <span className="text-[10px] font-semibold text-sidebar-foreground/50 tracking-widest">{item.label}</span>
              </div>
            ) : <div key={i} className="my-2 border-t border-sidebar-border" />;
          }
          const Icon = item.icon;
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              data-tour={item.tourAttr}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-4 h-4" />
                {!collapsed && item.page === 'DriverQualifications' && pendingCounts.qualifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {!collapsed && item.page === 'DrugAlcoholTests' && pendingCounts.drugTests > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
                {!collapsed && item.page === 'TruckInspections' && pendingCounts.inspections > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-10 flex items-center justify-center border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
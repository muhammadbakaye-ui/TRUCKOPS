import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  LayoutDashboard, Truck, Users, Building2, Container,
  FileText, Receipt, Fuel, ClipboardList, BarChart3,
  Settings, History, Upload, ChevronLeft, ChevronRight, FolderOpen, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { type: 'divider', label: 'OPERATIONS' },
  { label: 'Loads', icon: Container, page: 'Loads' },
  { label: 'Upload Doc', icon: Upload, page: 'UploadDocument' },
  { type: 'divider', label: 'DIRECTORY' },
  { label: 'Companies', icon: Building2, page: 'Companies' },
  { label: 'Drivers', icon: Users, page: 'Drivers' },
  { label: 'Trucks', icon: Truck, page: 'Trucks' },
  { label: 'Trailers', icon: Container, page: 'Trailers' },
  { type: 'divider', label: 'BILLING' },
  { label: 'Invoices', icon: Receipt, page: 'Invoices' },
  { label: 'Fuel Import', icon: Fuel, page: 'FuelImport' },
  { label: 'Statements', icon: ClipboardList, page: 'DriverStatements' },
  { type: 'divider', label: 'ADMIN' },
  { label: 'Driver Docs', icon: FolderOpen, page: 'AdminDriverDocuments' },
  { type: 'divider', label: 'SYSTEM' },
  { label: 'Reports', icon: BarChart3, page: 'Reports' },
  { label: 'Audit Log', icon: History, page: 'AuditLogPage' },
  { label: 'Settings', icon: Settings, page: 'SettingsPage' },
];

export default function Sidebar({ currentPage, collapsed, onToggle }) {
  return (
    <div className={cn(
      "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-200",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-sidebar-primary" />
            <span className="font-bold text-sidebar-primary-foreground text-sm tracking-wide">TRUCKOPS</span>
          </div>
        )}
        {collapsed && <Truck className="w-6 h-6 text-sidebar-primary mx-auto" />}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
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
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
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
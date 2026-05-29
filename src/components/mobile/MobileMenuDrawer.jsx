import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  X, LogOut, FolderOpen, Users, Truck, ClipboardList, Shield, Wrench, 
  FileText, Settings, BarChart3, Upload, ChevronRight, Container, 
  Package, FileCheck, AlertTriangle, Calendar, CheckCircle, AlertCircle, Grid3x3
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSession } from '../shared/AppSession';

const MENU_SECTIONS = [
  {
    title: 'Operations',
    icon: FolderOpen,
    items: [
      { label: 'Loads', page: 'Loads', icon: Container },
      { label: 'Upload Document', page: 'UploadDocument', icon: Upload },
      { label: 'Dispatch Board', page: 'DispatchBoard', icon: ClipboardList },
    ],
  },
  {
    title: 'Directory',
    icon: Users,
    items: [
      { label: 'Companies', page: 'Companies', icon: Users },
      { label: 'Drivers', page: 'Drivers', icon: Users },
      { label: 'Trucks', page: 'Trucks', icon: Truck },
      { label: 'Trailers', page: 'Trailers', icon: Package },
    ],
  },
  {
    title: 'Billing',
    icon: FileText,
    items: [
      { label: 'Invoices', page: 'Invoices', icon: FileText },
      { label: 'Driver Statements', page: 'DriverStatements', icon: FileText },
      { label: 'Fuel Import', page: 'FuelImport', icon: FileText },
    ],
  },
  {
    title: 'Safety',
    icon: Shield,
    items: [
      { label: 'Driver Qualifications', page: 'DriverQualifications', icon: FileCheck },
      { label: 'Driver Violations', page: 'DriverViolations', icon: AlertTriangle },
      { label: 'Drug & Alcohol Tests', page: 'DrugAlcoholTests', icon: Shield },
      { label: 'Accidents & Claims', page: 'AccidentsClaims', icon: AlertCircle },
      { label: 'License Expiration Warnings', page: 'LicenseExpirationWarnings', icon: Calendar },
    ],
  },
  {
    title: 'Maintenance',
    icon: Wrench,
    items: [
      { label: 'Vehicle Maintenance', page: 'VehicleMaintenance', icon: Wrench },
      { label: 'Truck Inspections', page: 'TruckInspections', icon: CheckCircle },
      { label: 'Equipment Warnings', page: 'EquipmentWarnings', icon: AlertTriangle },
    ],
  },
  {
    title: 'Compliance',
    icon: FileText,
    items: [
      { label: 'IFTA Reports', page: 'IFTAReports', icon: FileText },
      { label: 'Highway Use Tax', page: 'HighwayUseTax', icon: FileText },
      { label: 'Driver Documents', page: 'AdminDriverDocuments', icon: FileText },
    ],
  },
  {
    title: 'Admin',
    icon: Settings,
    items: [
      { label: 'System Admins', page: 'SystemAdmins', icon: Settings },
      { label: 'Audit Log', page: 'AuditLogPage', icon: FileText },
      { label: 'Settings', page: 'SettingsPage', icon: Settings },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    items: [
      { label: 'Reports', page: 'Reports', icon: BarChart3 },
    ],
  },
];

export default function MobileMenuDrawer({ open, onOpenChange, currentPage, onCustomizeClick }) {
  const { logout, session } = useSession();
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      setSelected(JSON.parse(saved));
    } else {
      setSelected(['Dashboard', 'Loads']);
    }
  }, [open]);

  const handleToggle = (page) => {
    setSelected(prev => {
      const isSelected = prev.includes(page);
      if (isSelected) {
        return prev.filter(p => p !== page);
      } else {
        if (prev.length < 5) {
          return [...prev, page];
        }
        return prev;
      }
    });
  };

  const handleSaveCustomization = () => {
    localStorage.setItem('bottomNav_customization', JSON.stringify(selected));
    setEditMode(false);
    window.location.reload();
  };

  const handleLogout = () => {
    onOpenChange(false);
    setTimeout(() => logout(), 300);
  };

  return (
    <SheetContent 
      side="bottom" 
      className="h-[85vh] flex flex-col p-0 bg-sidebar border-t border-sidebar-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
       <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar-accent/20">
        <div>
          <h2 className="text-lg font-semibold text-sidebar-foreground">{editMode ? 'Customize Menu' : 'Menu'}</h2>
          <p className="text-xs text-sidebar-foreground/60">{editMode ? `${selected.length} of 5 selected` : session?.company_name || 'TruckOps'}</p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleSaveCustomization}
            >
              Save
            </Button>
          )}
          {!editMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditMode(true)}
              className="text-sidebar-foreground hover:bg-sidebar-accent/50"
              title="Customize bottom menu"
            >
              <Grid3x3 className="w-5 h-5" />
            </Button>
          )}
          {editMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditMode(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
          {!editMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Menu */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {MENU_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <SectionIcon className="w-4 h-4 text-sidebar-primary" />
                  <h3 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wide">
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.page;
                    return editMode ? (
                      <button
                        key={item.page}
                        onClick={() => handleToggle(item.page)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg transition-colors min-h-[48px]',
                          'text-sidebar-foreground/80 hover:bg-sidebar-accent/30'
                        )}
                      >
                        <Checkbox
                          checked={selected.includes(item.page)}
                          disabled={!selected.includes(item.page) && selected.length >= 5}
                          className="h-5 w-5"
                          onClick={e => {
                            e.stopPropagation();
                            handleToggle(item.page);
                          }}
                        />
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    ) : (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg transition-colors min-h-[48px]',
                          isActive 
                            ? 'bg-sidebar-primary/20 text-sidebar-primary' 
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/30'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Separator className="my-4 bg-sidebar-border" />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Logout Button at Bottom */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent/50 hover:text-destructive"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>
      </div>
    </SheetContent>
  );
}
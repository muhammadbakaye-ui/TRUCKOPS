import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, ClipboardList, Receipt, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const BOTTOM_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { label: 'Loads', icon: Container, page: 'Loads' },
  { label: 'Statements', icon: ClipboardList, page: 'DriverStatements' },
  { label: 'Invoices', icon: Receipt, page: 'Invoices' },
  { label: 'Settings', icon: Settings, page: 'SettingsPage' },
];

export default function BottomNav({ currentPage }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {BOTTOM_NAV_ITEMS.map(({ label, icon: Icon, page }) => {
        const isActive = currentPage === page;
        return (
          <Link
            key={page}
            to={createPageUrl(page)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors select-none',
              isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
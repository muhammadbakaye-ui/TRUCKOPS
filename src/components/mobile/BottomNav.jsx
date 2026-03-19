import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Container, ClipboardList, Receipt, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '../shared/AppSession';

const BOTTOM_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', tourAttr: 'mobile-nav-dashboard' },
  { label: 'Loads', icon: Container, page: 'Loads', tourAttr: 'mobile-nav-loads' },
  { label: 'Statements', icon: ClipboardList, page: 'DriverStatements', tourAttr: 'mobile-nav-statements' },
  { label: 'Invoices', icon: Receipt, page: 'Invoices', tourAttr: 'mobile-nav-invoices' },
];

export default function BottomNav({ currentPage }) {
  const { logout } = useSession();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border flex z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {BOTTOM_NAV_ITEMS.map(({ label, icon: Icon, page, tourAttr }) => {
        const isActive = currentPage === page;
        return (
          <Link
            key={page}
            to={createPageUrl(page)}
            data-tour={tourAttr}
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

      {/* Logout button */}
      <button
        onClick={logout}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-sidebar-foreground/60 select-none"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </nav>
  );
}
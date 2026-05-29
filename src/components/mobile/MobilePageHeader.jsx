import React from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobilePageHeader({ title, onBellClick, onHelpClick, showBell = true, showHelp = true }) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <h1 className="text-lg font-bold text-sidebar-foreground truncate">
        {title}
      </h1>
      <div className="flex items-center gap-4">
        {showBell && (
          <button
            onClick={onBellClick}
            className="text-sidebar-foreground hover:text-sidebar-primary transition-colors"
          >
            <Bell className="w-6 h-6" />
          </button>
        )}
        {showHelp && (
          <button
            onClick={onHelpClick}
            className="text-sidebar-foreground hover:text-sidebar-primary transition-colors"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
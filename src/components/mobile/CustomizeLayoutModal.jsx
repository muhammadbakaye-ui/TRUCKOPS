import React, { useState, useEffect } from 'react';
import { X, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createPageUrl } from '@/utils';

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', page: 'Dashboard', icon: '📊' },
  { label: 'Loads', page: 'Loads', icon: '📦' },
  { label: 'Invoices', page: 'Invoices', icon: '📄' },
  { label: 'Driver Statements', page: 'DriverStatements', icon: '📝' },
  { label: 'Companies', page: 'Companies', icon: '🏢' },
  { label: 'Drivers', page: 'Drivers', icon: '👤' },
  { label: 'Trucks', page: 'Trucks', icon: '🚛' },
  { label: 'Reports', page: 'Reports', icon: '📊' },
];

export default function CustomizeLayoutModal({ open, onOpenChange }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    // Load saved preferences
    const saved = localStorage.getItem('bottomNav_customization');
    if (saved) {
      setSelected(JSON.parse(saved));
    } else {
      // Default: Dashboard, Loads
      setSelected(['Dashboard', 'Loads']);
    }
  }, [open]);

  const handleToggle = (page) => {
    setSelected(prev => {
      const isSelected = prev.includes(page);
      if (isSelected) {
        return prev.filter(p => p !== page);
      } else {
        // Max 5 buttons
        if (prev.length < 5) {
          return [...prev, page];
        }
        return prev;
      }
    });
  };

  const handleSave = () => {
    localStorage.setItem('bottomNav_customization', JSON.stringify(selected));
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelected(['Dashboard', 'Loads']);
    localStorage.setItem('bottomNav_customization', JSON.stringify(['Dashboard', 'Loads']));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" />
            Customize Bottom Menu
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Select up to 5 buttons to display. The More button will always appear on the right.
          </p>
        </SheetHeader>

        <div className="space-y-2 py-4 max-h-[60vh] overflow-y-auto">
          {ALL_NAV_ITEMS.map(item => (
            <button
              key={item.page}
              onClick={() => handleToggle(item.page)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
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
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{item.label}</div>
              </div>
              {selected.includes(item.page) && (
                <div className="text-xs text-muted-foreground">
                  #{selected.indexOf(item.page) + 1}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 border-t border-border pt-4 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="flex-1 text-xs"
          >
            Save Customization
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
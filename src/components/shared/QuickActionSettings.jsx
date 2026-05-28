import React, { useState, useRef, useEffect } from 'react';
import { Settings, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

/**
 * Reusable Quick Action toggle + gear popover.
 * Props:
 *   enabled       bool
 *   onToggle      () => void
 *   action        string (current selected action value)
 *   onActionChange (value) => void
 *   options       [{value, label}]
 *   label         string (default "Quick Actions")
 */
export default function QuickActionSettings({ enabled, onToggle, action, onActionChange, options, label = 'Quick Actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentLabel = options.find(o => o.value === action)?.label || action;

  return (
    <div className="flex items-center gap-1.5 border border-input rounded-md px-2 h-8 bg-background" ref={ref}>
      <Zap className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <Switch checked={enabled} onCheckedChange={onToggle} className="scale-75" />
      {enabled && (
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Configure quick action"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {open && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
              <p className="text-xs font-medium text-foreground mb-2">Quick Action Button</p>
              <select
                value={action}
                onChange={e => { onActionChange(e.target.value); setOpen(false); }}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                {options.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-2">
                Clicking <strong>"{currentLabel}"</strong> on any row will instantly apply this status.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
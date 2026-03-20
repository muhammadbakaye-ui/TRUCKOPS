import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MultiSelectFilter({ label, options, selected, onChange, width = 'w-36' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const hasFilter = selected.length > 0;
  const displayLabel = hasFilter
    ? selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label || selected[0])
      : `${label} (${selected.length})`
    : label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between gap-1 h-8 px-3 text-xs rounded-md border border-input bg-background shadow-sm transition-colors hover:bg-accent',
          width,
          hasFilter && 'border-primary text-primary'
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {hasFilter && (
            <span
              className="hover:bg-primary/20 rounded p-0.5"
              onMouseDown={e => { e.stopPropagation(); onChange([]); }}
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-popover border rounded-md shadow-md py-1 min-w-[160px] max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent text-left"
            >
              <div className={cn(
                'w-4 h-4 border rounded flex items-center justify-center shrink-0',
                selected.includes(opt.value) ? 'bg-primary border-primary' : 'border-input'
              )}>
                {selected.includes(opt.value) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
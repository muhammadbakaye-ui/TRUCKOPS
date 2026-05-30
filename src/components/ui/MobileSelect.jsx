import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Check } from 'lucide-react';

/**
 * MobileSelect — drop-in replacement for the standard Select.
 * On desktop (md+): renders the standard Radix Select popover.
 * On mobile (<md):  renders a full-width bottom Sheet with large tap targets.
 *
 * Props:
 *   value           – current value
 *   onValueChange   – (value: string) => void
 *   options         – [{ value, label }]
 *   disabled        – boolean
 *   triggerClassName – className forwarded to the trigger element
 *   placeholder     – string shown when no value selected
 */
export default function MobileSelect({
  value,
  onValueChange,
  options = [],
  disabled,
  triggerClassName = '',
  placeholder = 'Select…',
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <>
      {/* ── Desktop: standard Radix Select ── */}
      <div className="hidden md:block">
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger className={triggerClassName}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Mobile: button trigger + bottom Sheet ── */}
      <div className="md:hidden">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={`${triggerClassName} flex items-center justify-between gap-1 cursor-pointer`}
        >
          <span className="truncate flex-1 text-left">{currentLabel}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="flex-shrink-0 opacity-50">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="h-auto"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <SheetHeader className="pb-3 border-b border-border">
              <SheetTitle className="text-sm text-left">Select an option</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto max-h-[50vh] divide-y divide-border/50">
              {options.map(opt => (
                <button
                  key={opt.value}
                  className="w-full flex items-center justify-between px-4 py-4 text-sm text-left hover:bg-muted/50 active:bg-muted transition-colors"
                  onClick={() => {
                    onValueChange?.(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className={opt.value === value ? 'font-semibold text-primary' : 'text-foreground'}>
                    {opt.label}
                  </span>
                  {opt.value === value && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
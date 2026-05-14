import React, { useState, useEffect } from 'react';
import { useStatementSettings } from '@/hooks/useStatementSettings';
import { DAY_NAMES, getRecentPeriods } from '@/components/shared/statementCalendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function StatementSettings() {
  const { weekStart, dueDay, saving, save } = useStatementSettings();
  const [localWeekStart, setLocalWeekStart] = useState(weekStart);
  const [localDueDay, setLocalDueDay] = useState(dueDay);
  const [saved, setSaved] = useState(false);

  // Sync once loaded from DB
  useEffect(() => { setLocalWeekStart(weekStart); }, [weekStart]);
  useEffect(() => { setLocalDueDay(dueDay); }, [dueDay]);

  const isDirty = localWeekStart !== weekStart || localDueDay !== dueDay;

  const handleSave = async () => {
    await save(localWeekStart, localDueDay);
    setSaved(true);
    toast.success('Statement settings saved');
    setTimeout(() => setSaved(false), 2500);
  };

  // Preview: show 3 upcoming periods with current selections
  const preview = getRecentPeriods(0, 3, { weekStart: localWeekStart, dueDay: localDueDay });
  const periodEndDay = DAY_NAMES[(localWeekStart + 6) % 7];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          Statement Period Settings
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Configure your weekly statement cycle. Changes apply to new statements only — existing statements are not affected.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-md">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Period Starts On</Label>
            <Select value={String(localWeekStart)} onValueChange={(v) => setLocalWeekStart(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Period ends on {periodEndDay} (7 days later)
            </p>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Statement Due Day</Label>
            <Select value={String(localDueDay)} onValueChange={(v) => setLocalDueDay(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, i) => (
                  <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Day of the week following the period end
            </p>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Preview — Upcoming Periods</p>
        <div className="border rounded-lg divide-y text-xs overflow-hidden">
          <div className="grid grid-cols-3 bg-muted px-3 py-2 font-semibold text-muted-foreground">
            <span>Period Start</span>
            <span>Period End</span>
            <span>Due Date</span>
          </div>
          {preview.map((p, i) => (
            <div key={i} className={`grid grid-cols-3 px-3 py-2 ${i === 0 ? 'bg-primary/5 font-medium' : ''}`}>
              <span>{format(parseISO(p.start), 'MMM d, yyyy')}</span>
              <span>{format(parseISO(p.end), 'MMM d, yyyy')}</span>
              <span className="text-primary font-semibold">{format(parseISO(p.due), 'MMM d, yyyy')}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          The highlighted row is the current period. Due dates are highlighted in the statement calendar.
        </p>
      </div>

      <Button
        size="sm"
        className="h-9 gap-2"
        onClick={handleSave}
        disabled={saving || !isDirty}
      >
        {saving
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          : saved
          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
          : 'Save Statement Settings'
        }
      </Button>
    </div>
  );
}
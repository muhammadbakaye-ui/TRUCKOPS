import React from 'react';
import { useTheme } from '@/lib/useTheme';
import { useTimezone, TIMEZONES } from '@/lib/useTimezone';
import { Sun, Moon, MoonStar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatementSettings from './StatementSettings';

export default function GeneralSettings() {
  const [theme, setTheme] = useTheme();
  const [timezone, setTimezone] = useTimezone();

  const options = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      preview: { bg: 'bg-gray-100', card: 'bg-white', text: 'text-gray-800', sidebar: 'bg-slate-800' },
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      preview: { bg: 'bg-slate-700', card: 'bg-slate-600', text: 'text-gray-200', sidebar: 'bg-slate-900' },
    },
    {
      value: 'very-dark',
      label: 'Very Dark',
      icon: MoonStar,
      preview: { bg: 'bg-slate-900', card: 'bg-slate-800', text: 'text-blue-400', sidebar: 'bg-slate-950' },
    },
  ];

  return (
    <div className="mt-6 max-w-lg space-y-8">
      <div>
        <h2 className="text-base font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-muted-foreground mb-4">Choose your preferred color theme.</p>
        <div className="grid grid-cols-3 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Mini preview */}
                <div className={`rounded-md overflow-hidden mb-2 h-16 flex ${opt.preview.bg}`}>
                  <div className={`w-1/4 h-full ${opt.preview.sidebar}`} />
                  <div className="flex-1 p-1 flex flex-col gap-1">
                    <div className={`rounded h-2 w-3/4 ${opt.preview.card}`} />
                    <div className={`rounded h-2 w-1/2 ${opt.preview.card}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-1">Timezone</h2>
        <p className="text-sm text-muted-foreground mb-3">Select your timezone for displaying dates and times.</p>
        <div className="w-48">
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz} className="text-xs">
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-6">
        <StatementSettings />
      </div>
    </div>
  );
}
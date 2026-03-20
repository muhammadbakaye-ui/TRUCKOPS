import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/lib/useTheme';

export default function GeneralSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">Choose how the app looks for you.</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
              theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
            }`}
          >
            {/* Light mode preview */}
            <div className="w-24 h-16 rounded overflow-hidden border border-border flex">
              <div className="w-7 bg-slate-800 h-full" />
              <div className="flex-1 flex flex-col">
                <div className="h-4 bg-white border-b border-border" />
                <div className="flex-1 bg-slate-100" />
              </div>
            </div>
            <span className="text-xs font-medium">Light</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
              theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
            }`}
          >
            {/* Dark mode preview */}
            <div className="w-24 h-16 rounded overflow-hidden border border-border flex">
              <div className="w-7 bg-slate-800 h-full" />
              <div className="flex-1 flex flex-col">
                <div className="h-4 bg-slate-700 border-b border-slate-600" />
                <div className="flex-1 bg-slate-800" />
              </div>
            </div>
            <span className="text-xs font-medium">Dark</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
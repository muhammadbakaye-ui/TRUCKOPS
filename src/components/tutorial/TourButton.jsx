import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TourButton({ onClick }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
      title="App Tour"
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span className="hidden md:inline">Help</span>
    </Button>
  );
}
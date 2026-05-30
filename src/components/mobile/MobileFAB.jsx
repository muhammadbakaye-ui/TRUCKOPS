import React from 'react';
import { Plus } from 'lucide-react';

export default function MobileFAB({ onClick, title = 'New' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="md:hidden fixed z-40 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
      style={{
        bottom: '80px',
        right: '16px',
        width: '48px',
        height: '48px',
        touchAction: 'manipulation',
      }}
    >
      <Plus className="w-6 h-6" strokeWidth={2.5} />
    </button>
  );
}
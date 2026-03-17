import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Truck, FileText, Fuel, BarChart3, Calendar, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const slides = [
  {
    icon: Truck,
    color: 'from-blue-600 to-blue-800',
    iconBg: 'bg-blue-500/20',
    title: 'Load Management',
    subtitle: 'Full dispatch visibility',
    description: 'Track every load from pickup to delivery. Assign drivers and trucks, manage stops, and monitor dispatch status in real time.',
    features: ['Create & manage loads', 'Multi-stop routing', 'Driver & truck assignments', 'Real-time status tracking'],
  },
  {
    icon: FileText,
    color: 'from-purple-600 to-purple-800',
    iconBg: 'bg-purple-500/20',
    title: 'Driver Statements',
    subtitle: 'Weekly settlement builder',
    description: 'Build weekly pay statements for each driver. Auto-pull trips and fuel, add deductions, and publish directly to the driver portal.',
    features: ['Auto-load trips by period', 'Pull fuel card charges', 'Quick deduction buttons', 'One-click publish to driver'],
  },
  {
    icon: Fuel,
    color: 'from-orange-600 to-orange-800',
    iconBg: 'bg-orange-500/20',
    title: 'Fuel Card Import',
    subtitle: 'Automated matching',
    description: 'Import fuel card files and automatically match transactions to drivers and trucks. Review exceptions and attach charges to statements.',
    features: ['Bulk CSV import', 'Auto driver matching', 'Exception review', 'Statement integration'],
  },
  {
    icon: Calendar,
    color: 'from-green-600 to-green-800',
    iconBg: 'bg-green-500/20',
    title: 'Driver Portal',
    subtitle: 'Self-service for drivers',
    description: 'Drivers log in with their name and truck ID. They can view published statements, download pay stubs, and upload BOLs & rate confirmations.',
    features: ['Weekly statement view', 'PDF download', 'BOL upload', 'Rate confirmation upload'],
  },
  {
    icon: BarChart3,
    color: 'from-cyan-600 to-cyan-800',
    iconBg: 'bg-cyan-500/20',
    title: 'Invoices & Reports',
    subtitle: 'Financials at a glance',
    description: 'Generate customer invoices, track payment status, and view revenue reports. Keep your accounting organized in one place.',
    features: ['Customer invoicing', 'Payment tracking', 'Revenue reporting', 'Export & print'],
  },
  {
    icon: Upload,
    color: 'from-rose-600 to-rose-800',
    iconBg: 'bg-rose-500/20',
    title: 'Document Management',
    subtitle: 'All files in one place',
    description: 'Attach BOLs, rate confirmations, and other documents to loads. Drivers can upload directly from the portal for instant admin visibility.',
    features: ['File uploads', 'Document types (BOL, RC)', 'Admin review queue', 'Driver submissions'],
  },
];

export default function PreLoginSlideshow({ onClose }) {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState('right');

  const go = (to) => {
    if (animating) return;
    setDirection(to > current ? 'right' : 'left');
    setAnimating(true);
    setTimeout(() => {
      setCurrent(to);
      setAnimating(false);
    }, 250);
  };

  const prev = () => go(current === 0 ? slides.length - 1 : current - 1);
  const next = () => go(current === slides.length - 1 ? 0 : current + 1);

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [current, animating]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${slide.color} p-8 relative overflow-hidden`}
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${direction === 'right' ? '40px' : '-40px'})` : 'translateX(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-8 -translate-x-6" />

          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${slide.iconBg} mb-4`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">{slide.title}</h2>
          <p className="text-white/60 text-sm mt-1 font-medium">{slide.subtitle}</p>
        </div>

        {/* Content */}
        <div
          className="p-6 space-y-4"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${direction === 'right' ? '40px' : '-40px'})` : 'translateX(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>

          <ul className="space-y-2">
            {slide.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`rounded-full transition-all ${
                  i === current ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={prev}>
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">{current + 1} / {slides.length}</span>
            {current < slides.length - 1 ? (
              <Button size="sm" className="h-8 gap-1 text-xs" onClick={next}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={onClose}>
                Get Started
              </Button>
            )}
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
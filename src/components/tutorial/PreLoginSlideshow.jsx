import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const slides = [
  {
    accentColor: '#2563eb',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
    title: 'Auto-Create Loads from Documents',
    subtitle: '🚀 The #1 time-saver',
    description: 'Drop a rate confirmation or BOL and AI instantly extracts everything — customer, rate, stops, dates — and creates a complete load. No manual entry needed.',
    features: ['Rate confirmations & BOLs', 'AI reads all fields automatically', 'Multi-stop routes extracted', 'Opens load for review immediately'],
    screenshot: 'https://media.base44.com/images/public/69b24502c9911b8d836f6df2/5caf41bb2_image.png',
    screenshotAlt: 'Upload Document page',
  },
  {
    accentColor: '#475569',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    title: 'Load Management',
    subtitle: 'Full dispatch visibility',
    description: 'Track every load from pickup to delivery. Assign drivers and trucks, manage stops, and monitor dispatch status in real time.',
    features: ['Create & manage loads', 'Multi-stop routing', 'Driver & truck assignments', 'Real-time status tracking'],
    screenshot: null,
    screenshotAlt: 'Loads dashboard',
  },
  {
    accentColor: '#7c3aed',
    gradient: 'linear-gradient(135deg, #3b1f6e 0%, #6d28d9 100%)',
    title: 'Driver Statements',
    subtitle: 'Weekly settlement builder',
    description: 'Build weekly pay statements for each driver. Auto-pull trips and fuel, add deductions, and publish directly to the driver portal.',
    features: ['Auto-load trips by period', 'Pull fuel card charges', 'Quick deduction buttons', 'One-click publish to driver'],
    screenshot: null,
    screenshotAlt: 'Driver statement builder',
  },
  {
    accentColor: '#ea580c',
    gradient: 'linear-gradient(135deg, #431407 0%, #c2410c 100%)',
    title: 'Fuel Card Import',
    subtitle: 'Automated matching',
    description: 'Import fuel card files and automatically match transactions to drivers and trucks. Review exceptions and attach charges to statements.',
    features: ['Bulk CSV import', 'Auto driver matching', 'Exception review', 'Statement integration'],
    screenshot: null,
    screenshotAlt: 'Fuel import dashboard',
  },
  {
    accentColor: '#16a34a',
    gradient: 'linear-gradient(135deg, #052e16 0%, #15803d 100%)',
    title: 'Driver Portal',
    subtitle: 'Self-service for drivers',
    description: 'Drivers log in with their name and truck ID. They can view published statements, download pay stubs, and upload BOLs & rate confirmations.',
    features: ['Weekly statement view', 'PDF download', 'BOL & RC upload', 'Instant dispatcher notification'],
    screenshot: null,
    screenshotAlt: 'Driver portal view',
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Screenshot header */}
        <div
          className="relative overflow-hidden"
          style={{
            background: slide.gradient,
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${direction === 'right' ? '40px' : '-40px'})` : 'translateX(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            height: 200,
          }}
        >
          {slide.screenshot ? (
            <>
              {/* Real app screenshot — shown prominently */}
              <img
                src={slide.screenshot}
                alt={slide.screenshotAlt}
                className="absolute inset-0 w-full h-full object-cover object-top"
                style={{ opacity: 0.55 }}
              />
              {/* Gradient fade at bottom so text is readable */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
            </>
          ) : (
            <>
              {/* Decorative circles fallback */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-8 -translate-x-6" />
            </>
          )}

          {/* Title overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <p className="text-white/60 text-[10px] font-semibold tracking-widest uppercase mb-1">{slide.subtitle}</p>
            <h2 className="text-lg font-bold text-white leading-tight drop-shadow">{slide.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div
          className="p-5 space-y-4"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? `translateX(${direction === 'right' ? '40px' : '-40px'})` : 'translateX(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>

          <ul className="space-y-1.5">
            {slide.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
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
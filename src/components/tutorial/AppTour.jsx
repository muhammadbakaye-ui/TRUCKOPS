import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Admin tour steps — each step targets an element by data-tour attribute
export const ADMIN_TOUR_STEPS = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    description: 'Use the sidebar to navigate between Loads, Drivers, Invoices, Statements, and more. Click the arrow to collapse it.',
    placement: 'right',
  },
  {
    target: '[data-tour="upload-doc-nav"]',
    title: '🚀 Upload Doc — The Star Feature',
    description: 'Drop a rate confirmation or BOL here and the AI will automatically read it and create a fully populated load — no manual entry needed. This is the fastest way to create loads.',
    placement: 'right',
  },
  {
    target: '[data-tour="loads-nav"]',
    title: 'Loads',
    description: 'View and manage all your freight loads. Assign drivers, trucks, stops, and track dispatch status from start to finish.',
    placement: 'right',
  },
  {
    target: '[data-tour="statements-nav"]',
    title: 'Driver Statements',
    description: 'Build weekly pay statements. Auto-pull trips and fuel charges, add deductions, and publish directly to each driver\'s portal.',
    placement: 'right',
  },
  {
    target: '[data-tour="fuel-nav"]',
    title: 'Fuel Import',
    description: 'Import fuel card CSV files. Transactions are automatically matched to drivers and attached to pay statements.',
    placement: 'right',
  },
  {
    target: '[data-tour="topbar-search"]',
    title: 'Quick Search',
    description: 'Search for loads, invoices, and more across the entire system from any page.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="notification-bell"]',
    title: 'Notifications',
    description: 'See alerts when drivers upload documents or statements are ready for review.',
    placement: 'bottom',
  },
];

// Upload page tour — shown when on the UploadDocument page
export const UPLOAD_TOUR_STEPS = [
  {
    target: '[data-tour="upload-dropzone"]',
    title: '🚀 Auto-Create Loads from Documents',
    description: 'This is the #1 time-saver in the app. Drop a rate confirmation or BOL here and AI will instantly extract all the load details — customer, rate, stops, dates — and create a complete load automatically. No manual entry!',
    placement: 'bottom',
  },
];

export const DRIVER_TOUR_STEPS = [
  {
    target: '[data-tour="driver-documents-tab"]',
    title: 'My Documents',
    description: 'Upload your Bills of Lading (BOL) and Rate Confirmations here. Your dispatcher will be notified immediately when you upload.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="driver-upload-bol"]',
    title: 'Upload BOL',
    description: 'Tap here to upload a Bill of Lading after completing a delivery. Supports PDF, JPG, and PNG formats.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="driver-upload-rc"]',
    title: 'Upload Rate Confirmation',
    description: 'Upload rate confirmations for your loads here. These go directly to your dispatcher for review.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="driver-statements-tab"]',
    title: 'My Statements',
    description: 'View your weekly pay statements here. Each statement shows your trips, deductions, fuel charges, and your final net pay for the week.',
    placement: 'bottom',
  },
];

function getRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function TooltipBox({ step, onPrev, onNext, onClose, current, total }) {
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    setVisible(false);

    // Continuously track the element's position via rAF (don't null-reset so no flash)
    let running = true;
    const track = () => {
      if (!running) return;
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(prev => {
          if (!prev || prev.top !== r.top || prev.left !== r.left || prev.width !== r.width || prev.height !== r.height) {
            return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
          }
          return prev;
        });
      }
      rafRef.current = requestAnimationFrame(track);
    };

    track();
    const t = setTimeout(() => setVisible(true), 150);

    return () => {
      running = false;
      clearTimeout(t);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  if (!rect) return null;

  const pad = 10;
  const boxW = 300;
  const boxH = 180;

  let top, left;
  const { placement } = step;

  if (placement === 'right') {
    top = rect.top + rect.height / 2 - boxH / 2;
    left = rect.right + pad;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - boxH / 2;
    left = rect.left - boxW - pad;
  } else if (placement === 'bottom') {
    top = rect.bottom + pad;
    left = rect.left + rect.width / 2 - boxW / 2;
  } else {
    top = rect.top - boxH - pad;
    left = rect.left + rect.width / 2 - boxW / 2;
  }

  // Clamp to viewport
  top = Math.max(8, Math.min(top, window.innerHeight - boxH - 8));
  left = Math.max(8, Math.min(left, window.innerWidth - boxW - 8));

  // Arrow position
  const arrowStyle = {};
  if (placement === 'right') {
    arrowStyle.left = -7;
    arrowStyle.top = '50%';
    arrowStyle.transform = 'translateY(-50%) rotate(45deg)';
    arrowStyle.borderRight = 'none';
    arrowStyle.borderTop = 'none';
  } else if (placement === 'left') {
    arrowStyle.right = -7;
    arrowStyle.top = '50%';
    arrowStyle.transform = 'translateY(-50%) rotate(45deg)';
    arrowStyle.borderLeft = 'none';
    arrowStyle.borderBottom = 'none';
  } else if (placement === 'bottom') {
    arrowStyle.top = -7;
    arrowStyle.left = '50%';
    arrowStyle.transform = 'translateX(-50%) rotate(45deg)';
    arrowStyle.borderBottom = 'none';
    arrowStyle.borderRight = 'none';
  } else {
    arrowStyle.bottom = -7;
    arrowStyle.left = '50%';
    arrowStyle.transform = 'translateX(-50%) rotate(45deg)';
    arrowStyle.borderTop = 'none';
    arrowStyle.borderLeft = 'none';
  }

  return (
    <>
      {/* Full-screen backdrop — blocks all clicks on the app */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9997,
          cursor: 'default',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight ring */}
      <div
        style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          borderRadius: 8,
          boxShadow: '0 0 0 4px hsl(var(--primary)), 0 0 0 9999px rgba(0,0,0,0.55)',
          pointerEvents: 'none',
          zIndex: 9998,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Tooltip box */}
      <div
        style={{
          position: 'fixed',
          top,
          left,
          width: boxW,
          zIndex: 9999,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(6px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
        className="bg-card border border-border rounded-xl shadow-2xl p-4"
      >
        {/* Arrow */}
        <div
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            ...arrowStyle,
          }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        <p className="text-xs font-bold text-primary mb-0.5">{current + 1} of {total}</p>
        <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.description}</p>

        <div className="flex items-center gap-1.5">
          {current > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1" onClick={onPrev}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
          )}
          <div className="flex gap-1 flex-1 justify-center">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`rounded-full transition-all ${i === current ? 'w-3 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30'}`} />
            ))}
          </div>
          {current < total - 1 ? (
            <Button size="sm" className="h-7 text-xs px-2.5 gap-1" onClick={onNext}>
              <ChevronRight className="w-3 h-3" />
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export default function AppTour({ steps, onClose }) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < steps.length - 1) setCurrent(current + 1);
    else onClose();
  };
  const prev = () => { if (current > 0) setCurrent(current - 1); };

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [current]);

  // Scroll the sidebar nav container (not window) so fixed elements stay tracked correctly
  useEffect(() => {
    const el = document.querySelector(steps[current]?.target);
    if (!el) return;
    // Find the nearest scrollable ancestor (sidebar nav list) and scroll within it
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const { overflowY } = window.getComputedStyle(parent);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        const elTop = el.offsetTop - parent.offsetTop;
        parent.scrollTo({ top: elTop - parent.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
        return;
      }
      parent = parent.parentElement;
    }
    // Fallback: element is not inside a scroll container, no page scroll needed
  }, [current]);

  return (
    <TooltipBox
      step={steps[current]}
      current={current}
      total={steps.length}
      onPrev={prev}
      onNext={next}
      onClose={onClose}
    />
  );
}
import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const DURATION = 15000; // 15 seconds

export default function UndoToast({ message, onUndo, onClose }) {
  const [progress, setProgress] = useState(100);
  const [confirmed, setConfirmed] = useState(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);
  const closedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (!closedRef.current) {
          closedRef.current = true;
          onClose();
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onClose]);

  const handleUndo = () => {
    cancelAnimationFrame(rafRef.current);
    closedRef.current = true;
    setConfirmed(true);
    onUndo();
    setTimeout(onClose, 2000);
  };

  const handleClose = () => {
    cancelAnimationFrame(rafRef.current);
    closedRef.current = true;
    onClose();
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 rounded-lg border bg-card shadow-xl overflow-hidden">
      {confirmed ? (
        <div className="px-4 py-3 text-sm font-medium text-foreground flex items-center gap-2">
          <span>✓ Action undone</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <span className="text-sm text-foreground flex-1 truncate">{message}</span>
            <button
              onClick={handleUndo}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
            >
              Undo
            </button>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-0.5 bg-muted">
            <div
              className="h-full bg-primary transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
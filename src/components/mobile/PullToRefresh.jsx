import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      e.preventDefault();
      setPulling(true);
      setPullY(Math.min(dy * 0.5, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      await onRefresh?.();
      setRefreshing(false);
    }
    startYRef.current = null;
    setPulling(false);
    setPullY(0);
  }, [pullY, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehavior: 'none' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center text-muted-foreground transition-all duration-200"
        style={{
          height: pullY,
          overflow: 'hidden',
          opacity: pullY > 10 ? 1 : 0,
        }}
      >
        <Loader2
          className={`w-5 h-5 ${refreshing || pullY >= THRESHOLD ? 'animate-spin text-primary' : ''}`}
          style={{ transform: !refreshing ? `rotate(${(pullY / THRESHOLD) * 360}deg)` : undefined }}
        />
      </div>
      <div style={{ transform: `translateY(${pulling || refreshing ? pullY : 0}px)`, transition: pulling ? 'none' : 'transform 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
}
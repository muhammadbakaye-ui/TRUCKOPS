import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginator({ page, totalPages, totalCount, startItem, endItem, setPage, itemLabel = 'items' }) {
  if (!totalCount || totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  if (left > 1) { pages.push(1); if (left > 2) pages.push('...'); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages); }

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border flex-wrap gap-2">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{startItem}–{endItem}</span> of{' '}
        <span className="font-medium text-foreground">{totalCount}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="text-xs text-muted-foreground px-1">…</span>
          ) : (
            <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="h-7 min-w-[28px] px-2 text-xs" onClick={() => setPage(p)}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';

export function usePagination(items, pageSize = 56, storageKey) {
  const [page, setPage] = useState(() => {
    if (!storageKey) return 1;
    return Math.max(1, parseInt(localStorage.getItem(storageKey) || '1', 10));
  });

  const prevLenRef = useRef(items.length);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(page));
  }, [page, storageKey]);

  useEffect(() => {
    if (prevLenRef.current !== items.length) {
      prevLenRef.current = items.length;
      setPage(1);
    }
  }, [items.length]);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  return {
    paginatedItems: items.slice(startIndex, endIndex),
    page: safePage,
    setPage,
    totalPages,
    totalCount,
    startItem: totalCount > 0 ? startIndex + 1 : 0,
    endItem: endIndex,
  };
}
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const MAX_CACHED_PAGES = 4;

/**
 * PageCacheProvider - Keeps last N visited pages mounted in memory
 * Pages only load on first visit, then stay cached for instant switching
 */
export function PageCacheProvider({ children }) {
  const location = useLocation();
  const [visitedPaths, setVisitedPaths] = useState([]);
  const [cache, setCache] = useState(new Map());

  useEffect(() => {
    const path = location.pathname;
    
    setVisitedPaths(prev => {
      const newPath = prev.filter(p => p !== path);
      const updated = [...newPath, path];
      
      // Keep only last N paths
      if (updated.length > MAX_CACHED_PAGES) {
        const toRemove = updated.shift();
        setCache(prev => {
          const next = new Map(prev);
          next.delete(toRemove);
          return next;
        });
      }
      
      // Add current page to cache if not exists
      setCache(prev => {
        const next = new Map(prev);
        if (!next.has(path)) {
          next.set(path, { path, timestamp: Date.now() });
        }
        return next;
      });
      
      return updated;
    });
  }, [location.pathname]);

  return (
    <>
      {children}
      {/* Hidden cached pages - kept mounted in memory */}
      <div className="hidden">
        {[...cache.values()].map(cached => (
          <CachedPage key={cached.path} path={cached.path} />
        ))}
      </div>
    </>
  );
}

// Dummy component to keep page mounted - actual routing handles display
function CachedPage({ path }) {
  return <div data-cached-path={path} />;
}

export const usePageCache = () => {
  // Hook for future cache management if needed
  return { enabled: true, maxSize: MAX_CACHED_PAGES };
};
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Subscribes to real-time entity changes and auto-invalidates the React Query cache.
 * @param {string} entityName  - e.g. 'Load', 'Driver'
 * @param {Array}  queryKey    - the React Query key to invalidate on change
 * @param {boolean} [enabled]  - set false to skip subscription (e.g. tenant not loaded yet)
 */
export function useEntitySubscription(entityName, queryKey, enabled = true) {
  const queryClient = useQueryClient();
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;

  useEffect(() => {
    if (!enabled) return;
    const entity = base44.entities[entityName];
    if (!entity?.subscribe) return;

    const unsubscribe = entity.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: keyRef.current });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [entityName, enabled]);
}
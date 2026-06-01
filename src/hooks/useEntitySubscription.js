import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Subscribes to real-time entity changes and auto-invalidates the React Query cache.
 * @param {string} entityName  - e.g. 'Load', 'Driver'
 * @param {Array}  queryKey    - single key array OR array of key arrays to invalidate
 *                               e.g. ['loads', tenantId]  or  [['key1'], ['key2']]
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
      const keys = keyRef.current;
      // Support array-of-arrays: [['key1', id], ['key2', id]] for multi-key invalidation
      if (Array.isArray(keys) && Array.isArray(keys[0])) {
        keys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      } else {
        queryClient.invalidateQueries({ queryKey: keys });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [entityName, enabled]);
}
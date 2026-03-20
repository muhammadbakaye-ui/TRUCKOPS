import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function GlobalBroadcastListener() {
  const seenIds = useRef(new Set());

  useEffect(() => {
    // Load initial state so we don't re-notify on things already active when user opened app
    base44.entities.AppBroadcast.filter({ active: true }).then(broadcasts => {
      broadcasts.forEach(b => seenIds.current.add(b.id + '_' + (b.updated_date || b.created_date)));
    });

    const unsubscribe = base44.entities.AppBroadcast.subscribe((event) => {
      if (event.type === 'delete') return;
      const data = event.data;
      if (!data?.active) return;

      const key = data.id + '_' + (data.updated_date || data.created_date);
      if (seenIds.current.has(key)) return;
      seenIds.current.add(key);

      if (data.broadcast_type === 'update') {
        toast.info(`🚀 App updated to ${data.version || 'a new version'}`, {
          description: data.message || 'Please refresh your browser to get the latest version.',
          duration: Infinity,
          action: {
            label: 'Refresh Now',
            onClick: () => window.location.reload(),
          },
        });
      } else {
        toast.info(`📢 ${data.message}`, {
          duration: 15000,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
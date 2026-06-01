import React, { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function DriverNotificationBell({ driverId, tenantId }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const recipientId = driverId ? `driver:${driverId}` : null;

  const { data: notifications = [] } = useQuery({
    queryKey: ['driver-notifs', driverId],
    queryFn: () => base44.entities.Notification.filter(
      { tenant_id: tenantId, recipient_id: recipientId },
      '-created_date', 50
    ),
    enabled: !!tenantId && !!recipientId,
    refetchInterval: 30000,
  });

  const active = notifications.filter(n => !n.deleted);
  const unread = active.filter(n => !n.read).length;

  useEffect(() => {
    if (!recipientId) return;
    const unsub = base44.entities.Notification.subscribe((ev) => {
      if (ev.data?.recipient_id === recipientId) {
        queryClient.invalidateQueries({ queryKey: ['driver-notifs', driverId] });
      }
    });
    return unsub;
  }, [recipientId, driverId, queryClient]);

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifs', driverId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      for (const n of active.filter(n => !n.read)) {
        await base44.entities.Notification.update(n.id, { read: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifs', driverId] }),
  });

  const dismiss = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { deleted: true, read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifs', driverId] }),
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', width: 32, height: 32, borderRadius: 8,
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'hsl(var(--sidebar-foreground))',
        }}
        title="Notifications"
      >
        <Bell style={{ width: 16, height: 16 }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            width: Math.min(320, window.innerWidth - 32),
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 1000, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid hsl(var(--border))' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    style={{ fontSize: 11, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <Check style={{ width: 12, height: 12 }} /> Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {active.length === 0 ? (
                <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  No notifications
                </div>
              ) : (
                active.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '10px 14px',
                      borderBottom: '1px solid hsl(var(--border))',
                      background: n.read ? 'transparent' : 'hsl(var(--primary) / 0.05)',
                      cursor: n.read ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.read ? 'transparent' : '#3b82f6', marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, marginBottom: 2 }}>{n.title}</p>
                      <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{n.message}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss.mutate(n.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', flexShrink: 0, padding: 2 }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { formatInUserTimezone, getUserTimezone } from '@/utils/formatTimezone';
import { useSession } from '../shared/AppSession';

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Two-tone soft bell: high note then lower note
    [[880, 0, 0.5], [587, 0.12, 0.7]].forEach(([freq, startOffset, duration]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    });
  } catch (e) {}
}

export default function NotificationBell({ recipientId: recipientIdProp } = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const recipientId = recipientIdProp || `admin:${tenantId}`;
  const seenIdsRef = useRef(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', tenantId],
    queryFn: () => tenantId
      ? base44.entities.Notification.filter({ tenant_id: tenantId }, '-created_date', 100)
      : Promise.resolve([]),
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Filter to this user's notifications; legacy notifications with no recipient_id remain visible for backward compat
  const userNotifications = notifications.filter(n => !n.recipient_id || n.recipient_id === recipientId);
  const active = userNotifications.filter(n => !n.deleted);
  const deleted = userNotifications.filter(n => n.deleted);
  const unreadCount = active.filter(n => !n.read).length;

  const markAsRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      for (const n of active.filter(n => !n.read)) {
        await base44.entities.Notification.update(n.id, { read: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const softDelete = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { deleted: true, read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteAll = useMutation({
    mutationFn: async () => {
      for (const n of active) {
        await base44.entities.Notification.update(n.id, { deleted: true, read: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (notification) => {
    markAsRead.mutate(notification.id);
    setOpen(false);
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.tenant_id === tenantId &&
          (!event.data?.recipient_id || event.data?.recipient_id === recipientId)) {
        queryClient.invalidateQueries({ queryKey: ['notifications', tenantId] });
      }
    });
    return unsubscribe;
  }, [queryClient, tenantId]);

  // Play chime once per new unread notification (track by ID to avoid loops from refetches)
  useEffect(() => {
    const unreadIds = active.filter(n => !n.read).map(n => n.id);
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(unreadIds);
      return;
    }
    const hasNew = unreadIds.some(id => !seenIdsRef.current.has(id));
    if (hasNew) playChime();
    seenIdsRef.current = new Set(unreadIds);
  }, [active.map(n => n.id).join(',')]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-32px)] sm:w-96 p-0" align="end" collisionPadding={16}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllAsRead.mutate()}>
                <Check className="w-3 h-3 mr-1" /> Mark all read
              </Button>
            )}
            {active.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteAll.mutate()}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[420px]">
          {/* Active notifications */}
          {active.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="divide-y">
              {active.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 hover:bg-accent transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                    <button className="flex-1 min-w-0 cursor-pointer text-left hover:opacity-80 transition-opacity" onClick={() => handleClick(n)}>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatInUserTimezone(n.created_date, 'datetime', getUserTimezone())}
                        </p>
                      </button>
                    <div className="flex gap-1 flex-shrink-0">
                      {!n.read && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          title="Mark as read"
                          onClick={(e) => { e.stopPropagation(); markAsRead.mutate(n.id); }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Delete"
                        onClick={(e) => { e.stopPropagation(); softDelete.mutate(n.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deleted section */}
          {deleted.length > 0 && (
            <div className="border-t">
              <button
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
                onClick={() => setShowDeleted(v => !v)}
              >
                <span>Deleted ({deleted.length})</span>
                {showDeleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {showDeleted && (
                <div className="divide-y opacity-60">
                  {deleted.map((n) => (
                    <div key={n.id} className="px-4 py-3">
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatInUserTimezone(n.created_date, 'datetime', getUserTimezone())}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

export default function DriverNotificationBell({ driverId, tenantId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const recipientId = driverId ? `driver:${driverId}` : null;

  const { data: notifications = [] } = useQuery({
    queryKey: ['driver-notifications', driverId, tenantId],
    queryFn: () => tenantId
      ? base44.entities.Notification.filter({ tenant_id: tenantId, recipient_id: recipientId }, '-created_date', 50)
      : Promise.resolve([]),
    enabled: !!tenantId && !!recipientId,
    refetchInterval: 30000,
  });

  const active = notifications.filter(n => !n.deleted);
  const unreadCount = active.filter(n => !n.read).length;

  // Real-time subscription
  useEffect(() => {
    if (!tenantId || !recipientId) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.recipient_id === recipientId) {
        queryClient.invalidateQueries({ queryKey: ['driver-notifications', driverId, tenantId] });
      }
    });
    return unsubscribe;
  }, [queryClient, driverId, tenantId, recipientId]);

  const markAsRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifications', driverId, tenantId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      for (const n of active.filter(n => !n.read)) {
        await base44.entities.Notification.update(n.id, { read: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifications', driverId, tenantId] }),
  });

  const softDelete = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { deleted: true, read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifications', driverId, tenantId] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4 text-sidebar-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-32px)] sm:w-80 p-0" align="end" collisionPadding={16}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllAsRead.mutate()}>
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-72">
          {active.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="divide-y">
              {active.map((n) => (
                <div key={n.id} className={`p-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0" onClick={() => !n.read && markAsRead.mutate(n.id)}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); softDelete.mutate(n.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
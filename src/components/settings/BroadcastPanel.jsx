import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, RefreshCw, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BroadcastPanel() {
  const [msgText, setMsgText] = useState('');
  const [version, setVersion] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const queryClient = useQueryClient();

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['app-broadcasts'],
    queryFn: () => base44.entities.AppBroadcast.filter({ active: true }),
    refetchInterval: 10000,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      // Clear old message broadcasts first
      const old = broadcasts.filter(b => b.broadcast_type === 'message');
      await Promise.all(old.map(b => base44.entities.AppBroadcast.update(b.id, { active: false })));
      return base44.entities.AppBroadcast.create({ message: msgText, broadcast_type: 'message', active: true });
    },
    onSuccess: () => {
      toast.success('Message broadcast sent to all open sessions');
      setMsgText('');
      queryClient.invalidateQueries({ queryKey: ['app-broadcasts'] });
    },
  });

  const sendUpdate = useMutation({
    mutationFn: async () => {
      const old = broadcasts.filter(b => b.broadcast_type === 'update');
      await Promise.all(old.map(b => base44.entities.AppBroadcast.update(b.id, { active: false })));
      return base44.entities.AppBroadcast.create({ version, message: updateMsg, broadcast_type: 'update', active: true });
    },
    onSuccess: () => {
      toast.success('Update notification sent to all open sessions');
      setVersion('');
      setUpdateMsg('');
      queryClient.invalidateQueries({ queryKey: ['app-broadcasts'] });
    },
  });

  const clearAll = useMutation({
    mutationFn: () => Promise.all(broadcasts.map(b => base44.entities.AppBroadcast.update(b.id, { active: false }))),
    onSuccess: () => {
      toast.success('All broadcasts cleared');
      queryClient.invalidateQueries({ queryKey: ['app-broadcasts'] });
    },
  });

  const activeCount = broadcasts.length;

  return (
    <div className="space-y-4">
      {activeCount > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-xs text-amber-700 font-medium">⚡ {activeCount} active broadcast{activeCount > 1 ? 's' : ''} currently showing to users</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-700 hover:bg-amber-100" onClick={() => clearAll.mutate()} disabled={clearAll.isPending}>
            <X className="w-3 h-3 mr-1" /> Clear All
          </Button>
        </div>
      )}

      {/* Manual Message */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" /> Broadcast Message
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">Send an instant popup message to all users currently using the app.</p>
          <div>
            <Label className="text-xs">Message</Label>
            <Input
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              placeholder="e.g. System maintenance in 5 minutes..."
              className="h-8 text-xs mt-1"
            />
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => sendMessage.mutate()} disabled={!msgText.trim() || sendMessage.isPending}>
            {sendMessage.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
            Send to All Users
          </Button>
        </CardContent>
      </Card>

      {/* App Update Notification */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" /> App Update Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">After publishing an app update, notify users to refresh their browser.</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Version (optional)</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. v1.3" className="h-8 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input value={updateMsg} onChange={e => setUpdateMsg(e.target.value)} placeholder="e.g. Bug fixes" className="h-8 text-xs mt-1" />
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => sendUpdate.mutate()} disabled={sendUpdate.isPending}>
            {sendUpdate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Notify Users to Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
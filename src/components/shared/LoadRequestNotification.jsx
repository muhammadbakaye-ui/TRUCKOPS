import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Truck } from 'lucide-react';

export default function LoadRequestNotification({ notification, onAccept, onDeny }) {
  const metadata = notification.metadata || {};
  const loadNumber = metadata.load_number || notification.related_entity_id?.substring(0, 8) || 'Unknown';
  
  return (
    <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-purple-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
          <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Driver: {metadata.driver_name || 'Unknown'} • Load: {loadNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <Button
          size="sm"
          className="h-8 text-xs bg-green-600 hover:bg-green-700"
          onClick={() => onAccept(notification.id, metadata.load_id, metadata.driver_id, metadata.driver_name, loadNumber)}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => onDeny(notification.id, metadata.load_id, metadata.driver_id)}
        >
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Deny
        </Button>
      </div>
    </div>
  );
}
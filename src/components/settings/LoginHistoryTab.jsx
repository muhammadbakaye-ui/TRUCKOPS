import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Smartphone, Monitor, Tablet, Clock, MapPin, Globe as GlobeIcon } from 'lucide-react';
import { format } from 'date-fns';

const deviceIcons = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

export default function LoginHistoryTab({ userEmail }) {
  const { data: logins = [] } = useQuery({
    queryKey: ['login-history', userEmail],
    queryFn: () => base44.entities.LoginHistory.filter({ user_email: userEmail }, '-login_date', 50),
  });

  if (logins.length === 0) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Login History</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">No login activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Login History</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {logins.map((login) => {
            const DeviceIcon = deviceIcons[login.device_type] || Monitor;
            return (
              <div
                key={login.id}
                className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted/50 text-xs"
              >
                <DeviceIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {login.browser} on {login.os}
                  </div>
                  <div className="text-muted-foreground text-[11px] space-y-1 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {login.login_date
                        ? format(new Date(login.login_date), 'MMM d, yyyy h:mm a')
                        : 'Unknown time'}
                    </div>
                    {login.ip_address && (
                      <div className="flex items-center gap-1">
                        <GlobeIcon className="w-3 h-3" />
                        {login.ip_address}
                      </div>
                    )}
                    <div className="text-[10px] opacity-60">
                      {login.device_type.charAt(0).toUpperCase() + login.device_type.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
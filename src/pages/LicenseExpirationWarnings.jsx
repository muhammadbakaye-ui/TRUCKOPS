import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/components/shared/AppSession';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

function buildWarnings(quals, drivers) {
  const driverMap = {};
  drivers.forEach(d => { driverMap[d.id] = d; });
  const warnings = [];
  quals.forEach(q => {
    const driver = driverMap[q.driver_id];
    const docs = [
      { type: 'CDL', date: q.cdl_expiration_date, renewedKey: 'cdl_renewed' },
      { type: 'Medical Card', date: q.medical_card_expiration_date, renewedKey: 'medical_renewed' },
    ];
    docs.forEach(({ type, date, renewedKey }) => {
      if (!date) return;
      if (q[renewedKey]) return; // skip if manually marked renewed
      const days = differenceInDays(parseISO(date), new Date());
      if (days <= 90) {
        warnings.push({ driver, qual: q, docType: type, expDate: date, days, renewedKey });
      }
    });
  });
  return warnings.sort((a, b) => a.days - b.days);
}

function WarningGroup({ title, badgeClass, items, onSendReminder, onMarkRenewed, sending, renewing }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>{items.length}</Badge>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Driver</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Document</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Expiration Date</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Days Remaining</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((w, i) => {
              const key = `${w.qual?.id}-${w.docType}`;
              return (
                <tr key={`${key}-${i}`} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{w.driver?.full_name || w.qual?.driver_name || '—'}</td>
                  <td className="px-4 py-3">{w.docType}</td>
                  <td className="px-4 py-3">{w.expDate}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] ${badgeClass}`}>
                      {w.days < 0 ? `${Math.abs(w.days)}d overdue` : `${w.days}d left`}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {w.driver?.email && (
                        <Button
                          variant="outline" size="sm" className="h-7 text-xs gap-1"
                          disabled={sending === key}
                          onClick={() => onSendReminder(w)}
                        >
                          {sending === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                          Send Reminder
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-600 border-green-300 hover:bg-green-50"
                        disabled={renewing === key}
                        onClick={() => onMarkRenewed(w)}
                      >
                        {renewing === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Mark as Renewed
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LicenseExpirationWarnings() {
  const { session } = useSession();
  const tenantId = session?.tenant_id;
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(null);
  const [renewing, setRenewing] = useState(null);

  const { data: quals = [], isLoading: qualsLoading } = useQuery({
    queryKey: ['driver-quals', tenantId],
    queryFn: () => tenantId ? base44.entities.DriverQualification.filter({ tenant_id: tenantId }, 'driver_name', 500) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers', tenantId],
    queryFn: () => tenantId ? base44.entities.Driver.filter({ tenant_id: tenantId }, 'full_name', 200) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const warnings = useMemo(() => buildWarnings(quals, drivers), [quals, drivers]);
  const expired = warnings.filter(w => w.days < 0);
  const within30 = warnings.filter(w => w.days >= 0 && w.days <= 30);
  const within90 = warnings.filter(w => w.days > 30 && w.days <= 90);

  const handleSendReminder = async (w) => {
    const key = `${w.qual?.id}-${w.docType}`;
    setSending(key);
    try {
      const driverName = w.driver?.full_name || w.qual?.driver_name || 'Driver';
      const email = w.driver?.email;
      if (!email) { toast.error('Driver has no email on file'); return; }
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Action Required: ${w.docType} Expiring Soon`,
        body: `Hi ${driverName},\n\nThis is a reminder that your ${w.docType} expires on ${w.expDate} (${w.days < 0 ? `${Math.abs(w.days)} days ago` : `in ${w.days} days`}).\n\nPlease renew it as soon as possible to remain compliant.\n\nThank you,\n${session?.company_name || 'Your Carrier'}`,
      });
      toast.success(`Reminder sent to ${driverName}`);
    } catch (err) {
      toast.error('Failed to send: ' + err.message);
    } finally {
      setSending(null);
    }
  };

  const handleMarkRenewed = async (w) => {
    const key = `${w.qual?.id}-${w.docType}`;
    setRenewing(key);
    try {
      const update = {};
      if (w.renewedKey === 'cdl_renewed') update.cdl_renewed = true;
      if (w.renewedKey === 'medical_renewed') update.medical_renewed = true;
      await base44.entities.DriverQualification.update(w.qual.id, update);
      queryClient.invalidateQueries({ queryKey: ['driver-quals'] });
      toast.success(`${w.docType} marked as renewed — update the expiration date in Driver Qualifications`);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setRenewing(null);
    }
  };

  const isLoading = qualsLoading || driversLoading;

  return (
    <div className="p-4 space-y-5">
      <PageHeader
        title="License Expiration Warnings"
        description={`${warnings.length} warning${warnings.length !== 1 ? 's' : ''} — CDL & Medical Card expirations within 90 days`}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning driver records…
        </div>
      ) : warnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Bell className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium text-green-600">All clear — no expirations within 90 days.</p>
          <p className="text-xs mt-1 text-muted-foreground">Make sure qualification records are entered under Driver Qualifications.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <WarningGroup title="Expired" badgeClass="text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20" items={expired} onSendReminder={handleSendReminder} onMarkRenewed={handleMarkRenewed} sending={sending} renewing={renewing} />
          <WarningGroup title="Expiring Within 30 Days" badgeClass="text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-900/20" items={within30} onSendReminder={handleSendReminder} onMarkRenewed={handleMarkRenewed} sending={sending} renewing={renewing} />
          <WarningGroup title="Expiring Within 31–90 Days" badgeClass="text-yellow-600 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20" items={within90} onSendReminder={handleSendReminder} onMarkRenewed={handleMarkRenewed} sending={sending} renewing={renewing} />
        </div>
      )}
    </div>
  );
}
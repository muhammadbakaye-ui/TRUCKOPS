import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Download, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLoadHTML } from '@/components/print/printLoad';
import MobilePDFViewer from '@/components/print/MobilePDFViewer';
import { formatInUserTimezone, getUserTimezone } from '@/utils/formatTimezone';

export default function DriverDeliveredLoads({ session, company }) {
  const [pdfLoad, setPdfLoad] = useState(null);
  const [pdfHtml, setPdfHtml] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(null);

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['driver-delivered-loads', session?.driver_id],
    queryFn: () => base44.entities.Load.filter(
      { driver_1_id: session.driver_id, dispatch_status: 'delivered', tenant_id: session.tenant_id },
      '-pickup_date',
      200
    ),
    enabled: !!session?.driver_id,
  });

  const handleDownload = async (load) => {
    setLoadingPdf(load.id);
    try {
      const stops = await base44.entities.LoadStop.filter({ load_id: load.id }, 'stop_order', 50);
      const html = getLoadHTML({ company: company || {}, load, stops, drivers: [], trucks: [], trailers: [] });
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPdfLoad(load);
        setPdfHtml(html);
      } else {
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
      }
    } finally {
      setLoadingPdf(null);
    }
  };

  // Mobile full-screen PDF viewer
  if (pdfHtml && pdfLoad) {
    return (
      <MobilePDFViewer
        htmlContent={pdfHtml}
        title={`Load #${pdfLoad.internal_load_number}`}
        onClose={() => { setPdfLoad(null); setPdfHtml(null); }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No delivered loads yet.</p>
        <p className="text-xs mt-1 opacity-70">Loads marked as Delivered will appear here.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE: card list ── */}
      <div className="md:hidden space-y-2">
        {loads.map(load => (
          <div key={load.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary font-mono">#{load.internal_load_number}</p>
              {(load.pickup_city || load.delivery_city) && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {load.pickup_city || '—'}{load.pickup_state ? `, ${load.pickup_state}` : ''}&nbsp;→&nbsp;
                  {load.delivery_city || '—'}{load.delivery_state ? `, ${load.delivery_state}` : ''}
                </p>
              )}
              {load.pickup_date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatInUserTimezone(load.pickup_date + 'T12:00:00', 'short', getUserTimezone())}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 text-primary"
              onClick={() => handleDownload(load)}
              disabled={loadingPdf === load.id}
            >
              {loadingPdf === load.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
            </Button>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left py-2.5 px-4 font-semibold">Load #</th>
              <th className="text-left py-2.5 px-4 font-semibold">Route</th>
              <th className="text-left py-2.5 px-4 font-semibold">Pickup Date</th>
              <th className="text-left py-2.5 px-4 font-semibold">Customer</th>
              <th className="py-2.5 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loads.map(load => (
              <tr key={load.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-4 font-mono font-semibold text-primary text-xs">
                  #{load.internal_load_number}
                </td>
                <td className="py-2.5 px-4 text-xs text-muted-foreground">
                  {load.pickup_city || '—'}{load.pickup_state ? `, ${load.pickup_state}` : ''}
                  {' → '}
                  {load.delivery_city || '—'}{load.delivery_state ? `, ${load.delivery_state}` : ''}
                </td>
                <td className="py-2.5 px-4 text-xs text-muted-foreground">
                  {load.pickup_date
                    ? formatInUserTimezone(load.pickup_date + 'T12:00:00', 'short', getUserTimezone())
                    : '—'}
                </td>
                <td className="py-2.5 px-4 text-xs">{load.customer_name || '—'}</td>
                <td className="py-2.5 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:text-primary"
                    onClick={() => handleDownload(load)}
                    disabled={loadingPdf === load.id}
                    title="Download Load PDF"
                  >
                    {loadingPdf === load.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
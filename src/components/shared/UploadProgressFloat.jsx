import React, { useRef, useEffect } from 'react';
import { useUploadContext } from '../../context/UploadContext';
import { Loader2, CheckCircle, X, FileText, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch (_) {}
}

export default function UploadProgressFloat() {
  const { jobs, cancelJob, dismissJob } = useUploadContext();
  const prevStatusRef = useRef({});

  useEffect(() => {
    jobs.forEach(job => {
      const prev = prevStatusRef.current[job.id];
      if (prev !== 'done' && job.status === 'done') {
        playChime();
      }
      prevStatusRef.current[job.id] = job.status;
    });
    // Cleanup refs for dismissed jobs
    Object.keys(prevStatusRef.current).forEach(jobId => {
      if (!jobs.find(j => j.id === parseInt(jobId))) {
        delete prevStatusRef.current[jobId];
      }
    });
  }, [jobs]);
  const location = useLocation();
  const navigate = useNavigate();

  // Only show float when NOT on the UploadDocument page
  const isOnUploadPage = location.pathname === '/UploadDocument';
  if (isOnUploadPage) return null;

  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'done' || j.status === 'cancelled');
  if (activeJobs.length === 0) return null;

  // Mobile: slim top banner. Desktop: bottom-right floating card.
  return (
    <>
      {/* Mobile top banner */}
      <div className="md:hidden fixed left-0 right-0 z-50 flex flex-col" style={{ top: '56px' }}>
        {activeJobs.map(job => {
          const pct = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
          const isDone = job.status === 'done';
          const isCancelled = job.status === 'cancelled';
          const isProcessing = job.status === 'processing';
          return (
            <div key={job.id} className="bg-card border-b border-border shadow-md">
              <div className="flex items-center gap-2 px-3 h-10">
                {isDone
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  : isCancelled
                  ? <XCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  : <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
                <span className="text-xs font-medium flex-1 truncate">
                  {isDone
                    ? `Done — ${job.results.length}/${job.total} loads created`
                    : isCancelled
                    ? `Cancelled (${job.results.length} done)`
                    : `Processing ${job.current}/${job.total}… ${job.currentFileName ? job.currentFileName : ''}`}
                </span>
                <div className="flex gap-1 flex-shrink-0">
                  {isProcessing && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => cancelJob(job.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {(isDone || isCancelled) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => dismissJob(job.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {isProcessing && <Progress value={pct} className="h-0.5 rounded-none" />}
            </div>
          );
        })}
      </div>

      {/* Desktop floating card */}
      <div className="hidden md:flex fixed bottom-4 right-4 z-50 flex-col gap-2 w-72">
        {activeJobs.map(job => {
          const pct = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
          const isDone = job.status === 'done';
          const isCancelled = job.status === 'cancelled';
          const isProcessing = job.status === 'processing';
          return (
            <div key={job.id} className="bg-card border rounded-lg shadow-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
                  {isDone
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    : isCancelled
                    ? <XCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    : <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
                  <span className="truncate">
                    {isDone
                      ? `${job.results.length}/${job.total} loads created`
                      : isCancelled
                      ? `Cancelled (${job.results.length} done)`
                      : `Processing ${job.current}/${job.total}...`}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {isProcessing && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" title="Cancel" onClick={() => cancelJob(job.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {(isDone || isCancelled) && (
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" title="Dismiss" onClick={() => dismissJob(job.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {isProcessing && (
                <div className="space-y-1">
                  <Progress value={pct} className="h-1.5" />
                  {job.currentFileName && (
                    <p className="text-[10px] text-muted-foreground truncate">{job.currentFileName}</p>
                  )}
                </div>
              )}
              {(job.results.length > 0 || job.errors?.length > 0) && isDone && (
                <div className="space-y-1 pt-1 border-t">
                  {job.results.slice(0, 3).map((r, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-1.5 text-[10px] text-primary hover:underline w-full text-left"
                      onClick={() => navigate(`/LoadDetail?id=${r.load.id}`)}
                    >
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="font-mono font-semibold">{r.load.internal_load_number}</span>
                      <span className="text-muted-foreground truncate">— {r.extracted?.customer_name || ''}</span>
                    </button>
                  ))}
                  {job.results.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{job.results.length - 3} more loads</span>
                  )}
                  {job.errors?.length > 0 && (
                    <div className="pt-1 border-t space-y-0.5">
                      {job.errors.slice(0, 3).map((e, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-destructive">
                          <XCircle className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{e.name}</span>
                        </div>
                      ))}
                      {job.errors.length > 3 && (
                        <span className="text-[10px] text-destructive">+{job.errors.length - 3} more failed</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
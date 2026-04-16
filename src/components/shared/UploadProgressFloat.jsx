import React from 'react';
import { useUploadContext } from '../../context/UploadContext';
import { Loader2, CheckCircle, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UploadProgressFloat() {
  const { jobs, dismissJob } = useUploadContext();
  const navigate = useNavigate();
  const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'done');

  if (activeJobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {activeJobs.map(job => {
        const pct = job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
        const isDone = job.status === 'done';

        return (
          <div key={job.id} className="bg-card border rounded-lg shadow-lg p-3 space-y-2 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                {isDone
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  : <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                <span>
                  {isDone
                    ? `${job.results.length} load${job.results.length !== 1 ? 's' : ''} created`
                    : `Processing ${job.current} / ${job.total}`}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => dismissJob(job.id)}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            {!isDone && (
              <>
                <Progress value={pct} className="h-1.5" />
                {job.currentFileName && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    {job.currentFileName}
                  </div>
                )}
              </>
            )}

            {isDone && job.results.length > 0 && (
              <div className="space-y-1">
                {job.results.slice(0, 3).map((r, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer w-full text-left"
                    onClick={() => navigate(createPageUrl(`LoadDetail?id=${r.load.id}`))}
                  >
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    {r.load.internal_load_number} — {r.extracted?.customer_name || 'Load'}
                  </button>
                ))}
                {job.results.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{job.results.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
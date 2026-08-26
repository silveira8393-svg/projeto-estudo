import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingProgressProps {
  progress: number;
  label: string;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ progress, label }) => {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2 font-medium text-zinc-700">
          {safeProgress < 100 && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
          {label}
        </span>
        <span className="font-mono text-zinc-500">{safeProgress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress}>
        <div className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 ease-out" style={{ width: `${safeProgress}%` }} />
      </div>
      {safeProgress < 100 && <p className="text-[10px] text-zinc-500">O avanço durante o processamento com IA é estimado e pode variar conforme o material.</p>}
    </div>
  );
};

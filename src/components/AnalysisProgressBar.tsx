import React from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { AnalysisJob, JobStage } from '../types';

interface AnalysisProgressBarProps {
  job: AnalysisJob;
}

const STAGES: { key: JobStage; label: string }[] = [
  { key: 'INGESTING', label: 'Repository Ingestion & Trees' },
  { key: 'ANALYZING', label: 'Deterministic AST & Security Scanners' },
  { key: 'AI_ANALYSIS', label: 'Grounded AI Architectural Reasoning' },
  { key: 'GENERATING_REPORT', label: 'Report Compilation & Formulas' },
];

export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({ job }) => {
  const getStageStatus = (stageKey: JobStage) => {
    const stageOrder: JobStage[] = ['QUEUED', 'INGESTING', 'ANALYZING', 'AI_ANALYSIS', 'GENERATING_REPORT', 'COMPLETED'];
    const currentIndex = stageOrder.indexOf(job.status);
    const targetIndex = stageOrder.indexOf(stageKey);

    if (job.status === 'FAILED') return 'failed';
    if (currentIndex > targetIndex || job.status === 'COMPLETED') return 'completed';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {job.status === 'COMPLETED' ? (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          ) : job.status === 'FAILED' ? (
            <span className="flex h-2 w-2 rounded-full bg-rose-500" />
          ) : (
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          <span className="font-semibold text-zinc-200">
            {job.status === 'COMPLETED' ? 'ANALYSIS COMPLETE' : 'ANALYZING REPOSITORY PIPELINE'}
          </span>
          <span className="text-zinc-500">[{job.repoUrl}]</span>
        </div>
        <div className="text-zinc-400 font-bold">{job.progressPercent}%</div>
      </div>

      {/* Progress Bar Track */}
      <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 mb-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            job.status === 'COMPLETED' ? 'bg-emerald-500' : job.status === 'FAILED' ? 'bg-rose-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${job.progressPercent}%` }}
        />
      </div>

      {/* Step checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
        {STAGES.map((s) => {
          const status = getStageStatus(s.key);
          return (
            <div
              key={s.key}
              className={`flex items-center gap-2 border px-2.5 py-1.5 text-[11px] ${
                status === 'completed'
                  ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300'
                  : status === 'active'
                  ? 'border-amber-900/80 bg-amber-950/30 text-amber-200'
                  : status === 'failed'
                  ? 'border-rose-900/60 bg-rose-950/20 text-rose-300'
                  : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-500'
              }`}
            >
              {status === 'completed' && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              {status === 'active' && <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin shrink-0" />}
              {status === 'pending' && <span className="h-3.5 w-3.5 flex items-center justify-center text-zinc-600">○</span>}
              {status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[11px] text-zinc-400 truncate">
        {job.stageMessage}
      </div>
    </div>
  );
};

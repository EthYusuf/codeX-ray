import React from 'react';
import { TestTube2, AlertCircle, Wrench, Clock, FileCode } from 'lucide-react';
import { AnalysisReport } from '../../types';

interface TestingTabProps {
  report: AnalysisReport;
}

export const TestingTab: React.FC<TestingTabProps> = ({ report }) => {
  const { testing, technicalDebt } = report;

  return (
    <div className="space-y-6">
      {/* Testing Discipline Header */}
      <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <TestTube2 className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Automated Test Suite Footprint
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-zinc-400">Test-to-Source Ratio:</span>
            <span className="text-white font-bold">{Math.round(testing.testRatio * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-zinc-800/80 bg-zinc-900/40 p-3">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Test Frameworks</div>
            <div className="mt-1 text-sm font-semibold text-zinc-100">
              {testing.frameworksDetected.join(', ') || 'Standard Assertions'}
            </div>
          </div>

          <div className="border border-zinc-800/80 bg-zinc-900/40 p-3">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Test Suites Identified</div>
            <div className="mt-1 text-sm font-semibold text-zinc-100 font-mono">
              {testing.testFilesCount} test file(s)
            </div>
          </div>

          <div className="border border-zinc-800/80 bg-zinc-900/40 p-3">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Coverage Metric Artifact</div>
            <div className="mt-1 text-xs text-zinc-300">
              {testing.coverageStatus}
            </div>
          </div>
        </div>

        {/* Qualitative Notes */}
        <div className="border border-zinc-800/80 bg-zinc-900/30 p-3">
          <div className="text-xs font-semibold text-zinc-300 mb-1">Qualitative Test Analysis</div>
          <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
            {testing.qualitativeNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Technical Debt Estimation & Prioritized Queue */}
      <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Technical Debt Remediation Queue ({technicalDebt.totalEstimatedHours} Estimated Hours)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            P0 (Blocker) → P3 (Nice to have)
          </span>
        </div>

        <div className="space-y-3">
          {technicalDebt.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800 bg-zinc-900/50 p-4 gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                      item.priority === 'p0'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : item.priority === 'p1'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span className="text-xs font-semibold text-zinc-100">{item.title}</span>
                  <span className="text-[10px] uppercase font-mono text-zinc-500">[{item.category}]</span>
                </div>
                <div className="text-xs text-zinc-400">{item.recommendation}</div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-500 pt-1">
                  <FileCode className="h-3 w-3" />
                  <span>{item.file}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 font-mono text-xs text-zinc-300 border border-zinc-800 bg-zinc-950 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                <span>~{item.estimatedHours}h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

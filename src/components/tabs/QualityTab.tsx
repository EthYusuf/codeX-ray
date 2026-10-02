import React from 'react';
import { Activity, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';
import { AnalysisReport, CodeFinding } from '../../types';

interface QualityTabProps {
  report: AnalysisReport;
  onFixFinding: (finding: CodeFinding) => void;
}

export const QualityTab: React.FC<QualityTabProps> = ({ report, onFixFinding }) => {
  const { quality } = report;
  const hotspots = quality.complexityHotspots;
  const qualityFindings = quality.findings;

  return (
    <div className="space-y-6">
      {/* Cyclomatic Complexity Hotspots */}
      <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Cyclomatic Complexity Hotspots ({hotspots.length})
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Functions with high decision branches (M &gt; 10) requiring modular decomposition.
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            M = Decisions + 1
          </span>
        </div>

        {hotspots.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            No functions exceed the cyclomatic complexity threshold.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] text-zinc-400 uppercase">
                  <th className="py-2.5 px-3">Function / Routine</th>
                  <th className="py-2.5 px-3">File Location</th>
                  <th className="py-2.5 px-3 text-right">Complexity (M)</th>
                  <th className="py-2.5 px-3 text-right">Lines</th>
                  <th className="py-2.5 px-3 text-right">Max Nesting</th>
                  <th className="py-2.5 px-3 text-center">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {hotspots.map((h, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="py-2.5 px-3 font-semibold text-zinc-200">
                      {h.functionName || 'anonymous'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                      {h.file}:{h.line}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                      {h.cyclomaticComplexity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-300">
                      {h.linesOfCode}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-300">
                      {h.nestedDepth}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${
                          h.rating === 'very_high'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : h.rating === 'high'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {h.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Smells & Static Quality Findings */}
      <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="border-b border-zinc-800 pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            Code Smells & Maintainability Observations ({qualityFindings.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Static AST rule violations such as empty exception blocks, arrow nesting, and oversized routines.
          </p>
        </div>

        <div className="space-y-3">
          {qualityFindings.map((finding) => (
            <div
              key={finding.id}
              className="border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300 px-1.5 py-0.5 border border-zinc-700">
                    {finding.category}
                  </span>
                  <span className="text-xs font-semibold text-zinc-100">{finding.title}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                  <FileCode className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{finding.file}:{finding.line}</span>
                </div>
              </div>

              <div className="text-xs text-zinc-400">
                {finding.message}
              </div>

              <div className="font-mono text-xs bg-zinc-950 border border-zinc-800 p-2 text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                {finding.evidence}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
                <div className="text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">Recommendation:</span> {finding.recommendation}
                </div>
                {finding.isFixableWithAi ? (
                  <button
                    onClick={() => onFixFinding(finding)}
                    className="shrink-0 flex items-center gap-1.5 bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Fix with AI
                  </button>
                ) : (
                  <span className="shrink-0 text-[10px] text-zinc-500 font-mono">
                    Manual refactoring recommended
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

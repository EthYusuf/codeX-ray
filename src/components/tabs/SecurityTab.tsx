import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Sparkles,
  Lock,
  FileCode,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { AnalysisReport, CodeFinding, Severity } from '../../types';

interface SecurityTabProps {
  report: AnalysisReport;
  onFixFinding: (finding: CodeFinding) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ report, onFixFinding }) => {
  const { security } = report;
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');

  const filteredFindings = security.findings.filter((f) => {
    if (severityFilter === 'all') return true;
    return f.severity === severityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Security Status Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Critical Sinks</div>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-400">
            {security.summary.criticalCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Requires immediate patch</div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">High Priority</div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400">
            {security.summary.highCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Direct exploitation path</div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Medium & Low</div>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-300">
            {security.summary.mediumCount + security.summary.lowCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Hardening opportunities</div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Masked Secrets</div>
          <div className="mt-1 text-2xl font-bold font-mono text-indigo-400">
            {security.secrets.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Safely masked tokens</div>
        </div>
      </div>

      {/* Secret Scanner Section */}
      {security.secrets.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Hardcoded Secrets & Token Detection
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
              <Lock className="h-3.5 w-3.5 text-zinc-500" />
              <span>Full Masking Enforced</span>
            </div>
          </div>

          <div className="space-y-2">
            {security.secrets.map((sec) => (
              <div
                key={sec.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs gap-2"
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-zinc-200">
                    <span>{sec.type}</span>
                    <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800 bg-zinc-900 px-1.5 py-0.2">
                      Confidence: {sec.confidence}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-zinc-400 flex items-center gap-2">
                    <FileCode className="h-3 w-3 text-zinc-500" />
                    <span>{sec.file}:{sec.line}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-zinc-500 text-[11px]">Masked:</span>
                  <span className="bg-zinc-950 px-2 py-1 text-emerald-400 border border-zinc-800 select-all">
                    {sec.maskedSecret}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500 pt-1">
            Note: CodeX-Ray never displays the raw secret in the browser and will never transmit detected credentials to any external AI provider.
          </p>
        </div>
      )}

      {/* Vulnerability Findings Header & Filter */}
      <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Deterministic Vulnerability Sinks ({filteredFindings.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Identified through static AST parsing and taint tracking rules.
            </p>
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-1 border border-zinc-800 bg-zinc-900 p-1">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                  severityFilter === sev
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Findings List */}
        {filteredFindings.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            No security findings matching the selected filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                className="border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 transition-colors hover:border-zinc-700"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        finding.severity === 'critical'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : finding.severity === 'high'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-xs font-bold text-white">{finding.title}</span>
                    {finding.cwe && (
                      <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800 bg-zinc-950 px-1.5 py-0.5">
                        {finding.cwe}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <FileCode className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{finding.file}:{finding.line}</span>
                    <span>·</span>
                    <span className="text-zinc-300 font-semibold">Confidence: {finding.confidence}</span>
                  </div>
                </div>

                {/* Evidence */}
                <div>
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                    Observed Code Evidence:
                  </div>
                  <pre className="font-mono text-xs text-rose-300 bg-zinc-950 p-2.5 border border-zinc-800 overflow-x-auto whitespace-pre-wrap">
                    {finding.evidence}
                  </pre>
                </div>

                {/* Recommendation & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-zinc-800/80 pt-3 gap-3">
                  <div className="text-xs text-zinc-300">
                    <span className="font-semibold text-zinc-200">Remediation: </span>
                    {finding.recommendation}
                  </div>

                  <div className="shrink-0">
                    {finding.isFixableWithAi ? (
                      <button
                        onClick={() => onFixFinding(finding)}
                        className="flex items-center gap-1.5 bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Fix with AI
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400 border border-zinc-800 bg-zinc-950 px-2.5 py-1">
                        Manual Fix Recommended
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

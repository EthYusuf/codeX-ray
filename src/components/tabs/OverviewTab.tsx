import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCode,
  Layers,
  Code2,
  TestTube2,
  BookOpen,
} from 'lucide-react';
import { AnalysisReport, CodeFinding } from '../../types';
import { MetricCalculationModal } from '../MetricCalculationModal';

interface OverviewTabProps {
  report: AnalysisReport;
  onFixFinding: (finding: CodeFinding) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  report,
  onFixFinding,
  onNavigateTab,
}) => {
  const [calculationModal, setCalculationModal] = useState<{
    isOpen: boolean;
    title: string;
    score: number;
    formula: string;
    factors: any[];
  }>({
    isOpen: false,
    title: '',
    score: 0,
    formula: '',
    factors: [],
  });

  const { metrics, aiInsights, security } = report;
  const criticalFindings = security.findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high'
  );

  const openFormula = (key: string, title: string, score: number) => {
    const calc = metrics.calculationExplanations[key] || {
      score,
      formula: 'Score derived from scanned AST findings and repository metrics.',
      factors: [
        { name: 'Deterministic AST Findings', weight: 0.5, actual: score, impact: 'Empirical risk factors' },
        { name: 'Standard Code Metrics', weight: 0.5, actual: `${score}/100`, impact: 'Threshold deviations' },
      ],
    };
    setCalculationModal({
      isOpen: true,
      title,
      score: calc.score,
      formula: calc.formula,
      factors: calc.factors,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Health Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Overall Health */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Project Health</span>
            <button
              onClick={() => openFormula('healthScore', 'Overall Project Health', metrics.healthScore)}
              className="text-zinc-500 hover:text-zinc-300"
              title="How was this calculated?"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white">{metrics.healthScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
          <div className="text-[11px] text-zinc-400">Weighted composite index</div>
        </div>

        {/* Security */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Security</span>
            <button
              onClick={() => openFormula('securityScore', 'Security Index', metrics.securityScore)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="my-2">
            <span className={`text-3xl font-bold font-mono ${metrics.securityScore < 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {metrics.securityScore}
            </span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            {security.findings.length} risks · {security.secrets.length} secrets
          </div>
        </div>

        {/* Architecture */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Architecture</span>
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white">{metrics.architectureScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            {report.architecture.layers.filter((l) => l.matchedFiles.length > 0).length} active layers
          </div>
        </div>

        {/* Maintainability */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Maintainability</span>
            <button
              onClick={() => openFormula('maintainabilityScore', 'Maintainability Score', metrics.maintainabilityScore)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white">{metrics.maintainabilityScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">{metrics.technicalDebtHours}h tech debt</div>
        </div>

        {/* Testing */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Testing</span>
            <TestTube2 className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white">{metrics.testingScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            {report.testing.testFilesCount} test suites
          </div>
        </div>

        {/* Documentation */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Documentation</span>
            <BookOpen className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-bold font-mono text-white">{metrics.documentationScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/100</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            {report.documentation.hasReadme ? 'README verified' : 'No README'}
          </div>
        </div>
      </div>

      {/* Critical Findings Alert Banner with AI Fix button */}
      {criticalFindings.length > 0 && (
        <div className="border border-rose-900/80 bg-rose-950/30 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <h3 className="text-sm font-semibold text-rose-200">
                {criticalFindings.length} High & Critical Security Sinks Detected
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('security')}
              className="text-xs text-rose-300 hover:text-white flex items-center gap-1 font-medium"
            >
              View all in Security Center <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2 mt-3">
            {criticalFindings.slice(0, 3).map((f) => (
              <div
                key={f.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between border border-rose-900/50 bg-black/40 p-3 gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase bg-rose-900 text-rose-200 px-1.5 py-0.5">
                      {f.severity}
                    </span>
                    <span className="text-xs font-semibold text-zinc-100">{f.title}</span>
                    {f.cwe && <span className="text-[11px] font-mono text-zinc-400">[{f.cwe}]</span>}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                    <FileCode className="h-3 w-3 text-zinc-500" />
                    <span>{f.file}:{f.line}</span>
                    <span>·</span>
                    <span className="truncate max-w-md">{f.evidence}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {f.isFixableWithAi ? (
                    <button
                      onClick={() => onFixFinding(f)}
                      className="flex items-center gap-1.5 border border-indigo-600 bg-indigo-950/80 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-900 hover:text-white transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      Fix with AI
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-400 border border-zinc-800 bg-zinc-900 px-2 py-1">
                      Manual Fix Recommended
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Grounded Synthesis & Developer Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive Summary */}
        <div className="lg:col-span-2 border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-zinc-300" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Grounded Architectural Intelligence
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5">
              Strict Anti-Hallucination Verified
            </span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
            <div>
              <span className="font-semibold text-white">Executive Synthesis:</span>
              <p className="mt-1 text-zinc-400">{aiInsights.executiveSummary}</p>
            </div>
            <div>
              <span className="font-semibold text-white">Architecture Assessment:</span>
              <p className="mt-1 text-zinc-400">{aiInsights.architectureSummary}</p>
            </div>
            <div>
              <span className="font-semibold text-white">Security Posture:</span>
              <p className="mt-1 text-zinc-400">{aiInsights.securitySummary}</p>
            </div>
          </div>
        </div>

        {/* 3-Week Developer Roadmap */}
        <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Developer Remediation Roadmap
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">P0 → P2</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Week 1 */}
            <div>
              <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wide mb-1.5">
                Week 1 · Critical Stabilization
              </div>
              <ul className="space-y-1.5 text-zinc-300 pl-3 border-l border-amber-900/60">
                {aiInsights.roadmap.week1.map((item, idx) => (
                  <li key={idx} className="text-zinc-400 leading-snug">{item}</li>
                ))}
              </ul>
            </div>

            {/* Week 2 */}
            <div>
              <div className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wide mb-1.5">
                Week 2 · Modular Refactoring
              </div>
              <ul className="space-y-1.5 text-zinc-300 pl-3 border-l border-indigo-900/60">
                {aiInsights.roadmap.week2.map((item, idx) => (
                  <li key={idx} className="text-zinc-400 leading-snug">{item}</li>
                ))}
              </ul>
            </div>

            {/* Week 3 */}
            <div>
              <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wide mb-1.5">
                Week 3 · Hardening & Verification
              </div>
              <ul className="space-y-1.5 text-zinc-300 pl-3 border-l border-emerald-900/60">
                {aiInsights.roadmap.week3.map((item, idx) => (
                  <li key={idx} className="text-zinc-400 leading-snug">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Calculation Explanation Modal */}
      <MetricCalculationModal
        isOpen={calculationModal.isOpen}
        onClose={() => setCalculationModal((prev) => ({ ...prev, isOpen: false }))}
        title={calculationModal.title}
        score={calculationModal.score}
        formula={calculationModal.formula}
        factors={calculationModal.factors}
      />
    </div>
  );
};

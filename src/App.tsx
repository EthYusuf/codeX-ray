import React, { useState, useEffect } from 'react';
import {
  Terminal,
  FolderGit2,
  Shield,
  Layers,
  Activity,
  Package,
  TestTube2,
  FileCode,
  GitPullRequest,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  GitBranch,
} from 'lucide-react';
import { AnalysisReport, AnalysisJob, CodeFinding } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { AnalysisProgressBar } from './components/AnalysisProgressBar';
import { RepositorySelectorModal } from './components/RepositorySelectorModal';
import { FixWithAiModal } from './components/fix/FixWithAiModal';

import { OverviewTab } from './components/tabs/OverviewTab';
import { ArchitectureTab } from './components/tabs/ArchitectureTab';
import { SecurityTab } from './components/tabs/SecurityTab';
import { QualityTab } from './components/tabs/QualityTab';
import { DependenciesTab } from './components/tabs/DependenciesTab';
import { TestingTab } from './components/tabs/TestingTab';
import { ExplorerTab } from './components/tabs/ExplorerTab';
import { PullRequestsTab } from './components/tabs/PullRequestsTab';

export default function App() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState(false);
  const [fixingFinding, setFixingFinding] = useState<CodeFinding | null>(null);

  // Poll job status if in progress
  useEffect(() => {
    if (!currentJob || currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await api.getJobStatus(currentJob.id);
        setCurrentJob(status);

        if (status.status === 'COMPLETED' && status.reportId) {
          const loadedReport = await api.getReport(status.reportId);
          setReport(loadedReport);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [currentJob]);

  // Initial load: start analysis on first featured repository
  useEffect(() => {
    handleSelectRepo('acme-fintech', 'payment-gateway-service');
  }, []);

  const handleSelectRepo = async (owner: string, repo: string, repoUrl?: string) => {
    try {
      const res = await api.startAnalysis(owner, repo, repoUrl);
      const initialJob = await api.getJobStatus(res.jobId);
      setCurrentJob(initialJob);
    } catch (err) {
      console.error('Failed to start analysis:', err);
    }
  };

  const handleExportReport = (format: 'json' | 'markdown') => {
    if (!report) return;

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `codexray-${report.repository.name}-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const md = `# CodeX-Ray Repository Intelligence Report: ${report.repository.fullName}
**Analysis Timestamp:** ${report.timestamp}
**Default Branch:** ${report.repository.defaultBranch} · **Commit SHA:** ${report.repository.lastCommitSha}
**Overall Health Score:** ${report.metrics.healthScore}/100

## Executive Summary
${report.aiInsights.executiveSummary}

## Architecture
- **Detected Pattern:** ${report.architecture.pattern}
- **Active Layers:** ${report.architecture.layers.filter((l) => l.matchedFiles.length > 0).map((l) => l.name).join(', ')}

## Security Posture
- **Security Score:** ${report.metrics.securityScore}/100
- **Total Security Findings:** ${report.security.findings.length}
- **Detected Secrets (Masked):** ${report.security.secrets.length}

${report.security.findings.map((f) => `- **${f.severity.toUpperCase()}** ${f.title} (${f.file}:${f.line})\n  ${f.evidence}\n  *Recommendation:* ${f.recommendation}`).join('\n\n')}

## 3-Week Remediation Roadmap
### Week 1
${report.aiInsights.roadmap.week1.map((item) => `- ${item}`).join('\n')}

### Week 2
${report.aiInsights.roadmap.week2.map((item) => `- ${item}`).join('\n')}

### Week 3
${report.aiInsights.roadmap.week3.map((item) => `- ${item}`).join('\n')}
`;
      const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `codexray-${report.repository.name}-report.md`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: Terminal, count: undefined },
    { id: 'architecture', label: 'Architecture', icon: Layers, count: report?.architecture.layers.filter((l) => l.matchedFiles.length > 0).length },
    { id: 'security', label: 'Security', icon: Shield, count: (report?.security.findings.length || 0) + (report?.security.secrets.length || 0) },
    { id: 'quality', label: 'Code Quality', icon: Activity, count: report?.quality.findings.length },
    { id: 'dependencies', label: 'Dependencies', icon: Package, count: report?.dependencies.items.length },
    { id: 'testing', label: 'Testing & Debt', icon: TestTube2, count: `${report?.metrics.technicalDebtHours || 0}h` },
    { id: 'explorer', label: 'File Explorer', icon: FileCode, count: report?.metrics.totalFiles },
    { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest, count: 2 },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        report={report}
        onOpenRepoSelector={() => setIsRepoSelectorOpen(true)}
        onExportReport={handleExportReport}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Analysis Progress Banner if job is running */}
        {currentJob && currentJob.status !== 'COMPLETED' && (
          <AnalysisProgressBar job={currentJob} />
        )}

        {/* Dashboard Tabs & Views when report is loaded */}
        {report ? (
          <div>
            {/* Tab Bar */}
            <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-950/80 p-1 overflow-x-auto mb-6">
              {navTabs.map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-b-2 border-indigo-500 bg-zinc-900 text-white font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{t.label}</span>
                    {t.count !== undefined && (
                      <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.2">
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Tab View */}
            {activeTab === 'overview' && (
              <OverviewTab
                report={report}
                onFixFinding={(f) => setFixingFinding(f)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'architecture' && (
              <ArchitectureTab report={report} />
            )}

            {activeTab === 'security' && (
              <SecurityTab
                report={report}
                onFixFinding={(f) => setFixingFinding(f)}
              />
            )}

            {activeTab === 'quality' && (
              <QualityTab
                report={report}
                onFixFinding={(f) => setFixingFinding(f)}
              />
            )}

            {activeTab === 'dependencies' && (
              <DependenciesTab report={report} />
            )}

            {activeTab === 'testing' && (
              <TestingTab report={report} />
            )}

            {activeTab === 'explorer' && (
              <ExplorerTab
                report={report}
                onFixFinding={(f) => setFixingFinding(f)}
              />
            )}

            {activeTab === 'pulls' && (
              <PullRequestsTab report={report} />
            )}
          </div>
        ) : (
          /* Empty / Landing Hero state if no report */
          <div className="border border-zinc-800 bg-zinc-950 p-12 text-center space-y-6 max-w-3xl mx-auto my-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-zinc-700 bg-zinc-900">
              <Terminal className="h-7 w-7 text-indigo-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Understand your codebase beyond the surface.
              </h1>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                CodeX-Ray connects to any GitHub repository to perform deep deterministic AST analysis, security vulnerability scanning, architecture topology mapping, and grounded AI reasoning.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsRepoSelectorOpen(true)}
                className="flex items-center gap-2 bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors"
              >
                <FolderGit2 className="h-4 w-4 text-zinc-900" />
                Connect GitHub Repository
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-zinc-800/80 pt-8 mt-6">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Read-Only Analysis
                </div>
                <p className="text-xs text-zinc-500">
                  CodeX-Ray will never silently modify user code. Scans run in a deterministic isolated pipeline.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-400" /> Optional AI Code Fixer
                </div>
                <p className="text-xs text-zinc-500">
                  Generate minimal unified diff patches using Claude or Codex with user approval before commit.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-amber-400" /> Git Safety Invariant
                </div>
                <p className="text-xs text-zinc-500">
                  Protected branches (main/master) are never touched directly. Changes apply to dedicated fix branches and PRs.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-4 text-zinc-500 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">CodeX-Ray</span>
            <span>·</span>
            <span>AI-Powered GitHub Repository Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
            <span>Read-Only Default</span>
            <span>·</span>
            <span>Zero Secret Leakage</span>
            <span>·</span>
            <span>Anti-Hallucination Verified</span>
          </div>
        </div>
      </footer>

      {/* Repository Selector Modal */}
      <RepositorySelectorModal
        isOpen={isRepoSelectorOpen}
        onClose={() => setIsRepoSelectorOpen(false)}
        onSelectRepo={handleSelectRepo}
        activeRepoFullName={report?.repository.fullName}
      />

      {/* AI Code Fixer Modal */}
      {fixingFinding && report && (
        <FixWithAiModal
          isOpen={!!fixingFinding}
          onClose={() => setFixingFinding(null)}
          finding={fixingFinding}
          owner={report.repository.owner}
          repo={report.repository.name}
          onFixApplied={() => {
            // Re-trigger analysis if desired
          }}
        />
      )}
    </div>
  );
}

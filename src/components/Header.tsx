import React from 'react';
import {
  FolderGit2,
  Download,
  Terminal,
  Shield,
  FileText,
} from 'lucide-react';
import { AnalysisReport } from '../types';

interface HeaderProps {
  report: AnalysisReport | null;
  onOpenRepoSelector: () => void;
  onExportReport: (format: 'json' | 'markdown') => void;
}

export const Header: React.FC<HeaderProps> = ({
  report,
  onOpenRepoSelector,
  onExportReport,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-zinc-700 bg-zinc-900">
            <Terminal className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white uppercase">CodeX-Ray</span>
              <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800 bg-zinc-900 px-1.5 py-0.5">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">AI-Powered GitHub Repository Intelligence Platform</p>
          </div>
        </div>

        {/* Center Active Repo Information */}
        {report && (
          <div className="hidden md:flex items-center gap-4 text-xs font-mono border border-zinc-800 bg-zinc-900/60 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <FolderGit2 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="font-semibold text-white">{report.repository.fullName}</span>
            </div>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <span>{report.repository.language}</span>
              <span>·</span>
              <span>{report.metrics.totalFiles} files</span>
              <span>·</span>
              <span>{report.metrics.totalLinesOfCode.toLocaleString()} LOC</span>
            </div>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-zinc-300 font-medium">Health: {report.metrics.healthScore}/100</span>
            </div>
          </div>
        )}

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {report && (
            <div className="flex items-center">
              <button
                onClick={() => onExportReport('markdown')}
                className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Export analysis as Markdown report"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">MD</span>
              </button>
              <button
                onClick={() => onExportReport('json')}
                className="flex items-center gap-1.5 border-y border-r border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Export report as raw JSON"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">JSON</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenRepoSelector}
            className="flex items-center gap-1.5 border border-zinc-700 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white transition-colors"
          >
            <FolderGit2 className="h-3.5 w-3.5 text-zinc-800" />
            <span>Connect Repo</span>
          </button>
        </div>
      </div>
    </header>
  );
};

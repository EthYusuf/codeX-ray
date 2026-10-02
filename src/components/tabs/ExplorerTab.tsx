import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Activity,
  FileText,
} from 'lucide-react';
import { AnalysisReport, RepositoryFileNode, CodeFinding } from '../../types';
import { api } from '../../services/api';

interface ExplorerTabProps {
  report: AnalysisReport;
  onFixFinding: (finding: CodeFinding) => void;
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({ report, onFixFinding }) => {
  const [selectedFile, setSelectedFile] = useState<string>('backend/database.py');
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['backend', 'src', 'backend/api']));

  // All findings in report
  const allFindings = [...report.security.findings, ...report.quality.findings];

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const loadFile = (path: string) => {
    setSelectedFile(path);
    setLoading(true);
    api.getFileContent(report.repository.owner, report.repository.name, path)
      .then((res) => setFileContent(res.content))
      .catch(() => setFileContent('// File content unavailable'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // pick first finding file or default
    const firstFindingFile = allFindings[0]?.file;
    const initial = firstFindingFile || 'backend/database.py';
    loadFile(initial);
  }, []);

  const renderTree = (nodes: RepositoryFileNode[]) => {
    return (
      <div className="space-y-0.5">
        {nodes.map((node) => {
          if (node.type === 'directory') {
            const isExpanded = expandedDirs.has(node.path);
            return (
              <div key={node.path}>
                <button
                  onClick={() => toggleDir(node.path)}
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  )}
                  <span className="font-mono truncate">{node.name}</span>
                </button>

                {isExpanded && node.children && (
                  <div className="pl-4 border-l border-zinc-800/80 ml-2">
                    {renderTree(node.children)}
                  </div>
                )}
              </div>
            );
          }

          const isSelected = selectedFile === node.path;
          return (
            <button
              key={node.path}
              onClick={() => loadFile(node.path)}
              className={`flex w-full items-center justify-between px-2 py-1 text-left text-xs transition-colors ${
                isSelected
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <FileCode className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="font-mono truncate">{node.name}</span>
              </div>
              {node.findingsCount && node.findingsCount > 0 ? (
                <span className="ml-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-950 px-1 py-0.2 border border-rose-900">
                  {node.findingsCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  const fileFindings = allFindings.filter((f) => f.file === selectedFile);
  const fileLines = fileContent.split('\n');

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 border border-zinc-800 bg-zinc-950 min-h-[550px]">
      {/* Left Tree Navigator */}
      <div className="border-b md:border-b-0 md:border-r border-zinc-800 p-3 space-y-3 bg-zinc-950">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <span>Repository Explorer</span>
          <span className="font-mono text-zinc-500 text-[10px]">{report.fileTree.length} roots</span>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {renderTree(report.fileTree)}
        </div>
      </div>

      {/* Right Code Viewer with Inline Findings */}
      <div className="md:col-span-3 flex flex-col bg-zinc-950">
        {/* File Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300 truncate">
            <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
            <span className="font-semibold text-white">{selectedFile}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 text-[11px]">{fileLines.length} lines</span>
          </div>

          <div className="flex items-center gap-2">
            {fileFindings.length > 0 && (
              <span className="text-[10px] uppercase font-bold text-rose-300 bg-rose-950 border border-rose-800 px-2 py-0.5">
                {fileFindings.length} Finding(s) in this file
              </span>
            )}
          </div>
        </div>

        {/* Source Content */}
        <div className="flex-1 overflow-auto p-2 font-mono text-xs max-h-[500px]">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading file content...</div>
          ) : (
            <div>
              {fileLines.map((line, idx) => {
                const lineNum = idx + 1;
                const findingOnLine = fileFindings.find((f) => f.line === lineNum);

                return (
                  <React.Fragment key={lineNum}>
                    <div
                      className={`flex items-start hover:bg-zinc-900/60 ${
                        findingOnLine ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <span className="w-10 select-none text-right pr-4 text-zinc-600 text-[11px] shrink-0">
                        {lineNum}
                      </span>
                      <span className="text-zinc-300 whitespace-pre font-mono flex-1">
                        {line || ' '}
                      </span>
                    </div>

                    {/* Inline finding callout docked right beneath the line */}
                    {findingOnLine && (
                      <div className="my-1.5 ml-10 mr-4 border border-rose-800/80 bg-rose-950/40 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-rose-400" />
                            <span className="font-bold text-rose-200">{findingOnLine.title}</span>
                            <span className="text-[10px] uppercase font-bold bg-rose-900 text-rose-200 px-1.5 py-0.2">
                              {findingOnLine.severity}
                            </span>
                          </div>

                          {findingOnLine.isFixableWithAi ? (
                            <button
                              onClick={() => onFixFinding(findingOnLine)}
                              className="flex items-center gap-1.5 bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Fix with AI
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400 border border-zinc-800 bg-zinc-900 px-2 py-0.5">
                              Manual Fix Recommended
                            </span>
                          )}
                        </div>

                        <div className="text-zinc-300 font-sans text-xs">
                          {findingOnLine.recommendation}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

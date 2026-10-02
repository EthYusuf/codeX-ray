import React, { useState } from 'react';
import { Columns2, Rows2, Copy, Check } from 'lucide-react';

interface DiffViewerProps {
  unifiedDiff: string;
  targetFile: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ unifiedDiff, targetFile }) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(unifiedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = unifiedDiff.split('\n');

  return (
    <div className="border border-zinc-700 bg-zinc-950 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Target File:</span>
          <span className="font-semibold text-zinc-100">{targetFile}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-zinc-700 bg-zinc-800 p-0.5">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] ${
                viewMode === 'unified' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Rows2 className="h-3 w-3" /> Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] ${
                viewMode === 'split' ? 'bg-zinc-700 text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns2 className="h-3 w-3" /> Split
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy Patch'}
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-auto p-2">
        {lines.map((line, idx) => {
          let lineClass = 'text-zinc-300 hover:bg-zinc-900/60';
          let prefix = ' ';
          let content = line;

          if (line.startsWith('---') || line.startsWith('+++')) {
            lineClass = 'text-zinc-500 font-bold bg-zinc-900/30';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-cyan-400 bg-cyan-950/20 my-1 py-0.5 px-1 font-semibold';
          } else if (line.startsWith('+')) {
            lineClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-1.5';
            prefix = '+';
            content = line.substring(1);
          } else if (line.startsWith('-')) {
            lineClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-1.5';
            prefix = '-';
            content = line.substring(1);
          }

          return (
            <div key={idx} className={`flex items-start font-mono leading-relaxed ${lineClass}`}>
              <span className="w-8 shrink-0 select-none text-right pr-3 text-zinc-600 text-[11px]">{idx + 1}</span>
              <span className="w-4 shrink-0 select-none font-bold text-center text-[11px]">{prefix}</span>
              <span className="whitespace-pre-wrap break-all">{content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

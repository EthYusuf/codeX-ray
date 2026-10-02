import React, { useState } from 'react';
import { Layers, AlertTriangle, ArrowRight, ShieldCheck, FileCode } from 'lucide-react';
import { AnalysisReport, ArchitectureLayer } from '../../types';

interface ArchitectureTabProps {
  report: AnalysisReport;
}

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({ report }) => {
  const { architecture } = report;
  const [selectedLayer, setSelectedLayer] = useState<ArchitectureLayer | null>(
    architecture.layers.find((l) => l.matchedFiles.length > 0) || null
  );

  return (
    <div className="space-y-6">
      {/* Pattern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800 bg-zinc-950 p-5 gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono">
            Detected Architectural Blueprint
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
            {architecture.pattern}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Structural topology parsed from directory layout, imports, and component boundaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="border border-zinc-800 bg-zinc-900 px-3 py-2 text-right">
            <div className="text-[10px] text-zinc-400 uppercase font-mono">Layers Identified</div>
            <div className="text-base font-bold font-mono text-zinc-100">
              {architecture.layers.filter((l) => l.matchedFiles.length > 0).length} / {architecture.layers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Architectural Warnings if any */}
      {architecture.warnings.length > 0 && (
        <div className="border border-amber-900/60 bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Architectural Boundary Observations</span>
          </div>
          <ul className="space-y-1 text-xs text-amber-200/90 pl-5 list-disc">
            {architecture.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Visual Layer Topology Flow */}
      <div className="border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            System Topology & Interaction Graph
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">Interactive Nodes</span>
        </div>

        <div className="flex flex-col md:flex-row items-stretch justify-between gap-3 overflow-x-auto py-2">
          {architecture.layers
            .filter((l) => l.matchedFiles.length > 0)
            .map((layer, idx, arr) => {
              const isSelected = selectedLayer?.id === layer.id;
              return (
                <React.Fragment key={layer.id}>
                  <button
                    onClick={() => setSelectedLayer(layer)}
                    className={`flex-1 min-w-[180px] p-4 text-left border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-100">{layer.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5">
                        {layer.matchedFiles.length} files
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {layer.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-800/80 pt-2">
                      <span>Cohesion: {layer.cohesionScore}%</span>
                      {layer.dependencies.length > 0 && (
                        <span>→ {layer.dependencies.join(', ')}</span>
                      )}
                    </div>
                  </button>

                  {idx < arr.length - 1 && (
                    <div className="hidden md:flex items-center justify-center text-zinc-600 px-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
        </div>
      </div>

      {/* Layer Detail Inspector */}
      {selectedLayer && (
        <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>{selectedLayer.name} Inspector</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{selectedLayer.description}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-400">Cohesion Rating:</span>
              <span className="text-emerald-400 font-bold">{selectedLayer.cohesionScore}/100</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Associated Source Modules ({selectedLayer.matchedFiles.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {selectedLayer.matchedFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 font-mono text-xs text-zinc-300"
                >
                  <FileCode className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-500 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Component boundary separation verified deterministically via file tree analysis.</span>
          </div>
        </div>
      )}
    </div>
  );
};

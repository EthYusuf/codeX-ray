import React from 'react';
import { X, Calculator, ShieldCheck } from 'lucide-react';

interface MetricCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  score: number;
  formula: string;
  factors: { name: string; weight: number; actual: string | number; impact: string }[];
}

export const MetricCalculationModal: React.FC<MetricCalculationModalProps> = ({
  isOpen,
  onClose,
  title,
  score,
  formula,
  factors,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-zinc-400" />
            <h3 className="text-base font-semibold tracking-tight text-white">{title} Calculation Breakdown</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs uppercase tracking-wider text-zinc-400">Score Result</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-semibold text-white">{score}</span>
              <span className="text-xs text-zinc-400">/ 100 normalized index</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1">Mathematical Formula</div>
            <div className="font-mono text-xs text-emerald-400 border border-zinc-800 bg-zinc-950 p-2.5 break-all">
              {formula}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-2">Weight Factors & Observable Metrics</div>
            <div className="space-y-2">
              {factors.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between border border-zinc-800/80 bg-zinc-950/60 p-2.5 text-xs">
                  <div>
                    <div className="font-medium text-zinc-200">{f.name}</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">{f.impact}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium text-zinc-200">{String(f.actual)}</div>
                    <div className="text-[11px] text-zinc-400">Weight: {Math.round(f.weight * 100)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 border-t border-zinc-800 pt-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Scores are derived deterministically from scanned repository metrics, not arbitrary AI guessing.</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-200 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Package, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AnalysisReport } from '../../types';

interface DependenciesTabProps {
  report: AnalysisReport;
}

export const DependenciesTab: React.FC<DependenciesTabProps> = ({ report }) => {
  const { dependencies } = report;
  const items = dependencies.items;
  const vulnerableItems = items.filter((d) => d.hasVulnerability);

  // Group by manager
  const managerCounts: Record<string, number> = {};
  for (const item of items) {
    managerCounts[item.manager] = (managerCounts[item.manager] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Dependency Ecosystem Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Total Dependencies</div>
          <div className="mt-1 text-2xl font-bold font-mono text-white">{items.length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Parsed from manifest trees</div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Direct Dependencies</div>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-200">
            {items.filter((d) => d.type === 'direct').length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">First-order imports</div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Development Deps</div>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-200">
            {items.filter((d) => d.type === 'dev').length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Tooling and test libraries</div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Known CVE Advisories</div>
          <div className={`mt-1 text-2xl font-bold font-mono ${vulnerableItems.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {vulnerableItems.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Security database cross-match</div>
        </div>
      </div>

      {/* Vulnerable Dependencies Alert Table */}
      {vulnerableItems.length > 0 && (
        <div className="border border-rose-900/80 bg-rose-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-rose-900/60 pb-3">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-200">
              Vulnerable Dependency Advisories ({vulnerableItems.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-rose-900/40 text-[11px] text-rose-300 uppercase">
                  <th className="py-2 px-3">Package</th>
                  <th className="py-2 px-3">Installed</th>
                  <th className="py-2 px-3">Advisory ID</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3">Summary</th>
                  <th className="py-2 px-3">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-900/30">
                {vulnerableItems.map((dep, idx) => (
                  <tr key={idx} className="hover:bg-rose-950/40">
                    <td className="py-2.5 px-3 font-bold text-white">{dep.name}</td>
                    <td className="py-2.5 px-3 text-rose-300">{dep.version}</td>
                    <td className="py-2.5 px-3 text-zinc-300">{dep.vulnerabilityDetails?.cve}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-rose-900 text-rose-200 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {dep.vulnerabilityDetails?.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans text-xs">
                      {dep.vulnerabilityDetails?.summary}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      Upgrade to &gt;= {dep.vulnerabilityDetails?.fixedIn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complete Dependency Manifest Table */}
      <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Parsed Dependency Graph ({items.length})
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            {Object.entries(managerCounts).map(([mgr, count]) => (
              <span key={mgr} className="border border-zinc-800 bg-zinc-900 px-2 py-0.5">
                {mgr}: {count}
              </span>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400">
            No package manifest files (package.json, requirements.txt, Cargo.toml, go.mod) detected.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-[11px] text-zinc-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Library Name</th>
                  <th className="py-2.5 px-3">Resolved Version</th>
                  <th className="py-2.5 px-3">Manager</th>
                  <th className="py-2.5 px-3">Scope</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="py-2 px-3 font-semibold text-zinc-200">{item.name}</td>
                    <td className="py-2 px-3 text-zinc-400">{item.version}</td>
                    <td className="py-2 px-3 uppercase text-[11px] text-zinc-500">{item.manager}</td>
                    <td className="py-2 px-3 text-zinc-400 capitalize">{item.type}</td>
                    <td className="py-2 px-3 text-right">
                      {item.hasVulnerability ? (
                        <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-1.5 py-0.5">
                          Advisory Found
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-mono">
                          <CheckCircle2 className="h-3 w-3" /> Secure
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

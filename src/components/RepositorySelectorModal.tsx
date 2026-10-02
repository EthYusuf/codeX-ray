import React, { useState, useEffect } from 'react';
import { X, GitFork, Star, FolderGit2, Search, ArrowRight, Shield } from 'lucide-react';
import { RepositorySummary } from '../types';
import { api } from '../services/api';

interface RepositorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRepo: (owner: string, repo: string, repoUrl?: string) => void;
  activeRepoFullName?: string;
}

export const RepositorySelectorModal: React.FC<RepositorySelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectRepo,
  activeRepoFullName,
}) => {
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.listRepositories()
        .then((res) => setRepositories(res.repositories || []))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    let targetOwner = '';
    let targetRepo = '';
    const match = customUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      targetOwner = match[1];
      targetRepo = match[2].replace(/\.git$/, '');
    } else if (customUrl.includes('/')) {
      const parts = customUrl.trim().split('/');
      targetOwner = parts[0];
      targetRepo = parts[1];
    }

    if (targetOwner && targetRepo) {
      onSelectRepo(targetOwner, targetRepo, customUrl.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-zinc-300" />
            <h3 className="text-base font-semibold text-white">Select GitHub Repository</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Custom Repository URL Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Analyze Any Public GitHub Repository
            </label>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="https://github.com/owner/repository or owner/repository"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full border border-zinc-700 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:border-zinc-400 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-white transition-colors"
              >
                Analyze <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <span className="relative bg-zinc-900 px-3 text-[11px] uppercase tracking-wider text-zinc-500">
              Or Choose Curated Codebase Benchmark
            </span>
          </div>

          {/* Curated Repositories list */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-400">Loading repositories...</div>
            ) : (
              repositories.map((repo) => {
                const isActive = activeRepoFullName === repo.fullName;
                return (
                  <div
                    key={repo.id}
                    className={`flex items-start justify-between border p-4 transition-colors ${
                      isActive ? 'border-zinc-500 bg-zinc-800/40' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">{repo.fullName}</span>
                        {isActive && (
                          <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800/80 bg-emerald-950 px-1.5 py-0.2">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{repo.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                        <span className="text-zinc-300 font-medium">{repo.language}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" /> {repo.stars.toLocaleString()}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" /> {repo.forks.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectRepo(repo.owner, repo.name);
                        onClose();
                      }}
                      className="shrink-0 border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                    >
                      {isActive ? 'Re-Analyze' : 'Select'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-500 border-t border-zinc-800 pt-3">
            <Shield className="h-3.5 w-3.5 text-zinc-400" />
            <span>CodeX-Ray analysis runs in a secure isolated sandbox. Read-only by default.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

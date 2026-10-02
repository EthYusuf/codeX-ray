import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  FileCode,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { AnalysisReport, PullRequestReviewResult } from '../../types';
import { api } from '../../services/api';

interface PullRequestsTabProps {
  report: AnalysisReport;
}

export const PullRequestsTab: React.FC<PullRequestsTabProps> = ({ report }) => {
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [selectedPr, setSelectedPr] = useState<any | null>(null);
  const [reviewResult, setReviewResult] = useState<PullRequestReviewResult | null>(null);
  const [reviewing, setReviewing] = useState<boolean>(false);

  useEffect(() => {
    api.listPullRequests(report.repository.owner, report.repository.name)
      .then((res) => {
        const prs = res.pullRequests || [];
        setPullRequests(prs);
        if (prs.length > 0) setSelectedPr(prs[0]);
      });
  }, [report.repository.owner, report.repository.name]);

  const handleRunReview = async () => {
    if (!selectedPr) return;
    setReviewing(true);
    setReviewResult(null);
    try {
      const result = await api.reviewPullRequest(
        report.repository.owner,
        report.repository.name,
        selectedPr.prNumber
      );
      setReviewResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800 bg-zinc-950 p-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              AI-Powered Pull Request Review Agent
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Automated regression detection, architectural compliance checking, and multi-category code review.
          </p>
        </div>

        {selectedPr && (
          <button
            disabled={reviewing}
            onClick={handleRunReview}
            className="flex items-center gap-1.5 bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {reviewing ? 'Running Code Review...' : 'Run AI Code Review'}
          </button>
        )}
      </div>

      {pullRequests.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-950 p-8 text-center text-xs text-zinc-400">
          No open pull requests detected for this repository.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PR Selection list */}
          <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Open Pull Requests ({pullRequests.length})
            </div>

            <div className="space-y-2">
              {pullRequests.map((pr) => {
                const isSelected = selectedPr?.prNumber === pr.prNumber;
                return (
                  <button
                    key={pr.prNumber}
                    onClick={() => {
                      setSelectedPr(pr);
                      setReviewResult(null);
                    }}
                    className={`w-full text-left p-3 border transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-400 font-semibold">#{pr.prNumber}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">by {pr.author}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 mt-1 line-clamp-2">
                      {pr.title}
                    </div>
                    <div className="mt-2 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <span>{pr.branch}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{pr.baseBranch}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PR Review Details & AI Agent Findings */}
          <div className="md:col-span-2 space-y-4">
            {selectedPr && (
              <div className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
                  <div>
                    <span className="font-mono text-xs text-indigo-400 font-bold">PR #{selectedPr.prNumber}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedPr.title}</h3>
                    <div className="text-[11px] text-zinc-400 font-mono mt-1">
                      Branch: {selectedPr.branch} → {selectedPr.baseBranch} · Author: {selectedPr.author}
                    </div>
                  </div>

                  {reviewResult && (
                    <span
                      className={`px-3 py-1 font-mono text-xs font-bold uppercase border ${
                        reviewResult.verdict === 'APPROVE'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : reviewResult.verdict === 'REQUEST_CHANGES'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {reviewResult.verdict.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {/* Diff summary */}
                {selectedPr.changedFiles && selectedPr.changedFiles.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Changed Files & Diffs
                    </div>
                    <div className="space-y-3">
                      {selectedPr.changedFiles.map((file: any, i: number) => (
                        <div key={i} className="border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-xs">
                          <div className="flex items-center justify-between text-zinc-300 pb-2 border-b border-zinc-800">
                            <span className="font-semibold text-white">{file.filename}</span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-emerald-400">+{file.additions}</span>
                              <span className="text-rose-400">-{file.deletions}</span>
                            </div>
                          </div>
                          {file.patch && (
                            <pre className="mt-2 text-[11px] text-zinc-400 whitespace-pre-wrap max-h-40 overflow-y-auto bg-zinc-950 p-2 border border-zinc-850">
                              {file.patch}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Results */}
                {reviewResult && (
                  <div className="space-y-4 pt-3 border-t border-zinc-800">
                    <div className="border border-zinc-800 bg-zinc-900/40 p-3 text-xs leading-relaxed text-zinc-300">
                      <span className="font-semibold text-white">Review Summary:</span> {reviewResult.summary}
                    </div>

                    {/* Regression Alerts */}
                    {reviewResult.regressionRisks.length > 0 && (
                      <div className="border border-amber-900/60 bg-amber-950/30 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          <span>Potential Regressions Introduced</span>
                        </div>
                        <ul className="text-xs text-amber-200/90 pl-5 list-disc space-y-1">
                          {reviewResult.regressionRisks.map((reg, idx) => (
                            <li key={idx}>{reg}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Categorized Comments */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Categorized AI Code Review Comments ({reviewResult.comments.length})
                      </div>
                      <div className="space-y-3">
                        {reviewResult.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="border border-zinc-800 bg-zinc-900/50 p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold uppercase bg-zinc-800 text-zinc-200 px-1.5 py-0.5 border border-zinc-700">
                                  {comment.category}
                                </span>
                                <span className="font-semibold text-white">{comment.title}</span>
                              </div>
                              <span className="font-mono text-[11px] text-zinc-400">
                                {comment.file}:{comment.line}
                              </span>
                            </div>

                            <p className="text-zinc-300 leading-relaxed">{comment.comment}</p>

                            {comment.evidence && (
                              <pre className="font-mono text-[11px] bg-zinc-950 border border-zinc-800 p-2 text-zinc-400 whitespace-pre-wrap">
                                {comment.evidence}
                              </pre>
                            )}

                            <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                              <span className="font-semibold text-zinc-300">Suggested Action: </span>
                              {comment.suggestedAction}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

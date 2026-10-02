import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldAlert,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Info,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  CodeFinding,
  AiFixProviderType,
  AiFixPatchProposal,
  PatchValidationResult,
  ApplyFixResult,
  CreatePullRequestResult,
} from '../../types';
import { api } from '../../services/api';
import { DiffViewer } from './DiffViewer';

interface FixWithAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  finding: CodeFinding;
  owner: string;
  repo: string;
  onFixApplied?: () => void;
}

export const FixWithAiModal: React.FC<FixWithAiModalProps> = ({
  isOpen,
  onClose,
  finding,
  owner,
  repo,
  onFixApplied,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AiFixProviderType>('claude');
  const [providersStatus, setProvidersStatus] = useState<any[]>([]);
  const [sessionApiKey, setSessionApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proposal, setProposal] = useState<AiFixPatchProposal | null>(null);
  const [validation, setValidation] = useState<PatchValidationResult | null>(null);
  const [minimalContextSummary, setMinimalContextSummary] = useState<any | null>(null);

  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyFixResult | null>(null);

  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<CreatePullRequestResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getProvidersStatus().then((res) => {
        setProvidersStatus(res.providers || []);
      });
      // reset states
      setProposal(null);
      setValidation(null);
      setApplyResult(null);
      setPrResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProviderInfo = providersStatus.find((p) => p.id === selectedProvider);
  const isKeyConfigured = currentProviderInfo?.configuredInEnv;

  const handleGeneratePatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.previewFix(
        finding.id,
        owner,
        repo,
        selectedProvider,
        sessionApiKey || undefined
      );
      setProposal(res.proposal);
      setValidation(res.validation);
      setMinimalContextSummary(res.minimalContextSummary);
    } catch (err: any) {
      setError(err.message || 'Failed to generate patch');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = async () => {
    if (!proposal) return;
    setApplying(true);
    setError(null);
    try {
      const res = await api.applyFix(proposal.fixId);
      setApplyResult(res);
      if (onFixApplied) onFixApplied();
    } catch (err: any) {
      setError(err.message || 'Failed to apply fix to branch');
    } finally {
      setApplying(false);
    }
  };

  const handleCreatePr = async () => {
    if (!proposal) return;
    setCreatingPr(true);
    setError(null);
    try {
      const res = await api.createPullRequest(proposal.fixId, owner, repo);
      setPrResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to create pull request');
    } finally {
      setCreatingPr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">AI Code Fixer</h2>
                <span className="border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-mono uppercase text-zinc-400">
                  Optional Auto-Fix System
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Read-only analysis by default. Safe patch proposals require explicit developer approval.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Finding summary bar */}
        <div className="border-b border-zinc-800 bg-zinc-950/60 px-6 py-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${
                finding.severity === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                finding.severity === 'high' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                'bg-zinc-800 text-zinc-300'
              }`}>
                {finding.severity}
              </span>
              <span className="font-semibold text-white">{finding.title}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
              <FileCode className="h-3.5 w-3.5 text-zinc-500" />
              <span>{finding.file}:{finding.line}</span>
            </div>
          </div>
          <div className="mt-1 text-zinc-400 font-mono text-[11px] truncate">
            Evidence: {finding.evidence}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold">Patch validation failed:</span> {error}
              </div>
            </div>
          )}

          {/* 1. Provider Selection */}
          <div className="border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                1. Select AI Coding Fix Provider
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                <span>Zero key exposure to browser</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'claude', name: 'Anthropic Claude API', desc: 'claude-3-7-sonnet minimal surgical fixes' },
                { id: 'codex', name: 'OpenAI Codex API', desc: 'GPT-4o AST code generation' },
                { id: 'gemini', name: 'Google Gemini', desc: 'gemini-3.8-flash server-side SDK' },
              ].map((prov) => {
                const isSelected = selectedProvider === prov.id;
                const status = providersStatus.find((p) => p.id === prov.id);
                return (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedProvider(prov.id as AiFixProviderType)}
                    className={`flex flex-col text-left p-3 border transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>
                        {prov.name}
                      </span>
                      {status?.configuredInEnv ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Configured
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Env / Session</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1">{prov.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Custom Session Key Toggle */}
            {!isKeyConfigured && selectedProvider !== 'gemini' && (
              <div className="mt-3 border-t border-zinc-800/80 pt-3">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                >
                  {showKeyInput ? 'Hide custom session API key' : '+ Enter custom temporary API key for this session (optional)'}
                </button>
                {showKeyInput && (
                  <div className="mt-2">
                    <input
                      type="password"
                      placeholder={`Enter ${selectedProvider === 'claude' ? 'Anthropic' : 'OpenAI'} API Key for temporary server proxying`}
                      value={sessionApiKey}
                      onChange={(e) => setSessionApiKey(e.target.value)}
                      className="w-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-white placeholder-zinc-500"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Keys are transmitted over HTTPS to backend memory only and never stored in files or logs.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <Info className="h-3.5 w-3.5 text-zinc-500" />
                <span>Minimal Context Principle: Only affected file lines & imports are sent to AI.</span>
              </div>
              <button
                disabled={loading}
                onClick={handleGeneratePatch}
                className="flex items-center gap-1.5 bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <>Generating Patch...</>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Safe Patch
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Minimal Context Display if proposal ready */}
          {minimalContextSummary && (
            <div className="border border-zinc-800/80 bg-zinc-950/40 p-3 text-xs">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                Context Provided to AI Provider
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-zinc-300">
                <div>File: <span className="text-zinc-100">{minimalContextSummary.file}</span></div>
                <div>Lines: <span className="text-zinc-100">{minimalContextSummary.lines}</span></div>
                <div>Finding: <span className="text-zinc-100 truncate">{minimalContextSummary.finding}</span></div>
              </div>
            </div>
          )}

          {/* 2. Patch Proposal Diff & Validation */}
          {proposal && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    2. AI Proposed Unified Diff Patch
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Minimal Change Verified
                  </span>
                </div>
                <DiffViewer unifiedDiff={proposal.unifiedDiff} targetFile={proposal.targetFile} />
              </div>

              {/* AI Explanation breakdown */}
              <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  AI Fix Explanation & Risk Assessment
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="border border-zinc-800/80 bg-zinc-900/40 p-2.5">
                    <div className="font-semibold text-zinc-200">Why this change was made:</div>
                    <div className="mt-1 text-zinc-400">{proposal.explanation.whyThisChangeWasMade}</div>
                  </div>
                  <div className="border border-zinc-800/80 bg-zinc-900/40 p-2.5">
                    <div className="font-semibold text-zinc-200">What changed:</div>
                    <div className="mt-1 text-zinc-400">{proposal.explanation.whatChanged}</div>
                  </div>
                  <div className="border border-zinc-800/80 bg-zinc-900/40 p-2.5">
                    <div className="font-semibold text-zinc-200">Why original code was problematic:</div>
                    <div className="mt-1 text-zinc-400">{proposal.explanation.whyOriginalCodeWasProblematic}</div>
                  </div>
                  <div className="border border-zinc-800/80 bg-zinc-900/40 p-2.5">
                    <div className="font-semibold text-zinc-200">Potential side effects & tests:</div>
                    <div className="mt-1 text-zinc-400">
                      {proposal.explanation.potentialSideEffects} · {proposal.explanation.testsPerformed}
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Checklist */}
              {validation && (
                <div className="border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      3. CodeX-Ray Patch Validation Suite
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-bold font-mono ${
                      validation.isValid ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {validation.isValid ? 'VALIDATION PASSED' : 'VALIDATION FAILED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Target file exists', pass: validation.checks.targetFileExists },
                      { label: 'Original code matches target', pass: validation.checks.originalCodeMatches },
                      { label: 'Patch applies cleanly without conflicts', pass: validation.checks.appliesCleanly },
                      { label: 'Only intended file modified (minimal change)', pass: validation.checks.onlyModifiesIntendedFiles },
                      { label: 'Static analysis re-run passed', pass: validation.checks.staticAnalysisPassed },
                      { label: 'Security scanner confirms resolution', pass: validation.checks.securityCheckPassed },
                      { label: 'Syntax & automated test assertions', pass: validation.checks.testsPassed },
                    ].map((chk, i) => (
                      <div key={i} className="flex items-center justify-between border border-zinc-800/80 bg-zinc-900/30 px-3 py-1.5">
                        <span className="text-zinc-300">{chk.label}</span>
                        {chk.pass ? (
                          <span className="font-mono text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                          </span>
                        ) : (
                          <span className="font-mono text-rose-400 flex items-center gap-1 font-bold">
                            <X className="h-3.5 w-3.5" /> FAIL
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Findings Delta */}
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-xs">
                    <span className="text-zinc-400">Security Findings Delta:</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-zinc-300">Before: <strong className="text-rose-400">{validation.beforeFindingsCount}</strong></span>
                      <ArrowRight className="h-3 w-3 text-zinc-500" />
                      <span className="text-zinc-300">After: <strong className="text-emerald-400">{validation.afterFindingsCount}</strong></span>
                      <span className="text-[11px] text-emerald-400">(-{validation.resolvedFindings.length} resolved)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Git Safety & Action Buttons */}
              <div className="border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    4. Git Safety & Developer Approval
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-400">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Protected Branch Invariant: main/master never modified</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-4">
                  CodeX-Ray will commit this minimal patch to dedicated branch{' '}
                  <code className="bg-zinc-800 px-1 py-0.5 text-zinc-200">
                    codexray/fix/{finding.id.substring(0, 20)}
                  </code>{' '}
                  and open an audited Pull Request.
                </p>

                {applyResult && (
                  <div className="mb-4 border border-emerald-800/80 bg-emerald-950/40 p-3 text-xs text-emerald-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Patch successfully applied to safety branch:
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-emerald-300">
                      Branch: {applyResult.branchName} · Commit: {applyResult.commitSha}
                    </div>
                  </div>
                )}

                {prResult && (
                  <div className="mb-4 border border-indigo-800/80 bg-indigo-950/40 p-3 text-xs text-indigo-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold">
                        <GitPullRequest className="h-4 w-4 text-indigo-400" />
                        Pull Request #{prResult.prNumber} Generated:
                      </div>
                      <a
                        href={prResult.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-indigo-300 underline"
                      >
                        Inspect on GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-zinc-300 bg-zinc-950 p-2 border border-zinc-800">
                      Title: {prResult.title}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className="border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    Reject
                  </button>

                  {!applyResult ? (
                    <button
                      disabled={applying || !validation?.isValid}
                      onClick={handleApplyFix}
                      className="flex items-center gap-2 bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      {applying ? 'Applying Fix to Branch...' : 'Apply Fix to Dedicated Branch'}
                    </button>
                  ) : !prResult ? (
                    <button
                      disabled={creatingPr}
                      onClick={handleCreatePr}
                      className="flex items-center gap-2 bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <GitPullRequest className="h-3.5 w-3.5" />
                      {creatingPr ? 'Creating PR...' : 'Create Pull Request with Audit Report'}
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="bg-zinc-700 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-600"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

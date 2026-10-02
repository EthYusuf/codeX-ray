import {
  AnalysisJob,
  AnalysisReport,
  RepositorySummary,
  PullRequestReviewResult,
  AiFixProviderType,
  AiFixPatchProposal,
  PatchValidationResult,
  ApplyFixResult,
  CreatePullRequestResult,
} from '../types';

export const api = {
  async getProvidersStatus(): Promise<{
    providers: { id: string; name: string; model: string; configuredInEnv: boolean; requiresCustomKey: boolean }[];
  }> {
    const res = await fetch('/api/v1/fixes/providers');
    return res.json();
  },

  async listRepositories(): Promise<{ repositories: RepositorySummary[] }> {
    const res = await fetch('/api/v1/repositories');
    return res.json();
  },

  async startAnalysis(owner: string, repo: string, repoUrl?: string): Promise<{ jobId: string; status: string }> {
    const res = await fetch('/api/v1/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, repoUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start analysis');
    }
    return res.json();
  },

  async getJobStatus(jobId: string): Promise<AnalysisJob & { reportReady: boolean; reportId?: string }> {
    const res = await fetch(`/api/v1/analysis/${jobId}/status`);
    if (!res.ok) {
      throw new Error('Failed to fetch job status');
    }
    return res.json();
  },

  async getReport(reportId: string): Promise<AnalysisReport> {
    const res = await fetch(`/api/v1/analysis/${reportId}/report`);
    if (!res.ok) {
      throw new Error('Failed to fetch report');
    }
    return res.json();
  },

  async getFileContent(owner: string, repo: string, path: string): Promise<{ path: string; content: string; lines: number }> {
    const res = await fetch(`/api/v1/repositories/${owner}/${repo}/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      throw new Error('File not found');
    }
    return res.json();
  },

  async listPullRequests(owner: string, repo: string): Promise<{ pullRequests: any[] }> {
    const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls`);
    return res.json();
  },

  async reviewPullRequest(owner: string, repo: string, prNumber: number): Promise<PullRequestReviewResult> {
    const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${prNumber}/review`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to review pull request');
    }
    return res.json();
  },

  // AI Code Fixer
  async previewFix(
    findingId: string,
    owner: string,
    repo: string,
    provider: AiFixProviderType,
    customSessionApiKey?: string
  ): Promise<{
    proposal: AiFixPatchProposal;
    validation: PatchValidationResult;
    minimalContextSummary: { file: string; lines: string; finding: string };
  }> {
    const res = await fetch('/api/v1/fixes/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findingId, owner, repo, provider, customSessionApiKey }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || err.manualFixReason || 'Failed to generate fix proposal');
    }
    return res.json();
  },

  async validateFix(fixId: string, owner: string, repo: string): Promise<PatchValidationResult> {
    const res = await fetch('/api/v1/fixes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixId, owner, repo }),
    });
    return res.json();
  },

  async applyFix(fixId: string): Promise<ApplyFixResult> {
    const res = await fetch('/api/v1/fixes/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to apply fix to branch');
    }
    return res.json();
  },

  async createPullRequest(fixId: string, owner: string, repo: string): Promise<CreatePullRequestResult> {
    const res = await fetch('/api/v1/fixes/create-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixId, owner, repo }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create pull request');
    }
    return res.json();
  },
};

import { Router, Request, Response } from 'express';
import { JobQueue } from './queue/jobQueue';
import { GitHubClient } from './github/githubClient';
import { PRReviewAgent } from './ai/prReviewAgent';
import { ClaudeFixProvider } from './fix/claudeProvider';
import { CodexFixProvider } from './fix/codexProvider';
import { GeminiFixProvider } from './fix/geminiProvider';
import { PatchValidator } from './fix/patchValidator';
import { GitSafety } from './fix/gitSafety';
import { AiFixPatchProposal, PatchValidationResult, MinimalCodeContext } from './types';

export function createApiRouter(): Router {
  const router = Router();

  // In-memory fix cache
  const fixProposals: Map<string, { proposal: AiFixPatchProposal; validation?: PatchValidationResult }> = new Map();

  const claudeProvider = new ClaudeFixProvider();
  const codexProvider = new CodexFixProvider();
  const geminiProvider = new GeminiFixProvider();

  // 1. Providers status (checks environment keys without leaking them)
  router.get('/v1/fixes/providers', (_req: Request, res: Response) => {
    res.json({
      providers: [
        {
          id: 'claude',
          name: 'Anthropic Claude API',
          model: 'claude-3-7-sonnet',
          configuredInEnv: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'MY_ANTHROPIC_API_KEY'),
          requiresCustomKey: !(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'MY_ANTHROPIC_API_KEY'),
        },
        {
          id: 'codex',
          name: 'OpenAI Codex API',
          model: 'gpt-4o-mini',
          configuredInEnv: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'MY_OPENAI_API_KEY'),
          requiresCustomKey: !(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'MY_OPENAI_API_KEY'),
        },
        {
          id: 'gemini',
          name: 'Google Gemini',
          model: 'gemini-3.8-flash',
          configuredInEnv: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
          requiresCustomKey: false,
        },
      ],
    });
  });

  // 2. Start repository analysis job
  router.post('/v1/analysis', async (req: Request, res: Response) => {
    const { owner, repo, repoUrl } = req.body;

    let targetOwner = owner;
    let targetRepo = repo;

    if (repoUrl && !targetOwner) {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        targetOwner = match[1];
        targetRepo = match[2].replace(/\.git$/, '');
      }
    }

    if (!targetOwner || !targetRepo) {
      res.status(400).json({ error: 'Repository owner and name or repoUrl are required' });
      return;
    }

    const job = JobQueue.createJob(targetOwner, targetRepo);
    res.json({
      jobId: job.id,
      status: job.status,
      message: 'Analysis job started',
    });
  });

  // 3. Get analysis job status
  router.get('/v1/analysis/:id/status', (req: Request, res: Response) => {
    const job = JobQueue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Analysis job not found' });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      progressPercent: job.progressPercent,
      stageMessage: job.stageMessage,
      stagesCompleted: job.stagesCompleted,
      error: job.error,
      reportReady: !!job.report,
      reportId: job.report?.id,
    });
  });

  // 4. Get analysis report
  router.get('/v1/analysis/:id/report', (req: Request, res: Response) => {
    const report = JobQueue.getReport(req.params.id);
    if (!report) {
      // Check if job exists and has report
      const job = JobQueue.getJob(req.params.id);
      if (job?.report) {
        res.json(job.report);
        return;
      }
      res.status(404).json({ error: 'Report not ready or not found' });
      return;
    }
    res.json(report);
  });

  // 5. List available repositories
  router.get('/v1/repositories', (_req: Request, res: Response) => {
    const sample = GitHubClient.listFeaturedRepositories();
    res.json({
      repositories: sample.map((r) => ({
        id: r.id,
        owner: r.owner,
        name: r.name,
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
        visibility: r.visibility,
        stars: r.stars,
        forks: r.forks,
        language: r.language,
        description: r.description,
        filesCount: r.files.length,
      })),
    });
  });

  // 6. Get file content for repository explorer
  router.get('/v1/repositories/:owner/:repo/files', async (req: Request, res: Response) => {
    const { owner, repo } = req.params;
    const filePath = req.query.path as string;

    const repoData = await GitHubClient.getRepository(owner, repo);
    const file = repoData.files.find((f) => f.path === filePath);

    if (!file) {
      res.status(404).json({ error: `File not found: ${filePath}` });
      return;
    }

    res.json({
      path: file.path,
      content: file.content,
      lines: file.content.split('\n').length,
    });
  });

  // 7. List pull requests for repository
  router.get('/v1/repositories/:owner/:repo/pulls', async (req: Request, res: Response) => {
    const { owner, repo } = req.params;
    const repoData = await GitHubClient.getRepository(owner, repo);
    res.json({ pullRequests: repoData.pullRequests });
  });

  // 8. Run PR Code Review Agent
  router.post('/v1/repositories/:owner/:repo/pulls/:prNumber/review', async (req: Request, res: Response) => {
    const { owner, repo, prNumber } = req.params;
    const prNum = parseInt(prNumber, 10);
    const repoData = await GitHubClient.getRepository(owner, repo);
    const pr = repoData.pullRequests.find((p) => p.prNumber === prNum);

    if (!pr) {
      res.status(404).json({ error: `Pull request #${prNumber} not found` });
      return;
    }

    const review = await PRReviewAgent.reviewPullRequest(
      pr.prNumber,
      pr.title,
      pr.author,
      pr.branch,
      pr.baseBranch,
      pr.changedFiles
    );

    res.json(review);
  });

  // ==========================================
  // AI CODE FIXER ENDPOINTS
  // ==========================================

  // POST /v1/fixes/preview - Generate patch with Claude / Codex / Gemini
  router.post('/v1/fixes/preview', async (req: Request, res: Response) => {
    const { findingId, owner, repo, provider, customSessionApiKey } = req.body;

    if (!findingId || !owner || !repo) {
      res.status(400).json({ error: 'findingId, owner, and repo are required' });
      return;
    }

    const repoData = await GitHubClient.getRepository(owner, repo);
    const report = JobQueue.getLatestReportForRepo(owner, repo);

    // Locate finding
    const finding = report?.security.findings.find((f) => f.id === findingId) ||
                    report?.quality.findings.find((f) => f.id === findingId);

    if (!finding) {
      res.status(404).json({ error: `Finding '${findingId}' not found in latest analysis report` });
      return;
    }

    if (!finding.isFixableWithAi) {
      res.status(400).json({
        error: 'Manual Fix Recommended',
        manualFixReason: finding.manualFixReason || 'This finding requires structural refactoring that cannot be safely automated.',
      });
      return;
    }

    // Locate target file
    const targetFile = repoData.files.find((f) => f.path === finding.file);
    if (!targetFile) {
      res.status(404).json({ error: `Target file '${finding.file}' not found` });
      return;
    }

    // Build MINIMAL context strictly per prompt specifications
    const lines = targetFile.content.split('\n');
    const startLine = Math.max(1, finding.line - 5);
    const endLine = Math.min(lines.length, (finding.endLine || finding.line) + 8);
    const codeSnippet = lines.slice(startLine - 1, endLine).join('\n');

    const relatedImports = lines.filter((l) => l.startsWith('import ') || l.startsWith('from ')).slice(0, 5);
    const relatedTests = repoData.files.filter((f) => f.path.includes('test')).map((f) => f.path);
    const relatedDeps = report?.dependencies.items.slice(0, 8).map((d) => `${d.name}@${d.version}`) || [];

    const minimalContext: MinimalCodeContext = {
      findingId: finding.id,
      file: finding.file,
      startLine,
      endLine,
      findingTitle: finding.title,
      findingSeverity: finding.severity,
      findingEvidence: finding.evidence,
      codeSnippet,
      relatedImports,
      relatedTests,
      relatedDependencies: relatedDeps,
    };

    let proposal: AiFixPatchProposal;
    if (provider === 'claude') {
      proposal = await claudeProvider.generatePatch(minimalContext, customSessionApiKey);
    } else if (provider === 'codex') {
      proposal = await codexProvider.generatePatch(minimalContext, customSessionApiKey);
    } else {
      proposal = await geminiProvider.generatePatch(minimalContext);
    }

    // Pre-validate patch
    const validation = PatchValidator.validatePatch(proposal, repoData.files, finding.id);

    fixProposals.set(proposal.fixId, { proposal, validation });

    res.json({
      proposal,
      validation,
      minimalContextSummary: {
        file: minimalContext.file,
        lines: `${minimalContext.startLine}-${minimalContext.endLine}`,
        finding: minimalContext.findingTitle,
      },
    });
  });

  // POST /v1/fixes/validate - Validate patch
  router.post('/v1/fixes/validate', async (req: Request, res: Response) => {
    const { fixId, owner, repo } = req.body;
    const cached = fixProposals.get(fixId);
    if (!cached) {
      res.status(404).json({ error: 'Fix session not found' });
      return;
    }

    const repoData = await GitHubClient.getRepository(owner, repo);
    const validation = PatchValidator.validatePatch(cached.proposal, repoData.files, cached.proposal.findingId);
    cached.validation = validation;

    res.json(validation);
  });

  // POST /v1/fixes/apply - Apply fix to dedicated safety branch
  router.post('/v1/fixes/apply', async (req: Request, res: Response) => {
    const { fixId } = req.body;
    const cached = fixProposals.get(fixId);

    if (!cached || !cached.validation) {
      res.status(404).json({ error: 'Fix session or validation result not found' });
      return;
    }

    try {
      const applyResult = GitSafety.applyToBranch(cached.proposal, cached.validation);
      res.json(applyResult);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /v1/fixes/create-pr - Create Pull Request with validation report
  router.post('/v1/fixes/create-pr', async (req: Request, res: Response) => {
    const { fixId, owner, repo } = req.body;
    const cached = fixProposals.get(fixId);

    if (!cached || !cached.validation) {
      res.status(404).json({ error: 'Fix session not found' });
      return;
    }

    const report = JobQueue.getLatestReportForRepo(owner, repo);
    const finding = report?.security.findings.find((f) => f.id === cached.proposal.findingId) ||
                    report?.quality.findings.find((f) => f.id === cached.proposal.findingId) ||
                    {
                      id: cached.proposal.findingId,
                      title: 'Remediated Vulnerability',
                      severity: 'high' as const,
                      file: cached.proposal.targetFile,
                      line: 1,
                      category: 'security' as const,
                      confidence: 'HIGH' as const,
                      message: 'Automated remediation',
                      evidence: cached.proposal.explanation.whyOriginalCodeWasProblematic,
                      recommendation: cached.proposal.explanation.whyThisChangeWasMade,
                      isFixableWithAi: true,
                    };

    const prResult = GitSafety.generatePullRequest(
      cached.proposal,
      cached.validation,
      finding,
      `${owner}/${repo}`,
      report?.repository.defaultBranch || 'main'
    );

    res.json(prResult);
  });

  // GET /v1/fixes/:id - Fetch fix state
  router.get('/v1/fixes/:id', (req: Request, res: Response) => {
    const cached = fixProposals.get(req.params.id);
    if (!cached) {
      res.status(404).json({ error: 'Fix proposal not found' });
      return;
    }
    res.json(cached);
  });

  return router;
}

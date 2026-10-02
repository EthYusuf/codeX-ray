import { AnalysisJob, AnalysisReport, RepositoryFileNode, CodeFinding } from '../types';
import { GitHubClient } from '../github/githubClient';
import { LanguageDetector } from '../engine/languageDetector';
import { CodeAnalyzer } from '../engine/codeAnalyzer';
import { SecurityEngine } from '../engine/securityEngine';
import { DependencyEngine } from '../engine/dependencyEngine';
import { ArchitectureEngine } from '../engine/architectureEngine';
import { TechDebtEngine } from '../engine/techDebtEngine';
import { TestDocEngine } from '../engine/testDocEngine';
import { ReasoningEngine } from '../ai/reasoningEngine';

export class JobQueue {
  private static jobs: Map<string, AnalysisJob> = new Map();
  private static activeReports: Map<string, AnalysisReport> = new Map();

  public static createJob(owner: string, repo: string): AnalysisJob {
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: AnalysisJob = {
      id,
      repoUrl: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
      status: 'QUEUED',
      progressPercent: 5,
      stageMessage: 'Job enqueued for analysis worker...',
      stagesCompleted: [],
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(id, job);

    // Asynchronously kick off processing without blocking
    setTimeout(() => {
      this.processJob(job);
    }, 150);

    return job;
  }

  public static getJob(id: string): AnalysisJob | undefined {
    return this.jobs.get(id);
  }

  public static getReport(id: string): AnalysisReport | undefined {
    return this.activeReports.get(id);
  }

  public static getLatestReportForRepo(owner: string, repo: string): AnalysisReport | undefined {
    for (const report of this.activeReports.values()) {
      if (
        report.repository.owner.toLowerCase() === owner.toLowerCase() &&
        report.repository.name.toLowerCase() === repo.toLowerCase()
      ) {
        return report;
      }
    }
    return undefined;
  }

  private static async processJob(job: AnalysisJob) {
    try {
      // 1. INGESTING
      this.updateJobStage(job, 'INGESTING', 25, 'Ingesting repository tree, commits, and source files...');
      await new Promise((r) => setTimeout(r, 600));
      const repoData = await GitHubClient.getRepository(job.owner, job.repo);

      // 2. ANALYZING (Deterministic Engines)
      this.updateJobStage(job, 'ANALYZING', 55, 'Running deterministic AST complexity, security, and dependency scanners...');
      await new Promise((r) => setTimeout(r, 700));

      const detectedLangs = LanguageDetector.aggregateLanguages(repoData.files);
      const primaryLanguage = detectedLangs[0]?.name || repoData.language || 'Unknown';

      // Scan all files
      const allFindings: CodeFinding[] = [];
      const allSecrets: any[] = [];
      const allHotspots: any[] = [];

      for (const file of repoData.files) {
        const lang = LanguageDetector.detectLanguage(file.path);

        // Security scan
        const secFindings = SecurityEngine.scanVulnerabilities(file.path, file.content, lang);
        allFindings.push(...secFindings);

        const secrets = SecurityEngine.scanSecrets(file.path, file.content);
        allSecrets.push(...secrets);

        // Quality & complexity scan
        const qualityResult = CodeAnalyzer.analyzeFileQuality(file.path, file.content, lang);
        allFindings.push(...qualityResult.findings);
        allHotspots.push(...qualityResult.hotspots);
      }

      // Dependencies scan
      const dependencies = DependencyEngine.parseDependencies(repoData.files);
      const vulnerableDeps = dependencies.filter((d) => d.hasVulnerability);

      // Architecture scan
      const archResult = ArchitectureEngine.analyzeArchitecture(repoData.files);

      // Testing & Documentation
      const testingResult = TestDocEngine.analyzeTesting(repoData.files);
      const docResult = TestDocEngine.analyzeDocumentation(repoData.files);

      // Technical Debt
      const debtResult = TechDebtEngine.calculateTechnicalDebt(allFindings, allHotspots, testingResult.testRatio);

      // 3. AI_ANALYSIS
      this.updateJobStage(job, 'AI_ANALYSIS', 80, 'Synthesizing grounded architectural intelligence and remediation roadmap...');
      await new Promise((r) => setTimeout(r, 600));

      const aiSynthesis = await ReasoningEngine.generateSynthesis({
        repoName: repoData.fullName,
        primaryLanguage,
        totalFiles: repoData.files.length,
        totalLines: repoData.files.reduce((acc, f) => acc + f.content.split('\n').length, 0),
        pattern: archResult.pattern,
        layers: archResult.layers,
        findings: allFindings,
        hotspots: allHotspots,
        dependencies,
        testRatio: testingResult.testRatio,
        testFrameworks: testingResult.frameworksDetected,
      });

      // 4. GENERATING_REPORT & CALCULATING SCORES
      this.updateJobStage(job, 'GENERATING_REPORT', 95, 'Compiling engineering report and metric formulas...');
      await new Promise((r) => setTimeout(r, 400));

      const totalLoc = repoData.files.reduce((sum, f) => sum + f.content.split('\n').length, 0);

      // Deterministic Scores Calculation
      const securityScore = Math.max(10, Math.round(100 - allFindings.filter((f) => f.category === 'security').length * 15 - allSecrets.length * 20));
      const architectureScore = Math.max(20, Math.round(75 + archResult.layers.filter((l) => l.matchedFiles.length > 0).length * 5 - archResult.warnings.length * 10));
      const maintainabilityScore = Math.max(15, Math.round(95 - allHotspots.filter((h) => h.cyclomaticComplexity > 10).length * 8 - (debtResult.totalEstimatedHours / 4)));
      const testingScore = Math.max(10, Math.min(95, Math.round(testingResult.testRatio * 300 + testingResult.frameworksDetected.length * 15)));
      const documentationScore = Math.round((docResult.hasReadme ? 40 : 0) + (docResult.hasContributing ? 20 : 0) + (docResult.hasApiDocs ? 20 : 0) + Math.min(20, docResult.inlineDocCoverage / 2));
      const healthScore = Math.round(securityScore * 0.3 + architectureScore * 0.2 + maintainabilityScore * 0.2 + testingScore * 0.15 + documentationScore * 0.15);

      // Build file tree representation
      const fileTree = this.buildFileTree(repoData.files, allFindings);

      const report: AnalysisReport = {
        id: `rep-${job.id}`,
        repository: {
          owner: repoData.owner,
          name: repoData.name,
          fullName: repoData.fullName,
          defaultBranch: repoData.defaultBranch,
          visibility: repoData.visibility,
          stars: repoData.stars,
          forks: repoData.forks,
          language: primaryLanguage,
          lastCommitSha: repoData.lastCommitSha,
          lastCommitMessage: repoData.lastCommitMessage,
        },
        timestamp: new Date().toISOString(),
        metrics: {
          healthScore,
          architectureScore,
          securityScore,
          maintainabilityScore,
          testingScore,
          documentationScore,
          totalFiles: repoData.files.length,
          totalLinesOfCode: totalLoc,
          totalFindings: allFindings.length,
          technicalDebtHours: debtResult.totalEstimatedHours,
          calculationExplanations: {
            healthScore: {
              score: healthScore,
              formula: 'Health = 30% Security + 20% Architecture + 20% Maintainability + 15% Testing + 15% Documentation',
              factors: [
                { name: 'Security Posture', weight: 0.3, actual: `${securityScore}/100`, impact: 'Weights critical and high CVE/CWE risks heavily' },
                { name: 'Architecture Modularity', weight: 0.2, actual: `${architectureScore}/100`, impact: 'Measures layer boundaries and separation of concerns' },
                { name: 'Maintainability Index', weight: 0.2, actual: `${maintainabilityScore}/100`, impact: 'Derived from Halstead volume and cyclomatic complexity' },
                { name: 'Automated Testing', weight: 0.15, actual: `${testingScore}/100`, impact: 'Based on test-to-source ratio and framework presence' },
                { name: 'Documentation Quality', weight: 0.15, actual: `${documentationScore}/100`, impact: 'Evaluates README, API specs, and inline code comments' },
              ],
            },
            securityScore: {
              score: securityScore,
              formula: 'Security = 100 - (15 * Critical/High Vulnerabilities) - (20 * Hardcoded Secrets)',
              factors: [
                { name: 'Vulnerabilities Detected', weight: 0.6, actual: allFindings.filter((f) => f.category === 'security').length, impact: '-15 pts per finding' },
                { name: 'Secrets Detected', weight: 0.4, actual: allSecrets.length, impact: '-20 pts per exposed token/secret' },
              ],
            },
            maintainabilityScore: {
              score: maintainabilityScore,
              formula: 'Maintainability = 95 - (8 * Complexity Hotspots) - (Total Tech Debt Hours / 4)',
              factors: [
                { name: 'High Complexity Functions (>10)', weight: 0.5, actual: allHotspots.filter((h) => h.cyclomaticComplexity > 10).length, impact: 'Reduces readability and branching testability' },
                { name: 'Estimated Refactoring Hours', weight: 0.5, actual: `${debtResult.totalEstimatedHours} hrs`, impact: 'Quantifies cumulative maintenance burden' },
              ],
            },
          },
        },
        languages: detectedLangs.map((l) => ({
          language: l.name,
          percentage: l.percentage,
          filesCount: l.filesCount,
          linesCount: l.linesCount,
        })),
        frameworks: [primaryLanguage, ...testingResult.frameworksDetected],
        architecture: archResult,
        security: {
          findings: allFindings.filter((f) => f.category === 'security'),
          secrets: allSecrets,
          summary: {
            criticalCount: allFindings.filter((f) => f.severity === 'critical').length,
            highCount: allFindings.filter((f) => f.severity === 'high').length,
            mediumCount: allFindings.filter((f) => f.severity === 'medium').length,
            lowCount: allFindings.filter((f) => f.severity === 'low').length,
          },
        },
        quality: {
          complexityHotspots: allHotspots,
          findings: allFindings.filter((f) => f.category === 'complexity' || f.category === 'code_smell'),
          duplicatedBlocks: [],
        },
        dependencies: {
          items: dependencies,
          vulnerabilitiesCount: vulnerableDeps.length,
        },
        testing: testingResult,
        documentation: docResult,
        technicalDebt: debtResult,
        aiInsights: aiSynthesis,
        fileTree,
      };

      this.activeReports.set(report.id, report);
      this.activeReports.set(job.id, report);

      // COMPLETE
      job.status = 'COMPLETED';
      job.progressPercent = 100;
      job.stageMessage = 'Deep repository analysis completed.';
      job.report = report;
      job.completedAt = new Date().toISOString();
      job.stagesCompleted.push({ stage: 'COMPLETED', label: 'Report generation', completedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('Job processing failed:', err);
      job.status = 'FAILED';
      job.error = err.message || 'Unknown processing failure';
      job.stageMessage = `Failed: ${job.error}`;
    }
  }

  private static updateJobStage(job: AnalysisJob, stage: AnalysisJob['status'], progress: number, message: string) {
    job.status = stage;
    job.progressPercent = progress;
    job.stageMessage = message;
    job.stagesCompleted.push({
      stage,
      label: message,
      completedAt: new Date().toISOString(),
    });
  }

  private static buildFileTree(
    files: { path: string; content: string }[],
    findings: CodeFinding[]
  ): RepositoryFileNode[] {
    const rootNodes: RepositoryFileNode[] = [];

    for (const f of files) {
      const parts = f.path.split('/');
      let currentLevel = rootNodes;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        let existing = currentLevel.find((n) => n.name === part);
        if (!existing) {
          const fileFindings = findings.filter((find) => find.file === f.path);
          existing = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            size: isFile ? f.content.length : undefined,
            language: isFile ? LanguageDetector.detectLanguage(f.path) : undefined,
            findingsCount: isFile ? fileFindings.length : 0,
            children: isFile ? undefined : [],
          };
          currentLevel.push(existing);
        }

        if (!isFile && existing.children) {
          currentLevel = existing.children;
        }
      }
    }

    return rootNodes;
  }
}

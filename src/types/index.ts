export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type FindingCategory =
  | 'security'
  | 'secret'
  | 'complexity'
  | 'duplication'
  | 'architecture'
  | 'performance'
  | 'test'
  | 'documentation'
  | 'code_smell';

export interface CodeFinding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  confidence: Confidence;
  title: string;
  message: string;
  file: string;
  line: number;
  endLine?: number;
  evidence: string;
  recommendation: string;
  isFixableWithAi: boolean;
  manualFixReason?: string;
  cwe?: string;
}

export interface SecretFinding {
  id: string;
  type: string;
  file: string;
  line: number;
  maskedSecret: string;
  entropy: number;
  confidence: Confidence;
  evidence: string;
}

export interface DependencyItem {
  name: string;
  version: string;
  manager: string;
  type: 'direct' | 'dev' | 'transitive';
  hasVulnerability?: boolean;
  vulnerabilityDetails?: {
    cve: string;
    severity: Severity;
    summary: string;
    fixedIn?: string;
  };
}

export interface ArchitectureLayer {
  id: string;
  name: string;
  description: string;
  filePatterns: string[];
  matchedFiles: string[];
  cohesionScore: number;
  dependencies: string[];
}

export interface ComplexityMetric {
  file: string;
  functionName?: string;
  line: number;
  cyclomaticComplexity: number;
  linesOfCode: number;
  nestedDepth: number;
  rating: 'low' | 'moderate' | 'high' | 'very_high';
}

export interface TechnicalDebtItem {
  id: string;
  title: string;
  category: 'architecture' | 'complexity' | 'test' | 'documentation' | 'outdated_patterns';
  estimatedHours: number;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  file: string;
  recommendation: string;
}

export interface RepositoryFileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  language?: string;
  complexity?: number;
  findingsCount?: number;
  children?: RepositoryFileNode[];
}

export interface PullRequestDiffFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PullRequestReviewComment {
  id: string;
  file: string;
  line: number;
  category: 'BUG' | 'SECURITY' | 'PERFORMANCE' | 'ARCHITECTURE' | 'STYLE' | 'TESTING' | 'DOCUMENTATION';
  severity: Severity;
  title: string;
  evidence: string;
  comment: string;
  suggestedAction: string;
}

export interface PullRequestReviewResult {
  prNumber: number;
  title: string;
  author: string;
  branch: string;
  baseBranch: string;
  changedFilesCount: number;
  additions: number;
  deletions: number;
  comments: PullRequestReviewComment[];
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  regressionRisks: string[];
  summary: string;
}

export interface AnalysisReport {
  id: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    visibility: 'public' | 'private';
    stars: number;
    forks: number;
    language: string;
    lastCommitSha: string;
    lastCommitMessage: string;
  };
  timestamp: string;
  metrics: {
    healthScore: number;
    architectureScore: number;
    securityScore: number;
    maintainabilityScore: number;
    testingScore: number;
    documentationScore: number;
    totalFiles: number;
    totalLinesOfCode: number;
    totalFindings: number;
    technicalDebtHours: number;
    calculationExplanations: Record<string, {
      score: number;
      formula: string;
      factors: { name: string; weight: number; actual: string | number; impact: string }[];
    }>;
  };
  languages: { language: string; percentage: number; filesCount: number; linesCount: number }[];
  frameworks: string[];
  architecture: {
    pattern: string;
    layers: ArchitectureLayer[];
    graphNodes: { id: string; label: string; type: 'layer' | 'module' | 'service'; fileCount: number }[];
    graphEdges: { source: string; target: string; relationship: string }[];
    warnings: string[];
  };
  security: {
    findings: CodeFinding[];
    secrets: SecretFinding[];
    summary: {
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      lowCount: number;
    };
  };
  quality: {
    complexityHotspots: ComplexityMetric[];
    findings: CodeFinding[];
    duplicatedBlocks: { count: number; files: string[]; linesEstimated: number }[];
  };
  dependencies: {
    items: DependencyItem[];
    vulnerabilitiesCount: number;
  };
  testing: {
    frameworksDetected: string[];
    testFilesCount: number;
    testRatio: number;
    coverageStatus: string;
    qualitativeNotes: string[];
  };
  documentation: {
    hasReadme: boolean;
    hasContributing: boolean;
    hasApiDocs: boolean;
    inlineDocCoverage: number;
    recommendations: string[];
  };
  technicalDebt: {
    totalEstimatedHours: number;
    items: TechnicalDebtItem[];
  };
  aiInsights: {
    executiveSummary: string;
    architectureSummary: string;
    securitySummary: string;
    roadmap: {
      week1: string[];
      week2: string[];
      week3: string[];
    };
    antiHallucinationCheck: {
      groundedInDeterministicEvidence: boolean;
      referencedFilesCount: number;
      insufficientEvidenceFields: string[];
    };
  };
  fileTree: RepositoryFileNode[];
}

export type JobStage =
  | 'QUEUED'
  | 'INGESTING'
  | 'ANALYZING'
  | 'AI_ANALYSIS'
  | 'GENERATING_REPORT'
  | 'COMPLETED'
  | 'FAILED';

export interface AnalysisJob {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  status: JobStage;
  progressPercent: number;
  stageMessage: string;
  stagesCompleted: { stage: JobStage; label: string; completedAt: string }[];
  error?: string;
  report?: AnalysisReport;
  createdAt: string;
  completedAt?: string;
}

export type AiFixProviderType = 'claude' | 'codex' | 'gemini';

export interface AiFixPatchProposal {
  fixId: string;
  findingId: string;
  provider: AiFixProviderType;
  targetFile: string;
  unifiedDiff: string;
  originalCode: string;
  proposedCode: string;
  explanation: {
    whyThisChangeWasMade: string;
    whatChanged: string;
    whyOriginalCodeWasProblematic: string;
    potentialSideEffects: string;
    testsPerformed: string;
    remainingConcerns: string;
    uncertaintyStatement?: string;
  };
  minimalChangeAssurance: boolean;
}

export interface PatchValidationResult {
  fixId: string;
  isValid: boolean;
  checks: {
    targetFileExists: boolean;
    originalCodeMatches: boolean;
    appliesCleanly: boolean;
    onlyModifiesIntendedFiles: boolean;
    unexpectedModificationsRejected: boolean;
    staticAnalysisPassed: boolean;
    securityCheckPassed: boolean;
    testsPassed: boolean;
  };
  failureReasons: string[];
  beforeFindingsCount: number;
  afterFindingsCount: number;
  resolvedFindings: string[];
  introducedFindings: string[];
}

export interface ApplyFixResult {
  fixId: string;
  branchName: string;
  baseBranch: string;
  appliedSuccessfully: boolean;
  commitSha: string;
  message: string;
}

export interface CreatePullRequestResult {
  prNumber: number;
  prUrl: string;
  title: string;
  body: string;
  branch: string;
  baseBranch: string;
  state: 'open';
}

export interface RepositorySummary {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  visibility: 'public' | 'private';
  stars: number;
  forks: number;
  language: string;
  description: string;
  filesCount: number;
}

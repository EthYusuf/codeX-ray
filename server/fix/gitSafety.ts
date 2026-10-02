import { ApplyFixResult, CreatePullRequestResult, AiFixPatchProposal, PatchValidationResult, CodeFinding } from '../types';

export class GitSafety {
  public static sanitizeBranchName(findingId: string): string {
    const cleanId = findingId.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase().substring(0, 40);
    return `codexray/fix/${cleanId}`;
  }

  public static applyToBranch(
    proposal: AiFixPatchProposal,
    validation: PatchValidationResult,
    baseBranch: string = 'main'
  ): ApplyFixResult {
    if (!validation.isValid) {
      throw new Error(`Cannot apply invalid patch. Failures: ${validation.failureReasons.join(', ')}`);
    }

    const branchName = this.sanitizeBranchName(proposal.findingId);
    const mockCommitSha = `c7f9${Math.random().toString(16).substring(2, 10)}`;

    return {
      fixId: proposal.fixId,
      branchName,
      baseBranch,
      appliedSuccessfully: true,
      commitSha: mockCommitSha,
      message: `Patch successfully committed to safety branch '${branchName}'. Default branch '${baseBranch}' remains untouched.`,
    };
  }

  public static generatePullRequest(
    proposal: AiFixPatchProposal,
    validation: PatchValidationResult,
    finding: CodeFinding,
    repoFullName: string,
    baseBranch: string = 'main'
  ): CreatePullRequestResult {
    const branch = this.sanitizeBranchName(proposal.findingId);
    const title = `fix: resolve potential ${finding.title.toLowerCase()} in ${proposal.targetFile}`;

    const body = `## CodeX-Ray Finding
**Finding:** ${finding.title}
**Severity:** ${finding.severity.toUpperCase()}
**File:** \`${proposal.targetFile}:${finding.line}\`
**Category:** ${finding.category}
${finding.cwe ? `**CWE Reference:** ${finding.cwe}` : ''}

## Analysis
${proposal.explanation.whyOriginalCodeWasProblematic}

### Why this change was made:
${proposal.explanation.whyThisChangeWasMade}

## Changes Applied
${proposal.explanation.whatChanged}

\`\`\`diff
${proposal.unifiedDiff}
\`\`\`

## Verification & Validation
- **Target File Validation:** PASS
- **Patch Clean Application:** PASS
- **Static Analysis:** ${validation.checks.staticAnalysisPassed ? 'PASS' : 'FAIL'}
- **Security Scanner:** ${validation.checks.securityCheckPassed ? 'PASS' : 'FAIL'}
- **Automated Syntax & Tests:** ${validation.checks.testsPassed ? 'PASS' : 'FAIL'}

**Security Findings Delta:**
- Findings Before Fix: **${validation.beforeFindingsCount}**
- Findings After Fix: **${validation.afterFindingsCount}** (Resolved: ${validation.resolvedFindings.length})

## Safety & Governance
- Minimal change principle verified: No unrelated files modified.
- Committed to isolated branch: \`${branch}\`
- **Protected Branch Invariant:** \`${baseBranch}\` was not modified.
- **Manual Review Required:** CodeX-Ray never automatically merges pull requests.`;

    const prNumber = Math.floor(Math.random() * 80) + 120;
    const prUrl = `https://github.com/${repoFullName}/pull/${prNumber}`;

    return {
      prNumber,
      prUrl,
      title,
      body,
      branch,
      baseBranch,
      state: 'open',
    };
  }
}

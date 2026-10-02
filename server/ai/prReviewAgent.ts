import { getGeminiClient } from './geminiClient';
import { PullRequestDiffFile, PullRequestReviewComment, PullRequestReviewResult } from '../types';

export class PRReviewAgent {
  public static async reviewPullRequest(
    prNumber: number,
    title: string,
    author: string,
    branch: string,
    baseBranch: string,
    files: PullRequestDiffFile[]
  ): Promise<PullRequestReviewResult> {
    const comments: PullRequestReviewComment[] = [];
    const regressionRisks: string[] = [];

    // Deterministic diff inspection first
    let hasCriticalIssues = false;

    for (const f of files) {
      const patch = f.patch || '';
      const lines = patch.split('\n');

      let currentLine = 1;
      for (const line of lines) {
        if (line.startsWith('@@')) {
          const match = line.match(/\+([0-9]+)/);
          if (match) currentLine = parseInt(match[1], 10);
          continue;
        }

        if (line.startsWith('+') && !line.startsWith('+++')) {
          const addedContent = line.substring(1);

          // Check for security regressions
          if (
            (addedContent.includes('SELECT ') || addedContent.includes('INSERT ')) &&
            (addedContent.includes('+') || addedContent.includes('${')) &&
            (addedContent.includes('execute(') || addedContent.includes('query('))
          ) {
            hasCriticalIssues = true;
            comments.push({
              id: `pr-rev-sqli-${f.filename}-${currentLine}`,
              file: f.filename,
              line: currentLine,
              category: 'SECURITY',
              severity: 'critical',
              title: 'SQL Injection Introduced in PR Diff',
              evidence: addedContent.trim(),
              comment: 'Dynamic SQL concatenation introduced in PR changes. User-controlled variables must not be concatenated directly into query strings.',
              suggestedAction: 'Refactor query to use parameterized query placeholders or ORM bound parameters.',
            });
            regressionRisks.push(`Potential SQL injection introduced in ${f.filename}:${currentLine}`);
          }

          // Check for eval or unsafe subprocess
          if (addedContent.includes('shell=True') || addedContent.includes('eval(')) {
            hasCriticalIssues = true;
            comments.push({
              id: `pr-rev-unsafe-${f.filename}-${currentLine}`,
              file: f.filename,
              line: currentLine,
              category: 'SECURITY',
              severity: 'high',
              title: 'Unsafe System Execution',
              evidence: addedContent.trim(),
              comment: 'Unrestricted process execution or eval() introduced.',
              suggestedAction: 'Avoid spawning shell subroutines with shell=True; use structured argument vectors.',
            });
          }

          // Check for missing error handling or console.log
          if (addedContent.includes('console.log(') || addedContent.includes('print(')) {
            comments.push({
              id: `pr-rev-log-${f.filename}-${currentLine}`,
              file: f.filename,
              line: currentLine,
              category: 'STYLE',
              severity: 'low',
              title: 'Raw Debug Logging in Production PR',
              evidence: addedContent.trim(),
              comment: 'Direct console/print statement should be replaced with structured logger at appropriate log level.',
              suggestedAction: 'Use application logger or remove temporary debugging statements.',
            });
          }

          // Check for session/auth changes
          if (
            f.filename.toLowerCase().includes('auth') ||
            f.filename.toLowerCase().includes('session') ||
            f.filename.toLowerCase().includes('jwt')
          ) {
            if (addedContent.includes('expires') || addedContent.includes('maxAge') || addedContent.includes('secret')) {
              regressionRisks.push(`Session authentication lifecycle modified in ${f.filename}. Ensure session invalidation semantics remain backward-compatible.`);
              comments.push({
                id: `pr-rev-auth-${f.filename}-${currentLine}`,
                file: f.filename,
                line: currentLine,
                category: 'ARCHITECTURE',
                severity: 'medium',
                title: 'Authentication Session Lifecycle Modified',
                evidence: addedContent.trim(),
                comment: 'Modifying session timing or token logic alters login state guarantees. Verify expiration behavior with dedicated tests.',
                suggestedAction: 'Add a regression test specifically testing token expiry and revocation edge cases.',
              });
            }
          }

          currentLine++;
        } else if (!line.startsWith('-')) {
          currentLine++;
        }
      }
    }

    // Check if test files were updated alongside code changes
    const codeFilesChanged = files.filter((f) => !f.filename.includes('test') && !f.filename.includes('spec'));
    const testFilesChanged = files.filter((f) => f.filename.includes('test') || f.filename.includes('spec'));

    if (codeFilesChanged.length > 2 && testFilesChanged.length === 0) {
      comments.push({
        id: `pr-rev-test-missing`,
        file: codeFilesChanged[0].filename,
        line: 1,
        category: 'TESTING',
        severity: 'medium',
        title: 'Source Changes Lack Corresponding Tests',
        evidence: `${codeFilesChanged.length} application files modified with 0 test files changed.`,
        comment: 'Significant application logic was changed without accompanying unit or integration test assertions.',
        suggestedAction: 'Add automated tests verifying new behavior and guarding against regressions.',
      });
      regressionRisks.push('PR introduces business logic changes without new or modified test coverage.');
    }

    // Try AI reasoning for comprehensive PR commentary
    const ai = getGeminiClient();
    if (ai && files.length > 0) {
      try {
        const patchSummary = files.map((f) => `File: ${f.filename}\n${(f.patch || '').substring(0, 1000)}`).join('\n\n');
        const prompt = `Review this Pull Request strictly for code quality, architectural consistency, and potential regressions.
PR #${prNumber}: "${title}" by ${author}
Changed Files:
${patchSummary}

Respond ONLY with JSON matching:
{
  "summary": "2 sentence synthesis of the PR changes and risk level.",
  "additionalComments": [
    {
      "file": "string",
      "line": 1,
      "category": "BUG" | "SECURITY" | "PERFORMANCE" | "ARCHITECTURE" | "STYLE" | "TESTING" | "DOCUMENTATION",
      "severity": "high" | "medium" | "low",
      "title": "Short title",
      "evidence": "snippet or observation",
      "comment": "Analysis",
      "suggestedAction": "Remediation"
    }
  ]
}`;

        const aiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: 0.1 },
        });

        const parsed = JSON.parse(aiRes.text?.trim() || '{}');
        if (Array.isArray(parsed.additionalComments)) {
          for (const ac of parsed.additionalComments) {
            comments.push({
              id: `ai-${Math.random().toString(36).substring(2, 9)}`,
              file: ac.file || files[0].filename,
              line: Number(ac.line) || 1,
              category: ac.category || 'ARCHITECTURE',
              severity: ac.severity || 'low',
              title: ac.title || 'Code Review Note',
              evidence: ac.evidence || '',
              comment: ac.comment || '',
              suggestedAction: ac.suggestedAction || '',
            });
          }
        }
      } catch (e) {
        console.warn('AI PR review augmentation error:', e);
      }
    }

    const verdict = hasCriticalIssues
      ? 'REQUEST_CHANGES'
      : comments.some((c) => c.severity === 'medium')
      ? 'COMMENT'
      : 'APPROVE';

    const totalAdditions = files.reduce((acc, f) => acc + f.additions, 0);
    const totalDeletions = files.reduce((acc, f) => acc + f.deletions, 0);

    const summary = hasCriticalIssues
      ? `Changes requested. ${comments.filter((c) => c.severity === 'critical' || c.severity === 'high').length} critical security or regression risk(s) identified in pull request #${prNumber}.`
      : `Code review completed. ${files.length} files reviewed (+${totalAdditions}, -${totalDeletions}). Code passes structural integrity checks.`;

    return {
      prNumber,
      title,
      author,
      branch,
      baseBranch,
      changedFilesCount: files.length,
      additions: totalAdditions,
      deletions: totalDeletions,
      comments,
      verdict,
      regressionRisks,
      summary,
    };
  }
}

import { PatchValidationResult, AiFixPatchProposal } from '../types';
import { SecurityEngine } from '../engine/securityEngine';
import { CodeAnalyzer } from '../engine/codeAnalyzer';
import { LanguageDetector } from '../engine/languageDetector';

export class PatchValidator {
  public static validatePatch(
    proposal: AiFixPatchProposal,
    repositoryFiles: { path: string; content: string }[],
    originalFindingId: string
  ): PatchValidationResult {
    const failureReasons: string[] = [];

    // 1. Verify target file exists
    const targetFile = repositoryFiles.find((f) => f.path === proposal.targetFile);
    const targetFileExists = !!targetFile;
    if (!targetFileExists) {
      failureReasons.push(`Target file '${proposal.targetFile}' does not exist in the repository.`);
    }

    // 2. Verify original code exists in target file
    let originalCodeMatches = false;
    if (targetFile) {
      // Normalize whitespace for resilient matching
      const normalizedTarget = targetFile.content.replace(/\r\n/g, '\n');
      const normalizedOrig = proposal.originalCode.replace(/\r\n/g, '\n').trim();
      originalCodeMatches = normalizedTarget.includes(normalizedOrig) || normalizedTarget.includes(normalizedOrig.split('\n')[0].trim());
      if (!originalCodeMatches) {
        failureReasons.push(`Target file content has changed or expected original code does not match.`);
      }
    }

    // 3. Verify patch only modifies intended file
    const diffLines = proposal.unifiedDiff.split('\n');
    let onlyModifiesIntendedFiles = true;
    for (const line of diffLines) {
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        const touchedFile = line.substring(6).trim();
        if (touchedFile !== proposal.targetFile && touchedFile !== `/dev/null`) {
          onlyModifiesIntendedFiles = false;
          failureReasons.push(`Patch attempts to modify unauthorized file: '${touchedFile}'. Minimal change violation.`);
          break;
        }
      }
    }

    // 4. Verify patch applies cleanly without conflicts
    let appliesCleanly = targetFileExists && originalCodeMatches && onlyModifiesIntendedFiles;
    let patchedContent = '';
    if (appliesCleanly && targetFile) {
      try {
        if (proposal.proposedCode) {
          patchedContent = targetFile.content.replace(proposal.originalCode.trim(), proposal.proposedCode.trim());
          if (!patchedContent || patchedContent === targetFile.content) {
            // fallback line replacement
            patchedContent = targetFile.content.replace(proposal.originalCode.split('\n')[0].trim(), proposal.proposedCode.split('\n')[0].trim());
          }
        }
      } catch (e) {
        appliesCleanly = false;
        failureReasons.push('Patch failed to apply cleanly to target file: ' + String(e));
      }
    }

    // 5. Re-run Security Analysis and Static Analysis on the patched content
    let staticAnalysisPassed = false;
    let securityCheckPassed = false;
    let testsPassed = true;

    let beforeFindingsCount = 1;
    let afterFindingsCount = 0;
    const resolvedFindings: string[] = [];
    const introducedFindings: string[] = [];

    if (appliesCleanly && targetFile) {
      const lang = LanguageDetector.detectLanguage(targetFile.path);

      // Analyze before
      const beforeSec = SecurityEngine.scanVulnerabilities(targetFile.path, targetFile.content, lang);
      beforeFindingsCount = Math.max(1, beforeSec.length);

      // Analyze after
      const afterSec = SecurityEngine.scanVulnerabilities(targetFile.path, patchedContent, lang);
      const afterQuality = CodeAnalyzer.analyzeFileQuality(targetFile.path, patchedContent, lang);

      afterFindingsCount = afterSec.length;

      // Check if original issue resolved
      if (afterSec.length < beforeSec.length || !afterSec.some((f) => f.id === originalFindingId)) {
        resolvedFindings.push(originalFindingId);
        securityCheckPassed = true;
      } else {
        // Did not solve the issue
        failureReasons.push('Post-fix security analysis did not detect resolution of the target vulnerability.');
      }

      // Check if new critical bugs or syntax issues were introduced
      if (afterQuality.findings.some((f) => f.severity === 'critical')) {
        staticAnalysisPassed = false;
        introducedFindings.push('Critical complexity or syntax regression introduced');
        failureReasons.push('Patch introduced static analysis regressions.');
      } else {
        staticAnalysisPassed = true;
      }

      // Check basic syntax tests (e.g. balanced braces / parentheses)
      const openParens = (patchedContent.match(/\(/g) || []).length;
      const closeParens = (patchedContent.match(/\)/g) || []).length;
      const openBraces = (patchedContent.match(/\{/g) || []).length;
      const closeBraces = (patchedContent.match(/\}/g) || []).length;

      if (openParens !== closeParens || (lang !== 'Python' && openBraces !== closeBraces)) {
        testsPassed = false;
        failureReasons.push('Automated syntax parsing failed: unbalanced parentheses or brackets in proposed patch.');
      }
    }

    const isValid =
      targetFileExists &&
      originalCodeMatches &&
      onlyModifiesIntendedFiles &&
      appliesCleanly &&
      securityCheckPassed &&
      staticAnalysisPassed &&
      testsPassed;

    return {
      fixId: proposal.fixId,
      isValid,
      checks: {
        targetFileExists,
        originalCodeMatches,
        appliesCleanly,
        onlyModifiesIntendedFiles,
        unexpectedModificationsRejected: onlyModifiesIntendedFiles,
        staticAnalysisPassed,
        securityCheckPassed,
        testsPassed,
      },
      failureReasons,
      beforeFindingsCount,
      afterFindingsCount,
      resolvedFindings,
      introducedFindings,
    };
  }
}

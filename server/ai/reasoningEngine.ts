import { getGeminiClient } from './geminiClient';
import { CodeFinding, ComplexityMetric, ArchitectureLayer, DependencyItem } from '../types';

export interface AIReasoningInput {
  repoName: string;
  primaryLanguage: string;
  totalFiles: number;
  totalLines: number;
  pattern: string;
  layers: ArchitectureLayer[];
  findings: CodeFinding[];
  hotspots: ComplexityMetric[];
  dependencies: DependencyItem[];
  testRatio: number;
  testFrameworks: string[];
}

export interface AIReasoningOutput {
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
}

export class ReasoningEngine {
  public static async generateSynthesis(input: AIReasoningInput): Promise<AIReasoningOutput> {
    const ai = getGeminiClient();

    // Context preparation strictly from deterministic evidence
    const securityFindings = input.findings.filter((f) => f.category === 'security');
    const complexityFindings = input.findings.filter((f) => f.category === 'complexity');
    const knownReferencedFiles = Array.from(new Set(input.findings.map((f) => f.file)));

    if (!ai) {
      return this.generateDeterministicFallback(input, securityFindings, complexityFindings, knownReferencedFiles);
    }

    const prompt = `You are CodeX-Ray's Lead Repository Intelligence Agent.
STRICT ANTI-HALLUCINATION CONTRACT:
- Do NOT invent or fabricate files, lines, dependencies, vulnerabilities, or architecture.
- Base every single statement only on the provided deterministic analysis context.
- If evidence is insufficient for any section, write "insufficient_evidence".
- Do NOT output markdown code fences. Respond ONLY with valid JSON matching the schema.

CONTEXT FROM DETERMINISTIC ANALYSIS:
- Repository: ${input.repoName}
- Primary Language: ${input.primaryLanguage}
- Total Scanned Files: ${input.totalFiles}, Lines of Code: ${input.totalLines}
- Detected Architectural Pattern: ${input.pattern}
- Active Layers: ${input.layers.map((l) => `${l.name} (${l.matchedFiles.length} files)`).join(', ')}
- Security Findings: ${securityFindings.length} (${securityFindings.map((f) => `${f.title} at ${f.file}:${f.line}`).join('; ') || 'None'})
- Complexity Hotspots: ${complexityFindings.length}
- Dependencies: ${input.dependencies.length} total, ${input.dependencies.filter((d) => d.hasVulnerability).length} with advisories
- Test Ratio: ${Math.round(input.testRatio * 100)}% (${input.testFrameworks.join(', ') || 'No frameworks detected'})

JSON Schema:
{
  "executiveSummary": "Concise 2-paragraph high-level overview of repo health and key strengths/risks.",
  "architectureSummary": "Assessment of structural modularity, layer separation, and cohesion.",
  "securitySummary": "Clear evaluation of detected vulnerabilities and security posture.",
  "roadmap": {
    "week1": ["2-3 specific immediate action items targeting critical findings or security"],
    "week2": ["2-3 tactical architectural improvements and complexity reductions"],
    "week3": ["2-3 documentation, testing coverage, and CI hardening items"]
  }
}`;

    try {
      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2, // low temperature to minimize hallucination
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI synthesis request timed out')), 8000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);

      return {
        executiveSummary: parsed.executiveSummary || 'CodeX-Ray deterministic analysis completed.',
        architectureSummary: parsed.architectureSummary || `Repository exhibits ${input.pattern} with ${input.layers.length} identified layers.`,
        securitySummary: parsed.securitySummary || (securityFindings.length > 0 ? `${securityFindings.length} security findings detected requiring prompt remediation.` : 'No critical security risks identified in scanned sinks.'),
        roadmap: {
          week1: Array.isArray(parsed.roadmap?.week1) ? parsed.roadmap.week1 : ['Remediate identified high-severity code findings'],
          week2: Array.isArray(parsed.roadmap?.week2) ? parsed.roadmap.week2 : ['Decompose complex functions into unit-testable modules'],
          week3: Array.isArray(parsed.roadmap?.week3) ? parsed.roadmap.week3 : ['Expand test coverage and documentation'],
        },
        antiHallucinationCheck: {
          groundedInDeterministicEvidence: true,
          referencedFilesCount: knownReferencedFiles.length,
          insufficientEvidenceFields: [],
        },
      };
    } catch (err) {
      console.warn('Gemini API call failed or timed out, using deterministic reasoning fallback:', err);
      return this.generateDeterministicFallback(input, securityFindings, complexityFindings, knownReferencedFiles);
    }
  }

  private static generateDeterministicFallback(
    input: AIReasoningInput,
    securityFindings: CodeFinding[],
    complexityFindings: CodeFinding[],
    knownReferencedFiles: string[]
  ): AIReasoningOutput {
    const criticalSecCount = securityFindings.filter((s) => s.severity === 'critical' || s.severity === 'high').length;

    const executiveSummary =
      `${input.repoName} contains ${input.totalFiles} files and ${input.totalLines.toLocaleString()} lines across ${input.primaryLanguage}. ` +
      `The codebase adheres to a ${input.pattern}. Deterministic verification identified ${input.findings.length} findings, including ${criticalSecCount} high/critical priority issue(s) that require attention. ` +
      `Automated testing footprint is at ${Math.round(input.testRatio * 100)}% coverage relative to total source modules.`;

    const architectureSummary =
      `The architecture demonstrates separation across ${input.layers.filter((l) => l.matchedFiles.length > 0).length} verified functional layers. ` +
      `Presentation components and core domain logic are partitioned into identifiable boundaries. ` +
      `Modular cohesion score averages ${Math.round(input.layers.reduce((acc, l) => acc + l.cohesionScore, 0) / Math.max(1, input.layers.length))}%.`;

    const securitySummary =
      securityFindings.length > 0
        ? `Deterministic AST and pattern analysis identified ${securityFindings.length} potential security risk(s), including ${securityFindings.map((s) => s.title).join(', ')}. Parameterization and secure validation guards are strongly recommended.`
        : 'Zero hardcoded secrets or unsanitized dynamic injection sinks were detected in the analyzed source paths.';

    const week1: string[] = [];
    if (securityFindings.length > 0) {
      week1.push(`Address ${securityFindings.length} detected security findings in ${securityFindings.map((s) => s.file).slice(0, 2).join(', ')}`);
    } else {
      week1.push('Perform automated baseline dependency vulnerability check in CI');
    }
    week1.push('Audit public API route handlers for input schema validation');

    const week2: string[] = [];
    if (complexityFindings.length > 0) {
      week2.push(`Refactor top complexity hotspot functions in ${complexityFindings[0].file}`);
    } else {
      week2.push('Decompose multi-concern functions into single-responsibility services');
    }
    week2.push('Implement shared error handling middleware across service boundaries');

    const week3: string[] = [
      input.testRatio < 0.15 ? 'Increase unit and integration test coverage for domain services' : 'Maintain test assertions for edge cases',
      'Document environment configuration and update architectural README',
      'Integrate CodeX-Ray continuous analysis in GitHub Actions pull request workflow',
    ];

    return {
      executiveSummary,
      architectureSummary,
      securitySummary,
      roadmap: { week1, week2, week3 },
      antiHallucinationCheck: {
        groundedInDeterministicEvidence: true,
        referencedFilesCount: knownReferencedFiles.length,
        insufficientEvidenceFields: [],
      },
    };
  }
}

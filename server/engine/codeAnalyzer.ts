import { CodeFinding, ComplexityMetric } from '../types';

export class CodeAnalyzer {
  /**
   * Deterministically calculates cyclomatic complexity for a given code block.
   * Cyclomatic complexity M = E - N + 2P ≈ Decision points + 1
   * Decision points: if, else if, elif, for, while, case, catch, except, &&, ||, ?:
   */
  public static calculateComplexity(content: string, language: string): {
    totalComplexity: number;
    metrics: ComplexityMetric[];
  } {
    const lines = content.split('\n');
    const metrics: ComplexityMetric[] = [];
    let currentFunction: { name: string; startLine: number; complexity: number; lines: number; maxNesting: number } | null = null;
    let currentNesting = 0;

    const functionStartRegex = {
      Python: /^\s*def\s+([a-zA-Z0-9_]+)\s*\(/,
      TypeScript: /(?:function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>|([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/,
      JavaScript: /(?:function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/,
      Go: /^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/,
      Rust: /^\s*(?:pub\s+)?fn\s+([a-zA-Z0-9_]+)/,
      Java: /(?:public|protected|private|static|\s)+[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+\w+)?\s*\{/,
    };

    const decisionRegex = /\b(if|elif|else\s+if|for|while|case|catch|except)\b|(\&\&|\|\||\?)/g;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        continue;
      }

      // Check nesting
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      currentNesting += (openBraces - closeBraces);
      if (currentNesting < 0) currentNesting = 0;

      // Check function start
      const reg = functionStartRegex[language as keyof typeof functionStartRegex];
      if (reg) {
        const match = line.match(reg);
        if (match) {
          if (currentFunction) {
            // finish previous
            this.pushMetric(metrics, currentFunction);
          }
          const fnName = match[1] || match[2] || match[3] || 'anonymous';
          currentFunction = {
            name: fnName,
            startLine: lineNum,
            complexity: 1,
            lines: 1,
            maxNesting: currentNesting,
          };
        }
      }

      if (currentFunction) {
        currentFunction.lines += 1;
        if (currentNesting > currentFunction.maxNesting) {
          currentFunction.maxNesting = currentNesting;
        }

        // Count decision branches
        const decisionMatches = line.match(decisionRegex);
        if (decisionMatches) {
          currentFunction.complexity += decisionMatches.length;
        }
      }
    }

    if (currentFunction) {
      this.pushMetric(metrics, currentFunction);
    }

    const totalComplexity = metrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) || 1;
    return { totalComplexity, metrics };
  }

  private static pushMetric(
    metrics: ComplexityMetric[],
    fn: { name: string; startLine: number; complexity: number; lines: number; maxNesting: number }
  ) {
    let rating: ComplexityMetric['rating'] = 'low';
    if (fn.complexity > 15 || fn.lines > 120) rating = 'very_high';
    else if (fn.complexity > 10 || fn.lines > 70) rating = 'high';
    else if (fn.complexity > 5 || fn.lines > 35) rating = 'moderate';

    metrics.push({
      file: '',
      functionName: fn.name,
      line: fn.startLine,
      cyclomaticComplexity: fn.complexity,
      linesOfCode: fn.lines,
      nestedDepth: fn.maxNesting,
      rating,
    });
  }

  public static analyzeFileQuality(filePath: string, content: string, language: string): {
    findings: CodeFinding[];
    hotspots: ComplexityMetric[];
  } {
    const findings: CodeFinding[] = [];
    const { metrics } = this.calculateComplexity(content, language);
    const lines = content.split('\n');

    const hotspots: ComplexityMetric[] = metrics.map(m => ({ ...m, file: filePath }));

    // Check for oversized functions & excessive cyclomatic complexity
    for (const m of hotspots) {
      if (m.cyclomaticComplexity >= 12) {
        findings.push({
          id: `comp-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${m.line}`,
          category: 'complexity',
          severity: m.cyclomaticComplexity >= 20 ? 'high' : 'medium',
          confidence: 'HIGH',
          title: `High Cyclomatic Complexity (${m.cyclomaticComplexity}) in ${m.functionName || 'function'}`,
          message: `The function '${m.functionName}' has a cyclomatic complexity of ${m.cyclomaticComplexity}, which exceeds the recommended threshold of 10.`,
          file: filePath,
          line: m.line,
          evidence: `Function '${m.functionName}' has ${m.cyclomaticComplexity} decision branches and ${m.linesOfCode} lines of code.`,
          recommendation: `Decompose '${m.functionName}' into smaller, focused helper functions with distinct single responsibilities.`,
          isFixableWithAi: false, // Architectural refactoring requires careful review
          manualFixReason: 'Requires structural refactoring into multiple domain sub-routines',
        });
      }

      if (m.linesOfCode >= 90) {
        findings.push({
          id: `len-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${m.line}`,
          category: 'code_smell',
          severity: 'medium',
          confidence: 'HIGH',
          title: `Oversized Function (${m.linesOfCode} lines)`,
          message: `Function '${m.functionName}' contains ${m.linesOfCode} lines. Functions over 60 lines hinder readability and testability.`,
          file: filePath,
          line: m.line,
          evidence: `Function body spans lines ${m.line} to ${m.line + m.linesOfCode}.`,
          recommendation: `Extract distinct sub-operations into dedicated utility or helper functions.`,
          isFixableWithAi: false,
        });
      }
    }

    // Check for deep nesting (>= 5 levels)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.search(/\S/);
      if (indent >= 20 && line.trim().length > 0) { // e.g. 5 tabs or 20 spaces
        findings.push({
          id: `nest-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${i + 1}`,
          category: 'code_smell',
          severity: 'low',
          confidence: 'MEDIUM',
          title: 'Excessive Control-Flow Nesting',
          message: 'Code is nested deeper than 4 levels, creating arrow anti-pattern.',
          file: filePath,
          line: i + 1,
          evidence: line.trim().substring(0, 80),
          recommendation: 'Use guard clauses, early returns, or extract inner logic.',
          isFixableWithAi: true,
        });
        break; // report once per file to avoid noise
      }
    }

    // Check for empty catch / except blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /except\s*:\s*pass/.test(line) || /except\s+\w+:\s*pass/.test(line)) {
        findings.push({
          id: `empty-catch-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${i + 1}`,
          category: 'code_smell',
          severity: 'medium',
          confidence: 'HIGH',
          title: 'Silent Exception Suppression',
          message: 'Empty catch or except block silences runtime errors, hiding failures.',
          file: filePath,
          line: i + 1,
          evidence: line.trim(),
          recommendation: 'Log the caught error or handle it explicitly with fallback logic.',
          isFixableWithAi: true,
        });
      }
    }

    return { findings, hotspots };
  }
}

import { CodeFinding, ComplexityMetric, TechnicalDebtItem } from '../types';

export class TechDebtEngine {
  public static calculateTechnicalDebt(
    findings: CodeFinding[],
    hotspots: ComplexityMetric[],
    testRatio: number
  ): {
    totalEstimatedHours: number;
    items: TechnicalDebtItem[];
  } {
    const items: TechnicalDebtItem[] = [];
    let totalHours = 0;

    // 1. High Complexity items
    for (const h of hotspots.filter((x) => x.cyclomaticComplexity > 12)) {
      const hours = Math.round((h.cyclomaticComplexity - 10) * 0.8 + (h.linesOfCode / 50));
      totalHours += hours;
      items.push({
        id: `debt-comp-${h.file.replace(/[^a-zA-Z0-9]/g, '_')}-${h.line}`,
        title: `Refactor high-complexity routine: ${h.functionName || 'unnamed'}`,
        category: 'complexity',
        estimatedHours: hours,
        priority: h.cyclomaticComplexity > 20 ? 'p0' : 'p1',
        file: h.file,
        recommendation: `Decompose into single-responsibility helpers. Current complexity: ${h.cyclomaticComplexity}.`,
      });
    }

    // 2. Security findings remediation
    for (const f of findings.filter((x) => x.category === 'security')) {
      const hours = f.severity === 'critical' ? 6 : f.severity === 'high' ? 4 : 2;
      totalHours += hours;
      items.push({
        id: `debt-${f.id}`,
        title: `Remediate security vulnerability: ${f.title}`,
        category: 'architecture',
        estimatedHours: hours,
        priority: f.severity === 'critical' ? 'p0' : 'p1',
        file: f.file,
        recommendation: f.recommendation,
      });
    }

    // 3. Test debt if test ratio < 0.15
    if (testRatio < 0.15) {
      const testDebtHours = Math.round((0.2 - testRatio) * 120);
      totalHours += testDebtHours;
      items.push({
        id: 'debt-tests-gap',
        title: 'Establish automated test coverage for core domain services',
        category: 'test',
        estimatedHours: testDebtHours,
        priority: 'p1',
        file: 'tests/',
        recommendation: 'Add unit and integration tests to cover business logic paths.',
      });
    }

    // Deduplicate and sort by priority
    const priorityWeight = { p0: 0, p1: 1, p2: 2, p3: 3 };
    items.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority]);

    return { totalEstimatedHours: Math.max(2, totalHours), items: items.slice(0, 15) };
  }
}

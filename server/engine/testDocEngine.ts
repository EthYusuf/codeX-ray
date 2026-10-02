export class TestDocEngine {
  public static analyzeTesting(files: { path: string; content: string }[]): {
    frameworksDetected: string[];
    testFilesCount: number;
    testRatio: number;
    coverageStatus: string;
    qualitativeNotes: string[];
  } {
    const frameworks = new Set<string>();
    const testFiles: string[] = [];
    let hasCoverageArtifact = false;

    for (const f of files) {
      const lower = f.path.toLowerCase();
      if (
        lower.includes('test') ||
        lower.includes('spec') ||
        lower.startsWith('tests/') ||
        lower.startsWith('__tests__/')
      ) {
        testFiles.push(f.path);
      }

      if (lower.includes('lcov.info') || lower.includes('coverage.xml') || lower.includes('.coverage')) {
        hasCoverageArtifact = true;
      }

      // Detect frameworks from content
      if (f.content.includes('import pytest') || f.content.includes('def test_')) {
        frameworks.add('pytest (Python)');
      }
      if (f.content.includes('describe(') && f.content.includes('it(')) {
        if (f.content.includes('vitest')) frameworks.add('Vitest (JavaScript/TypeScript)');
        else if (f.content.includes('jest')) frameworks.add('Jest (JavaScript/TypeScript)');
        else frameworks.add('Mocha / Jest (Node.js)');
      }
      if (f.content.includes('#[test]') || f.content.includes('#[cfg(test)]')) {
        frameworks.add('cargo test (Rust)');
      }
      if (f.content.includes('func Test') && f.content.includes('*testing.T')) {
        frameworks.add('go test (Go)');
      }
      if (f.content.includes('@Test') || f.content.includes('org.junit')) {
        frameworks.add('JUnit (Java)');
      }
    }

    const totalSourceFiles = Math.max(1, files.length);
    const testRatio = Math.round((testFiles.length / totalSourceFiles) * 100) / 100;

    const qualitativeNotes: string[] = [];
    if (testFiles.length === 0) {
      qualitativeNotes.push('No automated test files or assertions were found in the analyzed source tree.');
    } else if (testRatio < 0.1) {
      qualitativeNotes.push(`Low test-to-source ratio (${Math.round(testRatio * 100)}%). Test coverage likely concentrates on limited modules.`);
    } else {
      qualitativeNotes.push(`Healthy test footprint detected with ${testFiles.length} dedicated test files across ${Array.from(frameworks).join(', ') || 'standard assertions'}.`);
    }

    const coverageStatus = hasCoverageArtifact
      ? 'Coverage artifact detected in repository.'
      : 'Coverage data unavailable (no lcov.info, coverage.xml, or CI coverage report committed).';

    return {
      frameworksDetected: Array.from(frameworks),
      testFilesCount: testFiles.length,
      testRatio,
      coverageStatus,
      qualitativeNotes,
    };
  }

  public static analyzeDocumentation(files: { path: string; content: string }[]): {
    hasReadme: boolean;
    hasContributing: boolean;
    hasApiDocs: boolean;
    inlineDocCoverage: number;
    recommendations: string[];
  } {
    const readme = files.find((f) => f.path.toLowerCase() === 'readme.md' || f.path.toLowerCase() === 'readme');
    const contributing = files.find((f) => f.path.toLowerCase().includes('contributing'));
    const apiDocs = files.find((f) => f.path.toLowerCase().includes('openapi') || f.path.toLowerCase().includes('swagger') || f.path.toLowerCase().includes('docs/api'));

    let totalDocComments = 0;
    let totalCodeLines = 0;

    for (const f of files) {
      if (f.path.endsWith('.ts') || f.path.endsWith('.js') || f.path.endsWith('.py') || f.path.endsWith('.go')) {
        const lines = f.content.split('\n');
        totalCodeLines += lines.length;
        for (const l of lines) {
          const trimmed = l.trim();
          if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('"""') || trimmed.startsWith('//') || trimmed.startsWith('#')) {
            totalDocComments++;
          }
        }
      }
    }

    const inlineDocCoverage = totalCodeLines > 0 ? Math.min(100, Math.round((totalDocComments / totalCodeLines) * 100)) : 10;
    const recommendations: string[] = [];

    if (!readme) {
      recommendations.push('Create a comprehensive README.md with system purpose, prerequisites, installation, and environment variables.');
    } else if (readme.content.length < 300) {
      recommendations.push('Expand README.md with detailed architectural overview, API reference, and deployment guide.');
    }

    if (!contributing) {
      recommendations.push('Add a CONTRIBUTING.md file defining branch naming conventions, PR guidelines, and testing requirements.');
    }

    if (!apiDocs) {
      recommendations.push('Provide structured OpenAPI / Swagger schema or endpoint documentation for external API consumers.');
    }

    return {
      hasReadme: !!readme,
      hasContributing: !!contributing,
      hasApiDocs: !!apiDocs,
      inlineDocCoverage,
      recommendations,
    };
  }
}

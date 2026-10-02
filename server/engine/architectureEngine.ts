import { ArchitectureLayer } from '../types';

export class ArchitectureEngine {
  public static analyzeArchitecture(files: { path: string; content: string }[]): {
    pattern: string;
    layers: ArchitectureLayer[];
    graphNodes: { id: string; label: string; type: 'layer' | 'module' | 'service'; fileCount: number }[];
    graphEdges: { source: string; target: string; relationship: string }[];
    warnings: string[];
  } {
    const layerDefinitions = [
      {
        id: 'frontend',
        name: 'Client / Presentation Layer',
        description: 'User interface components, pages, visual templates, and styling.',
        patterns: ['src/components', 'src/pages', 'src/views', 'src/app', 'frontend/', 'web/', 'ui/', '.tsx', '.jsx', '.vue'],
        dependencies: ['api', 'services'],
      },
      {
        id: 'api',
        name: 'API & Routing Layer',
        description: 'HTTP request handling, controllers, REST endpoints, and middleware.',
        patterns: ['api/', 'routes/', 'controllers/', 'endpoints/', 'server/api', 'handlers/', 'routers/'],
        dependencies: ['services', 'models'],
      },
      {
        id: 'services',
        name: 'Domain & Service Layer',
        description: 'Core business logic, orchestrators, workflow rules, and operations.',
        patterns: ['services/', 'service/', 'domain/', 'usecases/', 'core/', 'managers/', 'engine/'],
        dependencies: ['models'],
      },
      {
        id: 'models',
        name: 'Persistence & Data Layer',
        description: 'Database schemas, entity models, ORM mappings, and migrations.',
        patterns: ['models/', 'db/', 'database/', 'entities/', 'schemas/', 'migrations/', 'repositories/'],
        dependencies: [],
      },
      {
        id: 'testing',
        name: 'Quality & Test Suite',
        description: 'Unit tests, integration specifications, mocks, and fixtures.',
        patterns: ['tests/', 'test/', '__tests__/', '.test.', '.spec.', 'fixtures/'],
        dependencies: ['services', 'models', 'api'],
      },
      {
        id: 'infrastructure',
        name: 'Infrastructure & Configuration',
        description: 'Docker, CI/CD pipelines, build configurations, and environment setups.',
        patterns: ['docker', '.github/workflows', 'k8s/', 'terraform/', 'Dockerfile', 'vite.config', 'webpack', 'tsconfig'],
        dependencies: [],
      },
    ];

    const layers: ArchitectureLayer[] = layerDefinitions.map((def) => {
      const matched = files
        .filter((f) => def.patterns.some((pat) => f.path.toLowerCase().includes(pat.toLowerCase())))
        .map((f) => f.path);

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        filePatterns: def.patterns,
        matchedFiles: matched,
        cohesionScore: matched.length > 0 ? Math.min(95, 70 + matched.length * 2) : 0,
        dependencies: def.dependencies,
      };
    });

    const activeLayers = layers.filter((l) => l.matchedFiles.length > 0);

    // Determine high-level architectural pattern
    let pattern = 'Modular Monolith';
    const hasFrontend = layers.find((l) => l.id === 'frontend')?.matchedFiles.length! > 0;
    const hasApi = layers.find((l) => l.id === 'api')?.matchedFiles.length! > 0;
    const hasServices = layers.find((l) => l.id === 'services')?.matchedFiles.length! > 0;
    const hasModels = layers.find((l) => l.id === 'models')?.matchedFiles.length! > 0;

    if (hasFrontend && hasApi && hasServices && hasModels) {
      pattern = 'Clean Layered Architecture (Multi-Tier)';
    } else if (hasFrontend && hasApi) {
      pattern = 'Full-Stack Client-Server Pattern';
    } else if (hasServices && hasModels && !hasFrontend) {
      pattern = 'Backend Microservice / Service-Oriented';
    } else if (hasFrontend && !hasApi) {
      pattern = 'Single-Page Application (SPA)';
    }

    // Warnings
    const warnings: string[] = [];
    if (hasFrontend && hasModels && !hasApi && !hasServices) {
      warnings.push('Presentation code appears directly coupled with database models without an intermediate API or service boundary.');
    }
    const testLayer = layers.find((l) => l.id === 'testing');
    if (!testLayer || testLayer.matchedFiles.length === 0) {
      warnings.push('No dedicated test suite directory detected. Testing discipline is unverified.');
    }

    // Graph nodes & edges
    const graphNodes = activeLayers.map((l) => ({
      id: l.id,
      label: l.name,
      type: 'layer' as const,
      fileCount: l.matchedFiles.length,
    }));

    const graphEdges: { source: string; target: string; relationship: string }[] = [];
    for (const l of activeLayers) {
      for (const dep of l.dependencies) {
        if (activeLayers.some((al) => al.id === dep)) {
          graphEdges.push({
            source: l.id,
            target: dep,
            relationship: 'invokes',
          });
        }
      }
    }

    return { pattern, layers, graphNodes, graphEdges, warnings };
  }
}

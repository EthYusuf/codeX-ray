import { DependencyItem, Severity } from '../types';

interface KnownVulnerability {
  package: string;
  affectedVersionRegex: RegExp;
  cve: string;
  severity: Severity;
  summary: string;
  fixedIn: string;
}

const KNOWN_ADVISORIES: KnownVulnerability[] = [
  {
    package: 'lodash',
    affectedVersionRegex: /^4\.(?:1[0-7]|[0-9])\./,
    cve: 'CVE-2021-23337',
    severity: 'high',
    summary: 'Command injection via template function in lodash',
    fixedIn: '4.17.21',
  },
  {
    package: 'axios',
    affectedVersionRegex: /^0\.(?:[0-9]|1[0-9]|2[0-1])\./,
    cve: 'CVE-2023-45857',
    severity: 'medium',
    summary: 'Cross-Site Request Forgery (CSRF) via unauthorized redirect credentials handling',
    fixedIn: '1.6.0',
  },
  {
    package: 'jsonwebtoken',
    affectedVersionRegex: /^8\.[0-4]\./,
    cve: 'CVE-2022-23529',
    severity: 'critical',
    summary: 'Insecure key object validation leading to arbitrary remote code execution',
    fixedIn: '9.0.0',
  },
  {
    package: 'urllib3',
    affectedVersionRegex: /^1\.(?:2[0-5]|[0-1][0-9])\./,
    cve: 'CVE-2023-45803',
    severity: 'high',
    summary: 'Request body not stripped on redirect leading to cross-host credential leaks',
    fixedIn: '2.0.7',
  },
  {
    package: 'django',
    affectedVersionRegex: /^3\.[0-2]\./,
    cve: 'CVE-2022-34265',
    severity: 'critical',
    summary: 'SQL Injection in Trunc() and Extract() database functions',
    fixedIn: '3.2.14',
  },
  {
    package: 'express',
    affectedVersionRegex: /^4\.(?:1[0-5]|[0-9])\./,
    cve: 'CVE-2024-43796',
    severity: 'medium',
    summary: 'Open redirect vulnerability in express router redirect handler',
    fixedIn: '4.21.2',
  },
];

export class DependencyEngine {
  public static parseDependencies(files: { path: string; content: string }[]): DependencyItem[] {
    const items: DependencyItem[] = [];

    for (const f of files) {
      const fileName = f.path.split('/').pop() || '';

      if (fileName === 'package.json') {
        try {
          const pkg = JSON.parse(f.content);
          if (pkg.dependencies) {
            for (const [name, version] of Object.entries(pkg.dependencies)) {
              items.push(this.createDepItem(name, String(version).replace(/^[\^~]/, ''), 'npm', 'direct'));
            }
          }
          if (pkg.devDependencies) {
            for (const [name, version] of Object.entries(pkg.devDependencies)) {
              items.push(this.createDepItem(name, String(version).replace(/^[\^~]/, ''), 'npm', 'dev'));
            }
          }
        } catch {
          // ignore invalid json
        }
      } else if (fileName === 'requirements.txt') {
        const lines = f.content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:==|>=|<=|~=)?([0-9a-zA-Z._-]+)?/);
          if (match) {
            items.push(this.createDepItem(match[1], match[2] || 'any', 'pip', 'direct'));
          }
        }
      } else if (fileName === 'Cargo.toml') {
        const lines = f.content.split('\n');
        let inDeps = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('[dependencies]')) {
            inDeps = true;
            continue;
          }
          if (trimmed.startsWith('[')) {
            inDeps = false;
          }
          if (inDeps && trimmed.includes('=')) {
            const [namePart, valPart] = trimmed.split('=');
            const name = namePart.trim();
            const version = valPart.replace(/["'{}]/g, '').trim();
            items.push(this.createDepItem(name, version || '1.0.0', 'cargo', 'direct'));
          }
        }
      } else if (fileName === 'go.mod') {
        const lines = f.content.split('\n');
        let inRequire = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('require (')) {
            inRequire = true;
            continue;
          }
          if (trimmed === ')') {
            inRequire = false;
          }
          if (inRequire || trimmed.startsWith('require ')) {
            const parts = trimmed.replace('require ', '').split(/\s+/);
            if (parts.length >= 2) {
              items.push(this.createDepItem(parts[0], parts[1], 'go', 'direct'));
            }
          }
        }
      }
    }

    return items;
  }

  private static createDepItem(name: string, version: string, manager: string, type: 'direct' | 'dev'): DependencyItem {
    const advisory = KNOWN_ADVISORIES.find(
      (a) => a.package.toLowerCase() === name.toLowerCase() && a.affectedVersionRegex.test(version)
    );

    if (advisory) {
      return {
        name,
        version,
        manager,
        type,
        hasVulnerability: true,
        vulnerabilityDetails: {
          cve: advisory.cve,
          severity: advisory.severity,
          summary: advisory.summary,
          fixedIn: advisory.fixedIn,
        },
      };
    }

    return {
      name,
      version,
      manager,
      type,
      hasVulnerability: false,
    };
  }
}

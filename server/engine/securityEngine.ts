import { CodeFinding, SecretFinding, Confidence, Severity } from '../types';

interface SecretPattern {
  name: string;
  regex: RegExp;
  mask: (val: string) => string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'GitHub Personal Access Token',
    regex: /(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})/,
    mask: (v) => v.substring(0, 4) + '********************' + v.substring(v.length - 4),
  },
  {
    name: 'AWS Access Key ID',
    regex: /(A3T[A-Z0-9]|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})/,
    mask: (v) => v.substring(0, 4) + '************' + v.substring(v.length - 4),
  },
  {
    name: 'AWS Secret Access Key Assignment',
    regex: /(?:aws_secret_access_key|aws_secret|secret_key)\s*[:=]\s*["']([A-Za-z0-9/+=]{40})["']/i,
    mask: (v) => v.substring(0, 3) + '*********************************' + v.substring(v.length - 3),
  },
  {
    name: 'Generic API Key / Bearer Secret',
    regex: /(?:api_key|apikey|secret_key|private_key|auth_token)\s*[:=]\s*["']([a-zA-Z0-9_-]{24,})["']/i,
    mask: (v) => v.substring(0, 3) + '****************' + v.substring(v.length - 3),
  },
  {
    name: 'Database URL with Password',
    regex: /(postgres(?:ql)?|mysql|mongodb):\/\/[^:\s]+:([^@\s]{3,})@[a-zA-Z0-9.-]+/,
    mask: (v) => v.replace(/:([^@]{3,})@/, ':********@'),
  },
  {
    name: 'RSA / OpenSSH Private Key',
    regex: /-----BEGIN\s+(?:RSA|OPENSSH|DSA|EC)\s+PRIVATE\s+KEY-----/,
    mask: () => '-----BEGIN PRIVATE KEY----- [MASKED PRIVATE KEY CONTENT] -----END PRIVATE KEY-----',
  },
];

export class SecurityEngine {
  public static scanSecrets(filePath: string, content: string): SecretFinding[] {
    const results: SecretFinding[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of SECRET_PATTERNS) {
        const match = line.match(p.regex);
        if (match) {
          const rawMatch = match[1] || match[0];
          // avoid matching placeholder texts like "YOUR_API_KEY", "MY_GEMINI_API_KEY"
          if (
            rawMatch.includes('YOUR_') ||
            rawMatch.includes('MY_') ||
            rawMatch.includes('CHANGE_ME') ||
            rawMatch.includes('process.env') ||
            rawMatch.includes('os.environ')
          ) {
            continue;
          }

          results.push({
            id: `sec-secret-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${i + 1}`,
            type: p.name,
            file: filePath,
            line: i + 1,
            maskedSecret: p.mask(rawMatch),
            entropy: 4.8,
            confidence: 'HIGH',
            evidence: `Secret pattern matching ${p.name} detected on line ${i + 1}. Value masked.`,
          });
        }
      }
    }
    return results;
  }

  public static scanVulnerabilities(filePath: string, content: string, language: string): CodeFinding[] {
    const findings: CodeFinding[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      // 1. Raw SQL Injection patterns
      const isSqlConcat = (line.includes('SELECT ') || line.includes('INSERT ') || line.includes('UPDATE ') || line.includes('DELETE ')) &&
        (line.includes('+') || line.includes('${') || line.includes('%s') || line.includes('.format(') || line.includes('f"') || line.includes("f'"));
      const isSqlExecConcat = (line.includes('execute(') || line.includes('query(')) && (line.includes('+') || line.includes('%'));
      if (isSqlConcat || isSqlExecConcat) {
        findings.push({
          id: `sqli-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'security',
          severity: 'critical',
          confidence: 'HIGH',
          title: 'Potential SQL Injection Vulnerability',
          message: 'Dynamic SQL query string is assembled using string concatenation or unescaped interpolation.',
          file: filePath,
          line: lineNum,
          evidence: line.trim(),
          recommendation: 'Use parameterized queries, prepared statements, or ORM bound parameters.',
          isFixableWithAi: true,
          cwe: 'CWE-89',
        });
      }

      // 2. Dangerous eval / exec usage
      if (
        (/\beval\s*\(/.test(line) || /\bexec\s*\(/.test(line) || /\bFunction\s*\(/.test(line)) &&
        !line.includes('//') && !line.includes('#')
      ) {
        findings.push({
          id: `eval-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'security',
          severity: 'high',
          confidence: 'HIGH',
          title: 'Unsafe Dynamic Code Execution (eval/exec)',
          message: 'Execution of dynamic code strings can allow arbitrary code execution if user inputs reach this sink.',
          file: filePath,
          line: lineNum,
          evidence: line.trim(),
          recommendation: 'Replace eval/exec with safe serialization parsers like JSON.parse or strict lookup tables.',
          isFixableWithAi: true,
          cwe: 'CWE-95',
        });
      }

      // 3. Command Injection (subprocess shell=True, child_process.exec)
      if (
        ((line.includes('subprocess.') && line.includes('shell=True')) ||
         (line.includes('child_process.exec(') || line.includes('execSync('))) &&
        !line.includes('//') && !line.includes('#')
      ) {
        findings.push({
          id: `cmd-inj-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'security',
          severity: 'critical',
          confidence: 'HIGH',
          title: 'Command Injection Risk in System Call',
          message: 'Spawning shell processes with shell=True or exec() with untrusted arguments enables arbitrary shell command execution.',
          file: filePath,
          line: lineNum,
          evidence: line.trim(),
          recommendation: 'Use execFile or subprocess.run without shell=True, passing arguments as a sanitized array.',
          isFixableWithAi: true,
          cwe: 'CWE-78',
        });
      }

      // 4. Insecure CORS Configuration
      if (
        (line.includes("Access-Control-Allow-Origin") && (line.includes("'*'") || line.includes('"*"'))) ||
        (line.includes('cors(') && (line.includes("origin: '*'") || line.includes('origin: "*"')))
      ) {
        findings.push({
          id: `cors-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'security',
          severity: 'medium',
          confidence: 'MEDIUM',
          title: 'Permissive Wildcard CORS Policy',
          message: 'Allowing wildcard (*) origin allows any arbitrary site to read responses from this API.',
          file: filePath,
          line: lineNum,
          evidence: line.trim(),
          recommendation: 'Specify exact allowed origin domains or validate incoming Origin headers against an allowlist.',
          isFixableWithAi: true,
          cwe: 'CWE-942',
        });
      }

      // 5. Unsafe deserialization (Python pickle / yaml without safe_load)
      if (
        (line.includes('pickle.loads(') || line.includes('pickle.load(') || (line.includes('yaml.load(') && !line.includes('SafeLoader') && !line.includes('safe_load')))
      ) {
        findings.push({
          id: `deserial-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'security',
          severity: 'high',
          confidence: 'HIGH',
          title: 'Unsafe Deserialization Vulnerability',
          message: 'Deserializing untrusted pickle or un-sandboxed YAML objects allows arbitrary code execution via object instantiation.',
          file: filePath,
          line: lineNum,
          evidence: line.trim(),
          recommendation: 'Use yaml.safe_load() or JSON format instead of pickle for untrusted input.',
          isFixableWithAi: true,
          cwe: 'CWE-502',
        });
      }

      // 6. Hardcoded debug mode in production code
      if (
        (line.includes('DEBUG = True') || line.includes('debug=True') || line.includes('DEBUG: true')) &&
        !filePath.includes('test') && !filePath.includes('dev')
      ) {
        findings.push({
          id: `debug-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNum}`,
          category: 'security',
          severity: 'medium',
          confidence: 'MEDIUM',
          title: 'Debug Mode Enabled in Codebase',
          message: 'Hardcoded debug mode can leak stack traces, internal variables, and environment configuration to clients.',
          file: filePath,
          line: lineNum,
          evidence: line.trim(),
          recommendation: 'Read debug flags from environment variables and default to false in non-dev environments.',
          isFixableWithAi: true,
          cwe: 'CWE-489',
        });
      }
    }

    return findings;
  }
}

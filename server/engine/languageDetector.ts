export interface DetectedLanguage {
  name: string;
  filesCount: number;
  linesCount: number;
  percentage: number;
}

const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.pyw': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.md': 'Markdown',
};

export class LanguageDetector {
  public static detectLanguage(filePath: string): string {
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    return EXTENSION_MAP[ext] || 'Unknown';
  }

  public static aggregateLanguages(files: { path: string; content: string }[]): DetectedLanguage[] {
    const counts: Record<string, { filesCount: number; linesCount: number }> = {};
    let totalLines = 0;

    for (const file of files) {
      const lang = this.detectLanguage(file.path);
      if (lang === 'Unknown' || lang === 'JSON' || lang === 'YAML' || lang === 'Markdown' || lang === 'TOML') {
        continue;
      }
      const lines = file.content.split('\n').length;
      totalLines += lines;

      if (!counts[lang]) {
        counts[lang] = { filesCount: 0, linesCount: 0 };
      }
      counts[lang].filesCount += 1;
      counts[lang].linesCount += lines;
    }

    if (totalLines === 0) totalLines = 1;

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        filesCount: data.filesCount,
        linesCount: data.linesCount,
        percentage: Math.round((data.linesCount / totalLines) * 1000) / 10,
      }))
      .sort((a, b) => b.linesCount - a.linesCount);
  }
}

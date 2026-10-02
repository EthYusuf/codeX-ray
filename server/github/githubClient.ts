import { SAMPLE_REPOSITORIES, SampleRepo } from './sampleRepositories';

export class GitHubClient {
  private static token = process.env.GITHUB_TOKEN || '';

  public static async getRepository(owner: string, repo: string): Promise<SampleRepo> {
    // Check if it's one of the curated sample repositories
    const sample = SAMPLE_REPOSITORIES.find(
      (r) => r.owner.toLowerCase() === owner.toLowerCase() && r.name.toLowerCase() === repo.toLowerCase()
    );
    if (sample) {
      return sample;
    }

    // Attempt real GitHub API fetch
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeX-Ray-Intelligence-App',
    };
    if (this.token && this.token !== 'MY_GITHUB_TOKEN') {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        throw new Error(`GitHub API error: ${repoRes.statusText} (${repoRes.status})`);
      }
      const repoData = await repoRes.json();

      // Fetch git tree recursively
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
        { headers }
      );
      const treeData = await treeRes.json();

      const files: { path: string; content: string }[] = [];
      const treeItems = Array.isArray(treeData.tree) ? treeData.tree : [];

      // Filter and fetch key source files (up to 20 representative files to avoid rate limits)
      const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.json', '.txt', '.toml', '.md'];
      const ignoredPaths = ['node_modules/', '.git/', 'dist/', 'build/', 'coverage/', '__pycache__/'];

      const candidateFiles = treeItems
        .filter((item: any) => item.type === 'blob')
        .filter((item: any) => !ignoredPaths.some((p) => item.path.includes(p)))
        .filter((item: any) => allowedExts.some((ext) => item.path.endsWith(ext)))
        .slice(0, 25);

      for (const item of candidateFiles) {
        try {
          const contentRes = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/${item.path}`
          );
          if (contentRes.ok) {
            const text = await contentRes.text();
            files.push({ path: item.path, content: text });
          }
        } catch {
          // ignore single file fetch error
        }
      }

      // Fetch open pull requests
      let pullRequests: any[] = [];
      try {
        const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=5`, { headers });
        if (prRes.ok) {
          const prData = await prRes.json();
          pullRequests = (prData || []).map((pr: any) => ({
            prNumber: pr.number,
            title: pr.title,
            author: pr.user?.login || 'contributor',
            branch: pr.head?.ref || 'feature-branch',
            baseBranch: pr.base?.ref || repoData.default_branch,
            changedFiles: [],
          }));
        }
      } catch {
        // pr fetch optional
      }

      return {
        id: `github-${owner}-${repo}`,
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
        defaultBranch: repoData.default_branch || 'main',
        visibility: repoData.private ? 'private' : 'public',
        stars: repoData.stargazers_count || 0,
        forks: repoData.forks_count || 0,
        language: repoData.language || 'Unknown',
        description: repoData.description || 'GitHub repository analyzed by CodeX-Ray.',
        lastCommitSha: repoData.pushed_at || 'latest',
        lastCommitMessage: 'Continuous integration snapshot',
        files: files.length > 0 ? files : [{ path: 'README.md', content: `# ${repo}\nPublic GitHub repository.` }],
        pullRequests,
      };
    } catch (err) {
      console.warn(`Could not fetch live GitHub repo ${owner}/${repo}, falling back to default sample:`, err);
      return SAMPLE_REPOSITORIES[0];
    }
  }

  public static listFeaturedRepositories(): SampleRepo[] {
    return SAMPLE_REPOSITORIES;
  }
}

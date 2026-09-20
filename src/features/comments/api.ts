// GitHub API 服务：评论区客户端取数。
// 懒挂载后由浏览器直接请求 api.github.com（匿名限额 60 次/时/IP）；
// 403/429 限额与 404/410（仓库不存在 / 未开启 Discussions）均静默降级，
// 不向访客控制台刷错误。禁止在此注入任何 token —— 代码会随客户端 bundle 发布。

export interface GitHubDiscussion {
  id: string;
  title: string;
  body: string;
  url: string;
  author: {
    login: string;
    avatarUrl: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
  upvoteCount: number;
  comments: {
    totalCount: number;
  };
  category: {
    name: string;
    emoji: string;
  };
}

export interface GitHubIssue {
  id: string;
  title: string;
  body: string;
  url: string;
  number: number;
  state: "open" | "closed";
  author: {
    login: string;
    avatarUrl: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
  comments: {
    totalCount: number;
  };
  labels: {
    name: string;
    color: string;
  }[];
}

export interface GitHubRepoInfo {
  name: string;
  fullName: string;
  description: string;
  url: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  hasDiscussions?: boolean;
}

// 缓存相关（同一次会话内去重，兼容 StrictMode 双调用）
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const cache = new Map<string, { data: unknown; timestamp: number }>();

// GitHub Discussions 默认分类的 emoji 映射
const emojiMap: Record<string, string> = {
  // GitHub 默认 Discussions 分类
  announcements: "📣",
  general: "💬",
  ideas: "💡",
  "q&a": "🙏",
  "show and tell": "🙌",

  // 兼容其他可能的格式
  announcement: "📣",
  speech_balloon: "💬",
  question: "🙏",
  idea: "💡",
  show_and_tell: "🙌",
  poll: "📊",
  help_wanted: "🤝",
};

// GitHub API 原始响应的宽松类型（仅覆盖用到的字段）
interface RawRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  has_discussions?: boolean;
}

interface RawDiscussionItem {
  id: number | string;
  title: string;
  body?: string | null;
  html_url: string;
  user: { login: string; avatar_url: string; html_url: string };
  created_at: string;
  updated_at: string;
  reactions?: { total_count?: number };
  comments?: number;
  category?: { name?: string; emoji?: string };
}

interface RawIssueItem {
  id: number | string;
  title: string;
  body?: string | null;
  html_url: string;
  number: number;
  state: string;
  user: { login: string; avatar_url: string; html_url: string };
  created_at: string;
  updated_at: string;
  comments?: number;
  pull_request?: unknown;
  labels: { name: string; color: string }[];
}

// 403/429（限额）与 404/410 为预期内状态，静默返回空值不打日志
function isExpectedStatus(status: number): boolean {
  return status === 403 || status === 429 || status === 404 || status === 410;
}

// 获取仓库信息
export async function getGitHubRepoInfo(repo: string): Promise<GitHubRepoInfo | null> {
  const cacheKey = `repo-${repo}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as GitHubRepoInfo;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`GitHub repository not found: ${repo}`);
      } else if (!isExpectedStatus(response.status)) {
        console.warn(`GitHub API error for ${repo}:`, response.status);
      }
      return null;
    }

    const data = (await response.json()) as RawRepoResponse;

    const repoInfo: GitHubRepoInfo = {
      name: data.name,
      fullName: data.full_name,
      description: data.description ?? "",
      url: data.html_url,
      stargazersCount: data.stargazers_count,
      forksCount: data.forks_count,
      openIssuesCount: data.open_issues_count,
      hasDiscussions: data.has_discussions === true,
    };

    cache.set(cacheKey, { data: repoInfo, timestamp: Date.now() });
    return repoInfo;
  } catch (error) {
    console.warn(`Error fetching GitHub repo info for ${repo}:`, error);
    return null;
  }
}

// 获取仓库的 Discussions（仓库未开启时返回空数组）
export async function getGitHubDiscussions(repo: string, limit = 10): Promise<GitHubDiscussion[]> {
  const cacheKey = `discussions-${repo}-${limit}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as GitHubDiscussion[];
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/discussions?per_page=${limit}&sort=created&direction=desc`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );

    if (!response.ok) {
      if (!isExpectedStatus(response.status)) {
        console.warn(`GitHub Discussions API error for ${repo}:`, response.status);
      }
      return [];
    }

    const data = (await response.json()) as RawDiscussionItem[];

    const discussions: GitHubDiscussion[] = data.map((item) => {
      // 处理 emoji：优先分类自带 emoji，其次按分类名映射
      const rawEmoji = item.category?.emoji?.replaceAll(":", "").toLowerCase() || "general";
      const categoryName = item.category?.name?.toLowerCase() || "general";
      const emoji = emojiMap[rawEmoji] || emojiMap[categoryName] || "💬";

      return {
        id: item.id.toString(),
        title: item.title,
        body: item.body || "",
        url: item.html_url,
        author: {
          login: item.user.login,
          avatarUrl: item.user.avatar_url,
          url: item.user.html_url,
        },
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        upvoteCount: item.reactions?.total_count || 0,
        comments: { totalCount: item.comments || 0 },
        category: {
          name: item.category?.name || "General",
          emoji,
        },
      };
    });

    cache.set(cacheKey, { data: discussions, timestamp: Date.now() });
    return discussions;
  } catch (error) {
    console.warn(`Error fetching GitHub Discussions for ${repo}:`, error);
    return [];
  }
}

// 获取仓库的 Issues
export async function getGitHubIssues(
  repo: string,
  limit = 10,
  state: "open" | "closed" | "all" = "open",
): Promise<GitHubIssue[]> {
  const cacheKey = `issues-${repo}-${limit}-${state}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as GitHubIssue[];
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?per_page=${limit}&sort=created&direction=desc&state=${state}`,
      { headers: { Accept: "application/vnd.github.v3+json" } },
    );

    if (!response.ok) {
      if (!isExpectedStatus(response.status)) {
        console.warn(`GitHub Issues API error for ${repo}:`, response.status);
      }
      return [];
    }

    const data = (await response.json()) as RawIssueItem[];

    // 过滤掉 pull requests，因为 GitHub API 会将 PR 也作为 Issues 返回
    const issues: GitHubIssue[] = data
      .filter((item) => !item.pull_request)
      .map((item) => ({
        id: item.id.toString(),
        title: item.title,
        body: item.body || "",
        url: item.html_url,
        number: item.number,
        state: item.state === "closed" ? "closed" : "open",
        author: {
          login: item.user.login,
          avatarUrl: item.user.avatar_url,
          url: item.user.html_url,
        },
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        comments: { totalCount: item.comments || 0 },
        labels: item.labels.map((label) => ({ name: label.name, color: label.color })),
      }));

    cache.set(cacheKey, { data: issues, timestamp: Date.now() });
    return issues;
  } catch (error) {
    console.warn(`Error fetching GitHub Issues for ${repo}:`, error);
    return [];
  }
}

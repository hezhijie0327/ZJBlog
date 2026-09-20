// 构建期内容管线：content/<type>/*.md → 类型化条目（frontmatter + 阅读时长
// + 编译后的 HTML）。仅在 Node 侧使用（SSR / 预渲染 / 静态生成器），
// 客户端 bundle 永不引入本文件 —— Markdown 在构建期编译，运行时零编译成本。

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const contentDirectory = path.join(process.cwd(), "content");

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);

function decodeEntities(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'");
}

function escapeAttr(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

/** Markdown → HTML。三处后处理：
 *  1. mermaid 代码块 → 占位容器（data-chart 存原文），客户端进视口后才
 *     动态加载 mermaid 渲染（库 ~2.7MB，预加载曾致 perf 掉到 82）；
 *  2. GFM 任务清单复选框补 aria-hidden（纯装饰，无标签的表单控件不应
 *     进入可访问树）；
 *  3. 剥掉行首 h1——页面头部已渲染标题，正文再带一个会构成双 h1 +
 *     标题重复（对 SEO 与标题层级都是噪音）。 */
function compileMarkdown(markdown: string): string {
  const html = processor.processSync(markdown).toString().trim();
  return html
    .replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/, "")
    .replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, (_match, chart: string) => {
      return `<div class="mermaid-placeholder" data-chart="${escapeAttr(decodeEntities(chart))}"></div>`;
    })
    .replace(/<input((?:(?!aria-hidden)[^>]*)?type="checkbox"[^>]*)>/g, '<input aria-hidden="true"$1>');
}

export interface BlogEntry {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  /** 阅读时长（分钟，向上取整；展示文案由 i18n 负责） */
  readingMinutes: number;
  contentHtml: string;
  /** 原始 Markdown 正文（llms-full.txt 用，不进页面 payload） */
  content: string;
}

export interface ProjectEntry {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  type: "personal" | "starred";
  tags: string[];
  link?: string;
  githubRepo?: string;
  /** 封面图（frontmatter.image，站点根路径如 /images/xxx.png） */
  image?: string;
  contentHtml: string;
  /** 原始 Markdown 正文（llms-full.txt 用，不进页面 payload） */
  content: string;
}

type RawEntry = {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  type?: "personal" | "starred";
  tags?: string[];
  link?: string;
  githubRepo?: string;
  image?: string;
  readingMinutes?: number;
  contentHtml?: string;
  content?: string;
};

export interface ContentIndex {
  blogs: BlogEntry[];
  projects: ProjectEntry[];
}

function readEntries(type: "blogs" | "projects"): RawEntry[] {
  const dirPath = path.join(contentDirectory, type);
  if (!existsSync(dirPath)) {
    return [];
  }
  const entries: RawEntry[] = [];
  for (const file of readdirSync(dirPath)) {
    if (!file.endsWith(".md")) {
      continue;
    }
    const slug = file.replace(/\.md$/, "");
    const { data, content } = matter(readFileSync(path.join(dirPath, file), "utf8"));
    const frontmatter = data as {
      title?: string;
      description?: string;
      date?: string;
      tags?: string[];
      category?: string;
      type?: "personal" | "starred";
      link?: string;
      image?: string;
    };
    entries.push({
      slug,
      title: frontmatter.title || slug,
      date: frontmatter.date,
      description: frontmatter.description,
      category: frontmatter.category,
      tags: frontmatter.tags ?? [],
      type: frontmatter.type === "starred" ? "starred" : "personal",
      link: frontmatter.link,
      githubRepo: parseGitHubRepo(frontmatter.link),
      image: frontmatter.image,
      readingMinutes: Math.ceil(readingTime(content).minutes),
      contentHtml: compileMarkdown(content),
      content,
    });
  }
  // 日期倒序，无日期排后（与迁移前排序一致）
  return entries.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.date ? -1 : b.date ? 1 : 0;
  });
}

// 解析 GitHub 仓库链接 → "owner/repo"
function parseGitHubRepo(link?: string): string | undefined {
  if (!link) {
    return undefined;
  }
  const match = link.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) {
    return undefined;
  }
  const repo = match[2]?.replace(/\.git$/, "") ?? "";
  return `${match[1]}/${repo}`;
}

let cache: ContentIndex | null = null;

export function loadContent(): ContentIndex {
  if (!cache) {
    const toBlog = (entry: RawEntry): BlogEntry => ({
      slug: entry.slug,
      title: entry.title,
      date: entry.date,
      description: entry.description,
      category: entry.category,
      tags: entry.tags ?? [],
      readingMinutes: entry.readingMinutes ?? 1,
      contentHtml: entry.contentHtml ?? "",
      content: entry.content ?? "",
    });
    const toProject = (entry: RawEntry): ProjectEntry => ({
      slug: entry.slug,
      title: entry.title,
      date: entry.date,
      description: entry.description,
      type: entry.type === "starred" ? "starred" : "personal",
      tags: entry.tags ?? [],
      link: entry.link,
      githubRepo: entry.githubRepo,
      image: entry.image,
      contentHtml: entry.contentHtml ?? "",
      content: entry.content ?? "",
    });
    cache = {
      blogs: readEntries("blogs").map(toBlog),
      projects: readEntries("projects").map(toProject),
    };
  }
  return cache;
}

// 页面 payload 构建：每条路由 → 判别联合 payload（含文档头所需的
// title / description / OG）。SSR、预渲染与静态生成器共用；客户端契约
// （类型）见 src/lib/types.ts。

import { siteConfig } from "../src/config/site.ts";
import { translateFor } from "../src/lib/i18n.ts";
import type { AnyPageData, BlogListItem, PageGlobals, PageKind, ProjectListItem } from "../src/lib/types.ts";
import { loadContent } from "./content.ts";

const t = translateFor("zh-CN");
const TITLE_SUFFIX = ` | ${siteConfig.title}`;

function globals<P extends PageKind>(page: P, title: string, description: string): PageGlobals & { page: P } {
  return {
    page,
    locale: "zh-CN",
    siteName: siteConfig.title,
    siteUrl: siteConfig.url,
    title: page === "home" ? siteConfig.title : `${title}${TITLE_SUFFIX}`,
    description,
  };
}

function toBlogListItem(entry: {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  readingMinutes: number;
}): BlogListItem {
  return {
    slug: entry.slug,
    title: entry.title,
    date: entry.date,
    description: entry.description,
    category: entry.category,
    tags: entry.tags,
    readingMinutes: entry.readingMinutes,
  };
}

function toProjectListItem(entry: {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  type: "personal" | "starred";
  tags: string[];
  link?: string;
  githubRepo?: string;
  image?: string;
}): ProjectListItem {
  return {
    slug: entry.slug,
    title: entry.title,
    date: entry.date,
    description: entry.description,
    type: entry.type,
    tags: entry.tags,
    link: entry.link,
    githubRepo: entry.githubRepo,
    image: entry.image,
  };
}

/** 全部已发布路由（URL 形态，带尾斜杠；首页为 "/"）。预渲染与 RSS/sitemap
 *  的路线来源共用；注意：generateSitemap 只列内容页，标签筛选页属重复内容
 *  视图，刻意不进 sitemap。 */
export function allRoutes(): string[] {
  const { blogs, projects } = loadContent();
  const tags = [...new Set(blogs.flatMap((blog) => blog.tags))];
  return [
    "/",
    "/blogs/",
    ...blogs.map((blog) => `/blogs/${encodeURIComponent(blog.slug)}/`),
    ...tags.map((tag) => `/blogs/tags/${encodeURIComponent(tag)}/`),
    "/archives/",
    "/projects/",
    ...projects.map((project) => `/projects/${encodeURIComponent(project.slug)}/`),
    "/support/",
  ];
}

/** 全部标签（按出现顺序去重）。 */
export function allTags(): string[] {
  return [...new Set(loadContent().blogs.flatMap((blog) => blog.tags))];
}

/** 路由 → payload。未知路径返回 not-found payload（预渲染 404 页与
 *  客户端兜底共用）。 */
export function buildPayload(pathname: string): AnyPageData {
  const { blogs, projects } = loadContent();
  const blogLists = blogs.map(toBlogListItem);
  const projectLists = projects.map(toProjectListItem);

  if (pathname === "/") {
    return {
      globals: globals("home", siteConfig.title, siteConfig.description),
      projects: projectLists,
      blogs: blogLists,
    };
  }
  if (pathname === "/blogs/") {
    return { globals: globals("blogs", t("page.blogs.title"), siteConfig.description), blogs: blogLists };
  }
  if (pathname === "/archives/") {
    return { globals: globals("archives", t("page.archives.title"), siteConfig.description), blogs: blogLists };
  }
  if (pathname === "/projects/") {
    return { globals: globals("projects", t("page.projects.title"), siteConfig.description), projects: projectLists };
  }
  if (pathname === "/support/") {
    return { globals: globals("support", t("page.support.title"), t("support.metaDesc")) };
  }

  const tagMatch = pathname.match(/^\/blogs\/tags\/(.+)\/$/);
  if (tagMatch?.[1]) {
    const tag = decodeURIComponent(tagMatch[1]);
    const tagged = blogLists.filter((blog) => blog.tags.includes(tag));
    return {
      globals: globals("blog-tag", `#${tag}`, t("blog.tagDesc", { tag })),
      tag,
      blogs: tagged,
    };
  }

  const blogMatch = pathname.match(/^\/blogs\/(.+)\/$/);
  if (blogMatch?.[1]) {
    const index = blogs.findIndex((entry) => entry.slug === blogMatch[1]);
    const post = blogs[index];
    if (post) {
      const item = toBlogListItem(post);
      // blogs 已按日期倒序：i-1 更新（下一篇），i+1 更旧（上一篇）
      const newer = index > 0 ? blogs[index - 1] : undefined;
      const older = index >= 0 && index < blogs.length - 1 ? blogs[index + 1] : undefined;
      return {
        globals: {
          ...globals("blog-post", post.title, post.description ?? t("blog.fallbackDesc")),
          og: { type: "article", publishedTime: post.date, tags: post.tags },
        },
        post: {
          ...item,
          toc: post.toc,
          contentHtml: post.contentHtml,
          summary: post.summary,
          ...(older ? { prev: { slug: older.slug, title: older.title } } : {}),
          ...(newer ? { next: { slug: newer.slug, title: newer.title } } : {}),
        },
      };
    }
  }

  const projectMatch = pathname.match(/^\/projects\/(.+)\/$/);
  if (projectMatch?.[1]) {
    const project = projects.find((entry) => entry.slug === projectMatch[1]);
    if (project) {
      const item = toProjectListItem(project);
      return {
        globals: globals("project", project.title, project.description ?? t("project.fallbackDesc")),
        project: { ...item, contentHtml: project.contentHtml },
      };
    }
  }

  return { globals: globals("not-found", "404", siteConfig.description) };
}

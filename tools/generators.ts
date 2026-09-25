// 静态资源生成器：RSS / sitemap / robots / 搜索索引 / llms.txt，
// 构建期由预渲染脚本写入 dist/（迁移前是 Next 路由处理器，逻辑保持一致）。

import { siteConfig } from "../src/config/site.ts";
import type { SearchItem } from "../src/lib/types.ts";
import { loadContent } from "./content.ts";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function generateRss(): string {
  const blogs = loadContent().blogs;

  const items = blogs
    .map((blog) => {
      const url = `${siteConfig.url}/blogs/${encodeURIComponent(blog.slug)}/`;
      return `    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(blog.description ?? "")}</description>
      ${blog.date ? `<pubDate>${new Date(blog.date).toUTCString()}</pubDate>` : ""}
      ${blog.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

export function generateSitemap(): string {
  const { blogs, projects } = loadContent();
  // 与 trailingSlash 语义一致：所有 URL 带尾斜杠
  const staticPaths = ["", "/blogs", "/archives", "/projects", "/support"];
  const urls = [
    ...staticPaths.map((p) => ({
      loc: `${siteConfig.url}${p}/`,
      lastmod: new Date().toISOString(),
      priority: p === "" ? "1.0" : "0.7",
    })),
    ...blogs.map((blog) => ({
      loc: `${siteConfig.url}/blogs/${encodeURIComponent(blog.slug)}/`,
      lastmod: blog.date ? new Date(blog.date).toISOString() : new Date().toISOString(),
      priority: "0.6",
    })),
    ...projects.map((project) => ({
      loc: `${siteConfig.url}/projects/${encodeURIComponent(project.slug)}/`,
      lastmod: project.date ? new Date(project.date).toISOString() : new Date().toISOString(),
      priority: "0.6",
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;
}

export function generateRobots(): string {
  return `User-agent: *
Allow: /

Sitemap: ${siteConfig.url}/sitemap.xml
`;
}

export function generateSearchIndex(): string {
  const { blogs, projects } = loadContent();
  const items: SearchItem[] = [
    ...blogs.map((blog) => ({
      title: blog.title,
      description: blog.description,
      type: "blog" as const,
      tags: blog.tags,
      href: `/blogs/${encodeURIComponent(blog.slug)}/`,
    })),
    ...projects.map((project) => ({
      title: project.title,
      description: project.description,
      type: "project" as const,
      tags: project.tags,
      href: `/projects/${encodeURIComponent(project.slug)}/`,
    })),
  ];
  return JSON.stringify(items);
}

/** llms.txt：站点摘要 + 分组链接清单，指向 llms-full.txt 全文版。 */
export function generateLlms(): string {
  const { blogs, projects } = loadContent();
  const abs = (path: string) => `${siteConfig.url}${path}`;

  return [
    `# ${siteConfig.title} / Zhijie He's Blog`,
    "",
    `> ${siteConfig.author} 的个人技术博客与项目展示站点，内容为中文原创：网络工具、DNS、Cloudflare Workers、前端与开发实践。`,
    `> Personal tech blog and project showcase by ${siteConfig.author} (Chinese content).`,
    `> 全部页面正文的完整版 / Full-content version: ${abs("/llms-full.txt")}`,
    "",
    "## 站点导航 / Site Pages",
    `- [首页 / Home](${abs("/")}): 个人介绍、精选项目、经历与最新文章。`,
    `- [全部文章 / Blog](${abs("/blogs/")}): 技术文章列表，共 ${blogs.length} 篇。`,
    `- [归档 / Archives](${abs("/archives/")}): 按年份分组的全部文章。`,
    `- [项目 / Projects](${abs("/projects/")}): 个人项目与精选开源项目，共 ${projects.length} 个。`,
    `- [支持 / Support](${abs("/support/")}): 赞赏与赞助方式。`,
    "",
    "## 文章 / Blog Posts",
    ...blogs.map(
      (blog) =>
        `- [${blog.title}](${abs(`/blogs/${encodeURIComponent(blog.slug)}/`)}): ${blog.description ?? ""} [${blog.date ?? ""}]`,
    ),
    "",
    "## 项目 / Projects",
    ...projects.map(
      (project) =>
        `- [${project.title}](${abs(`/projects/${encodeURIComponent(project.slug)}/`)}): ${project.description ?? ""}${project.link ? ` (源码: ${project.link})` : ""}`,
    ),
    "",
    "## 机器可读入口 / Machine-readable Endpoints",
    `- [RSS 订阅](${abs("/rss.xml")}): 文章订阅源。`,
    `- [Sitemap](${abs("/sitemap.xml")}): 全部页面地址。`,
    `- [搜索索引](${abs("/search-index.json")}): 全部文章与项目的标题/描述/标签 JSON。`,
    "",
  ].join("\n");
}

/** llms-full.txt：全部页面正文全文（原始 Markdown，与迁移前一致）。 */
export function generateLlmsFull(): string {
  const { blogs, projects } = loadContent();
  const abs = (path: string) => `${siteConfig.url}${path}`;
  const lines: string[] = [`# ${siteConfig.title} / Full Content`, ""];

  if (blogs.length > 0) {
    lines.push("## Blog Posts", "");
    for (const blog of blogs) {
      lines.push(
        `### ${blog.title}`,
        "",
        `- URL: ${abs(`/blogs/${encodeURIComponent(blog.slug)}/`)}`,
        blog.date ? `- Date: ${blog.date}` : "",
        blog.category ? `- Category: ${blog.category}` : "",
        blog.tags.length > 0 ? `- Tags: ${blog.tags.join(", ")}` : "",
        "",
        blog.content.trim(),
        "",
        "---",
        "",
      );
    }
  }

  if (projects.length > 0) {
    lines.push("## Projects", "");
    for (const project of projects) {
      lines.push(
        `### ${project.title}`,
        "",
        `- URL: ${abs(`/projects/${encodeURIComponent(project.slug)}/`)}`,
        project.link ? `- Source: ${project.link}` : "",
        project.tags.length > 0 ? `- Tags: ${project.tags.join(", ")}` : "",
        "",
        project.content.trim(),
        "",
        "---",
        "",
      );
    }
  }

  return lines.join("\n");
}

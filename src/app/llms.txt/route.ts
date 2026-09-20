import { getAllBlogs, getAllProjects } from "@/lib/content";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

/**
 * 构建期自动生成 llms.txt（参照 Lab/Web 的生成模式）：
 * H1 标题 + 站点简介 + 按内容类型分组的绝对链接清单（含描述），
 * 并指向 llms-full.txt 全文版。
 */
export function GET(): Response {
  const blogs = getAllBlogs();
  const projects = getAllProjects();
  const abs = (path: string) => `${siteConfig.url}${path}`;

  const lines: string[] = [
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
    `- [支持 / Support](${abs("/donation/")}): 赞赏与赞助方式。`,
    "",
    "## 文章 / Blog Posts",
    ...blogs.map(
      (blog) =>
        `- [${blog.title}](${abs(`/blogs/${encodeURIComponent(blog.slug)}/`)}): ${
          blog.description ?? ""
        } [${blog.date ?? ""}]`,
    ),
    "",
    "## 项目 / Projects",
    ...projects.map(
      (project) =>
        `- [${project.title}](${abs(`/projects/${encodeURIComponent(project.slug)}/`)}): ${
          project.description ?? ""
        }${project.link ? ` (源码: ${project.link})` : ""}`,
    ),
    "",
    "## 机器可读入口 / Machine-readable Endpoints",
    `- [RSS 订阅](${abs("/rss.xml")}): 文章订阅源。`,
    `- [Sitemap](${abs("/sitemap.xml")}): 全部页面地址。`,
    `- [搜索索引](${abs("/search-index.json")}): 全部文章与项目的标题/描述/标签 JSON。`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

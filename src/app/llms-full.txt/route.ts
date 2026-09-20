import { getAllBlogs, getAllProjects } from "@/lib/content";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

/**
 * 构建期自动生成 llms-full.txt：全部文章与项目正文的 Markdown 全文，
 * 供大模型一次性摄取站点完整内容（参照 Lab/Web 的生成模式）。
 */
export function GET(): Response {
  const blogs = getAllBlogs();
  const projects = getAllProjects();
  const abs = (path: string) => `${siteConfig.url}${path}`;

  const lines: string[] = [
    `# ${siteConfig.title} / Zhijie He's Blog — Full Content`,
    "",
    `> ${siteConfig.author} 的个人技术博客与项目展示站点全部内容。站点入口: ${abs("/")}`,
    "",
    "## 文章 / Blog Posts",
    "",
    ...blogs.flatMap((blog) => [
      `## ${blog.title}`,
      "",
      `- URL: ${abs(`/blogs/${encodeURIComponent(blog.slug)}/`)}`,
      `- Date: ${blog.date ?? ""}${blog.category ? ` · Category: ${blog.category}` : ""}${
        blog.tags?.length ? ` · Tags: ${blog.tags.join(", ")}` : ""
      }`,
      "",
      blog.content.trim(),
      "",
      "---",
      "",
    ]),
    "## 项目 / Projects",
    "",
    ...projects.flatMap((project) => [
      `## ${project.title}`,
      "",
      `- URL: ${abs(`/projects/${encodeURIComponent(project.slug)}/`)}`,
      `- Type: ${project.type === "starred" ? "starred" : "personal"}${
        project.link ? ` · Source: ${project.link}` : ""
      }`,
      "",
      project.description ?? "",
      "",
      project.content.trim(),
      "",
      "---",
      "",
    ]),
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

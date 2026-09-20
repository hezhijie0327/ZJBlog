import type { MetadataRoute } from "next";
import { getAllBlogs, getAllProjects } from "@/lib/content";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // 与 trailingSlash: true 保持一致：所有 URL 带尾斜杠
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/projects",
    "/blogs",
    "/archives",
    "/donation",
  ].map((path) => ({
    url: `${siteConfig.url}${path}/`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const blogPages: MetadataRoute.Sitemap = getAllBlogs().map((blog) => ({
    url: `${siteConfig.url}/blogs/${encodeURIComponent(blog.slug)}/`,
    lastModified: blog.date ? new Date(blog.date) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const projectPages: MetadataRoute.Sitemap = getAllProjects().map(
    (project) => ({
      url: `${siteConfig.url}/projects/${encodeURIComponent(project.slug)}/`,
      lastModified: project.date ? new Date(project.date) : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  return [...staticPages, ...blogPages, ...projectPages];
}

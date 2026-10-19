// Static asset generators: RSS / sitemap / robots / search index / llms.txt,
// written into dist/ at build time by the prerender script (pre-migration
// these were Next route handlers; the logic is unchanged).

import { siteConfig } from "../src/config/site.ts";
import type { SearchItem } from "../src/lib/types.ts";
import type { BlogEntry } from "./content.ts";
import { loadContent } from "./content.ts";

/** Locked posts never enter any public index / feed / full-text export (the
 *  URL exists but is noindex; the body exists on its page only as
 *  ciphertext). */
function publicBlogs(blogs: BlogEntry[]): BlogEntry[] {
  return blogs.filter((blog) => !blog.locked);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function generateRss(): string {
  const blogs = publicBlogs(loadContent().blogs);

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
  const { blogs, projects, travels } = loadContent();
  // Matches the trailingSlash semantics: every URL carries a trailing slash
  const staticPaths = ["", "/blogs", "/archives", "/projects", "/support"];
  const urls = [
    ...staticPaths.map((p) => ({
      loc: `${siteConfig.url}${p}/`,
      lastmod: new Date().toISOString(),
      priority: p === "" ? "1.0" : "0.7",
    })),
    ...publicBlogs(blogs).map((blog) => ({
      loc: `${siteConfig.url}/blogs/${encodeURIComponent(blog.slug)}/`,
      lastmod: blog.date ? new Date(blog.date).toISOString() : new Date().toISOString(),
      priority: "0.6",
    })),
    // Travels: list page + unlocked details (locked details are noindex, not
    // in the sitemap)
    { loc: `${siteConfig.url}/travels/`, lastmod: new Date().toISOString(), priority: "0.6" },
    ...travels
      .filter((travel) => !travel.locked)
      .map((travel) => ({
        loc: `${siteConfig.url}/travels/${encodeURIComponent(travel.slug)}/`,
        lastmod: travel.date ? new Date(travel.date).toISOString() : new Date().toISOString(),
        priority: "0.5",
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

/** PWA manifest (DESIGN.md §18): metadata required for installing as a
 *  standalone app. Colors lock to the fixed light baseline #faf9f6 (same as
 *  the §2.2 brand-asset rule: splash screen / install banner do not flip with
 *  the UI theme); icon matrix = favicon.svg (any) + 192/512 transparent
 *  rasters (any) + maskable-512 (fixed light backdrop + 80% safe zone, so
 *  Android's circular mask crops the backdrop, not the glyph). */
export function generateManifest(): string {
  const manifest = {
    name: siteConfig.title,
    short_name: siteConfig.title,
    description: siteConfig.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf9f6",
    theme_color: "#faf9f6",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function generateSearchIndex(): string {
  const { blogs, projects } = loadContent();
  const items: SearchItem[] = [
    ...publicBlogs(blogs).map((blog) => ({
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

/** llms.txt: site summary + grouped link lists, pointing to the full-text
 *  llms-full.txt. */
export function generateLlms(): string {
  const { blogs, projects } = loadContent();
  const publicPosts = publicBlogs(blogs);
  const abs = (path: string) => `${siteConfig.url}${path}`;

  return [
    `# ${siteConfig.title} / Zhijie He's Blog`,
    "",
    `> Personal tech blog and project showcase by ${siteConfig.author}. Original content is written in Chinese: network tools, DNS, Cloudflare Workers, frontend and development practices.`,
    `> Full-content version: ${abs("/llms-full.txt")}`,
    "",
    "## Site Pages",
    `- [Home](${abs("/")}): intro, featured projects, footprint and the latest posts.`,
    `- [Blog](${abs("/blogs/")}): all technical posts, ${publicPosts.length} in total.`,
    `- [Archives](${abs("/archives/")}): every post grouped by year.`,
    `- [Projects](${abs("/projects/")}): personal and starred open-source projects, ${projects.length} in total.`,
    `- [Support](${abs("/support/")}): ways to tip or sponsor.`,
    "",
    "## Blog Posts",
    ...publicPosts.map(
      (blog) =>
        `- [${blog.title}](${abs(`/blogs/${encodeURIComponent(blog.slug)}/`)}): ${blog.description ?? ""} [${blog.date ?? ""}]`,
    ),
    "",
    "## Projects",
    ...projects.map(
      (project) =>
        `- [${project.title}](${abs(`/projects/${encodeURIComponent(project.slug)}/`)}): ${project.description ?? ""}${project.link ? ` (source: ${project.link})` : ""}`,
    ),
    "",
    "## Machine-readable Endpoints",
    `- [RSS](${abs("/rss.xml")}): the post feed.`,
    `- [Sitemap](${abs("/sitemap.xml")}): every page URL.`,
    `- [Search index](${abs("/search-index.json")}): titles/descriptions/tags of all posts and projects as JSON.`,
    "",
  ].join("\n");
}

/** llms-full.txt: full text of every page body (raw Markdown, identical to
 *  the pre-migration output). */
export function generateLlmsFull(): string {
  const { blogs, projects } = loadContent();
  const publicPosts = publicBlogs(blogs);
  const abs = (path: string) => `${siteConfig.url}${path}`;
  const lines: string[] = [`# ${siteConfig.title} / Full Content`, ""];

  if (publicPosts.length > 0) {
    lines.push("## Blog Posts", "");
    for (const blog of publicPosts) {
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

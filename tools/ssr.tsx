// SSR 渲染入口（tools/ 下的 Node 侧模块）：dev 中间件与预渲染共用的整页
// HTML 组装器。每条路由输出完整 HTML —— 首屏（爬虫 / Lighthouse / 用户）
// 看到全量内容，站内导航由客户端 fetch-and-swap 路由接管。
//
//   vite build --ssr tools/ssr.tsx → .vite-ssr/ssr.mjs
//   scripts/prerender.mjs → import .vite-ssr/ssr.mjs 调用 prerenderAll()

import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { renderToString } from "react-dom/server";
import { App } from "../src/app.tsx";
import { siteConfig } from "../src/config/site.ts";
import { THEME_BOOTSTRAP } from "../src/lib/theme.ts";
import { type AnyPageData, isBlogPostData, isProjectData, type PageKind, type SyncPages } from "../src/lib/types.ts";
import { ArchivesPage } from "../src/pages/ArchivesPage.tsx";
import { BlogPostPage } from "../src/pages/BlogPostPage.tsx";
import { BlogsPage } from "../src/pages/BlogsPage.tsx";
import { BlogTagPage } from "../src/pages/BlogTagPage.tsx";
import { IndexPage } from "../src/pages/IndexPage.tsx";
import { OgPage } from "../src/pages/OgPage.tsx";
import { ProjectPage } from "../src/pages/ProjectPage.tsx";
import { ProjectsPage } from "../src/pages/ProjectsPage.tsx";
import { SupportPage } from "../src/pages/SupportPage.tsx";
import {
  generateLlms,
  generateLlmsFull,
  generateRobots,
  generateRss,
  generateSearchIndex,
  generateSitemap,
} from "./generators.ts";
import { allRoutes, buildPayload } from "./payloads.ts";

/** SSR 用同步页面表：renderToString 无法等待 React.lazy，经此表直接渲染
 *  真实内容（客户端由 main.tsx 预取 chunk 后水合，见 pages/registry.ts）。 */
const SYNC_PAGES: SyncPages = {
  home: IndexPage,
  blogs: BlogsPage,
  "blog-post": BlogPostPage,
  "blog-tag": BlogTagPage,
  projects: ProjectsPage,
  project: ProjectPage,
  archives: ArchivesPage,
  support: SupportPage,
  og: OgPage,
};

/** 页面 payload kind → registry 里对应 chunk 的源文件（manifest 键）。 */
const PAGE_CHUNK_SOURCES: Record<Exclude<PageKind, "not-found">, string> = {
  home: "src/pages/IndexPage.tsx",
  blogs: "src/pages/BlogsPage.tsx",
  "blog-post": "src/pages/BlogPostPage.tsx",
  "blog-tag": "src/pages/BlogTagPage.tsx",
  projects: "src/pages/ProjectsPage.tsx",
  project: "src/pages/ProjectPage.tsx",
  archives: "src/pages/ArchivesPage.tsx",
  og: "src/pages/OgPage.tsx",
  support: "src/pages/SupportPage.tsx",
};

interface AssetUrls {
  js: string;
  css: string[];
  /** 入口 CSS 内容（构建期读出，内联进每页 <head>，消除串行请求的渲染阻塞） */
  cssInline: string;
  /** 生产构建完整 manifest，用于解析每页 chunk 的 modulepreload */
  manifest?: Record<string, { file: string }>;
}

const DIST_DIR = path.resolve("dist");

/** 客户端资产名（构建期 manifest 解析，哈希文件名）。 */
function clientAssets(): AssetUrls {
  const manifestPath = path.join(DIST_DIR, ".vite", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    { isEntry?: boolean; file: string; css?: string[] }
  >;
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  if (!entry) {
    throw new Error("manifest 中找不到客户端入口");
  }
  const css = (entry.css ?? []).map((file) => `/${file}`);
  // 单一 CSS 入口是既有设计（请求合并）；内联省掉它仅剩的一次串行 RTT。
  // </style> 防御性转义：构建产物 CSS 理论上不会包含该子串。
  const cssInline = css
    .map((href) => readFileSync(path.join(DIST_DIR, href.slice(1)), "utf8").replaceAll("</style", "<\\/style"))
    .join("\n");
  return { js: `/${entry.file}`, css, cssInline, manifest };
}

/** 当前页 chunk 的 modulepreload（与入口 JS 并行取块，水合前就绪）。 */
function pagePreload(kind: PageKind, assets: AssetUrls): string {
  if (kind === "not-found" || !assets.manifest) {
    return "";
  }
  const chunk = assets.manifest[PAGE_CHUNK_SOURCES[kind]]?.file;
  return chunk ? `\n    <link rel="modulepreload" crossorigin href="/${chunk}">` : "";
}

/** Dev 模式资产：源码入口 + vite client（CSS 经 JS 模块注入）。 */
const DEV_ASSETS: AssetUrls = { js: "/src/main.tsx", css: [], cssInline: "" };

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** page-data 剔除正文 HTML：正文单份存于 DOM（SEO/首帧看 DOM，客户端换页
 *  时从 fetch 到的文档解析回填），长文文档体积不因 SPA 契约翻倍。 */
function slimForClient(data: AnyPageData): AnyPageData {
  if (isBlogPostData(data)) {
    const { contentHtml: _contentHtml, ...post } = data.post;
    return { ...data, post };
  }
  if (isProjectData(data)) {
    const { contentHtml: _contentHtml, ...project } = data.project;
    return { ...data, project };
  }
  return data;
}

/** 默认分享卡（public/og-default.png，1200×630；源页面 /og/，截图命令见 OgPage.tsx 头注）。 */
const OG_IMAGE = "/og-default.png";

/** KaTeX 样式按需加载：仅含公式的页面注入（全站 render-blocking 代价过高）。
 *  文件在预渲染阶段从 node_modules 拷入 dist/（版本随 pnpm-lock 固定）。 */
const KATEX_HREF = "/katex.min.css";

function katexAssetPath(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("katex/dist/katex.min.css");
}

/** 页面 payload 是否需要 KaTeX 样式。 */
function needsKatex(payload: AnyPageData): boolean {
  if (isBlogPostData(payload)) {
    return payload.post.needsKatex === true;
  }
  if (isProjectData(payload)) {
    return payload.project.needsKatex === true;
  }
  return false;
}

/** 结构化数据：文章页 BlogPosting，首页 WebSite + Person，其余页不输出。 */
function jsonLdFor(payload: ReturnType<typeof buildPayload>, pathname: string): string {
  const g = payload.globals;
  if (isBlogPostData(payload)) {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: payload.post.title,
      description: g.description,
      ...(payload.post.date ? { datePublished: payload.post.date } : {}),
      ...(payload.post.tags.length > 0 ? { keywords: payload.post.tags.join(", ") } : {}),
      author: { "@type": "Person", name: siteConfig.author, url: g.siteUrl },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${g.siteUrl}${pathname}` },
      image: `${g.siteUrl}${OG_IMAGE}`,
      inLanguage: "zh-CN",
    });
  }
  if (g.page === "home") {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: g.siteName,
          url: g.siteUrl,
          description: g.description,
          inLanguage: "zh-CN",
          publisher: { "@type": "Person", "@id": `${g.siteUrl}/#author` },
        },
        {
          "@type": "Person",
          "@id": `${g.siteUrl}/#author`,
          name: siteConfig.author,
          url: g.siteUrl,
          sameAs: [siteConfig.social.github],
        },
      ],
    });
  }
  return "";
}

/** 规范化请求路径：解码、补全首尾斜杠（与 trailingSlash 语义一致）。 */
function normalizePathname(raw: string): string {
  let pathname = "/";
  try {
    pathname = decodeURIComponent(new URL(raw, "http://localhost").pathname);
  } catch {
    return "/";
  }
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }
  if (pathname.length > 1 && !pathname.endsWith("/")) {
    pathname = `${pathname}/`;
  }
  return pathname;
}

/** 渲染整页 HTML。assets 缺省 = dev 模式。 */
export async function renderRoute(rawPath: string, assets?: AssetUrls): Promise<string> {
  const pathname = normalizePathname(rawPath);
  const payload = buildPayload(pathname);
  const appHtml = renderToString(<App initialData={payload} syncPages={SYNC_PAGES} />);
  const a = assets ?? DEV_ASSETS;
  const g = payload.globals;
  const canonical =
    g.page === "not-found"
      ? ""
      : `<link rel="canonical" href="${escapeHtml(`${g.siteUrl}${pathname === "/" ? "/" : pathname}`)}">`;
  const noindexTag = g.page === "og" ? `<meta name="robots" content="noindex">` : "";
  const ogTags = [
    `<meta property="og:type" content="${g.og ? "article" : "website"}">`,
    `<meta property="og:site_name" content="${escapeHtml(g.siteName)}">`,
    `<meta property="og:url" content="${escapeHtml(`${g.siteUrl}${pathname}`)}">`,
    `<meta property="og:title" content="${escapeHtml(g.title)}">`,
    `<meta property="og:description" content="${escapeHtml(g.description)}">`,
    `<meta property="og:image" content="${escapeHtml(`${g.siteUrl}${OG_IMAGE}`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    noindexTag,
    ...(g.og?.publishedTime
      ? [`<meta property="article:published_time" content="${escapeHtml(g.og.publishedTime)}">`]
      : []),
    ...(g.og?.tags ?? []).map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`),
  ].join("\n    ");
  const jsonLd = jsonLdFor(payload, pathname);
  const jsonLdTag = jsonLd ? `<script type="application/ld+json">${jsonLd.replaceAll("<", "\\u003c")}</script>` : "";
  // dev 模式 KaTeX 样式直连 node_modules（/@fs/），生产指向拷贝到 dist 的文件。
  // /@fs/ 需要 URL 形态路径：POSIX 去掉开头一根斜杠（与前缀拼回），Windows
  // 盘符路径 C:\… 反斜杠转正斜杠（/ @fsC:\… 会 404，公式页 dev 无样式）。
  const katexHref = a.js.startsWith("/src/")
    ? `/@fs/${katexAssetPath()
        .replace(/^[/\\]/, "")
        .replaceAll("\\", "/")}`
    : KATEX_HREF;
  const katexLink = needsKatex(payload) ? `<link rel="stylesheet" crossorigin href="${katexHref}">` : "";
  // 生产：入口 CSS 以 <link> 送达（单一 CSS 入口=请求合并的既有设计；对比
  // 实验显示内联与 <link> 的 simulated FCP 相同，首帧由关键链之外的因素
  // 主导，保留 <link> 换取浏览器 CSS 缓存复用）。dev：CSS 经 vite JS 模块
  // 注入，KaTeX 走 /@fs/。
  const cssLinks = a.css
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
    .concat(katexLink)
    .join("\n    ");
  const devClient = a.js.startsWith("/src/") ? `<script type="module" src="/@vite/client"></script>` : "";
  const pageDataJson = JSON.stringify(slimForClient(payload)).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>${escapeHtml(g.title)}</title>
    <meta name="description" content="${escapeHtml(g.description)}">
    ${canonical}
    ${ogTags}
    ${jsonLdTag}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="shortcut icon" href="/favicon.png" type="image/png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(g.siteName)}" href="/rss.xml">
    ${g.page === "og" ? "" : `<script>${THEME_BOOTSTRAP}</script>`}
    ${cssLinks}
    ${pagePreload(g.page, a)}
    ${devClient}
  </head>
  <body>
    <div id="app">${appHtml}</div>
    <script id="page-data" type="application/json">${pageDataJson}</script>
    <script type="module" crossorigin src="${a.js}"></script>
  </body>
</html>`;
}

/** 预渲染全部路由 + 静态资源文件到 dist/。 */
export async function prerenderAll(): Promise<void> {
  const assets = clientAssets();
  const routes = allRoutes();

  for (const route of routes) {
    const html = await renderRoute(route, assets);
    // 路由 URL 里的 slug 是 encode 过的，磁盘路径用解码后的原始 slug
    const relative = route === "/" ? "index.html" : `${route.slice(1)}index.html`;
    const filePath = path.join(DIST_DIR, ...relative.split("/").map((segment) => decodeURIComponent(segment)));
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, html);
    console.log(`  prerendered ${route}`);
  }

  // 404 页（wrangler not_found_handling = 404-page 时直接服用）
  writeFileSync(path.join(DIST_DIR, "404.html"), await renderRoute("/__not_found__", assets));

  // 机器可读静态文件
  const staticFiles: Array<[string, string]> = [
    ["rss.xml", generateRss()],
    ["sitemap.xml", generateSitemap()],
    ["robots.txt", generateRobots()],
    ["search-index.json", generateSearchIndex()],
    ["llms.txt", generateLlms()],
    ["llms-full.txt", generateLlmsFull()],
  ];
  for (const [name, content] of staticFiles) {
    writeFileSync(path.join(DIST_DIR, name), content);
    console.log(`  generated /${name}`);
  }

  // manifest 只在构建期用于解析资产名，发布物不需要
  rmSync(path.join(DIST_DIR, ".vite"), { recursive: true, force: true });

  // KaTeX 样式按需加载（needsKatex 页面注入引用）；CSS 内字体是相对路径
  // （fonts/…），随文件一并拷入 dist/fonts/
  const katexDist = path.dirname(katexAssetPath());
  copyFileSync(path.join(katexDist, "katex.min.css"), path.join(DIST_DIR, "katex.min.css"));
  cpSync(path.join(katexDist, "fonts"), path.join(DIST_DIR, "fonts"), { recursive: true });
  console.log("  copied /katex.min.css + /fonts/");
}

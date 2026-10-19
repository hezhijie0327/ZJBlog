// SSR render entry (Node-side module under tools/): the full-page HTML
// assembler shared by the dev middleware and prerender. Every route outputs
// complete HTML — first paint (crawlers / Lighthouse / users) sees the full
// content, while in-site navigation is taken over by the client-side
// fetch-and-swap router.
//
//   vite build --ssr tools/ssr.tsx → .vite-ssr/ssr.mjs
//   scripts/prerender.mjs → imports .vite-ssr/ssr.mjs and calls prerenderAll()

import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { renderToString } from "react-dom/server";
import { App } from "../src/app.tsx";
import { siteConfig } from "../src/config/site.ts";
import { DECK_NOSCRIPT_CSS } from "../src/features/deck/DeckViewer.tsx";
import { THEME_BOOTSTRAP, THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "../src/lib/theme.ts";
import {
  type AnyPageData,
  isBlogPostData,
  isProjectData,
  isTravelData,
  isTravelsData,
  type PageKind,
  type SyncPages,
} from "../src/lib/types.ts";
import { ArchivesPage } from "../src/pages/ArchivesPage.tsx";
import { BlogPostPage } from "../src/pages/BlogPostPage.tsx";
import { BlogsPage } from "../src/pages/BlogsPage.tsx";
import { BlogTagPage } from "../src/pages/BlogTagPage.tsx";
import { IndexPage } from "../src/pages/IndexPage.tsx";
import { OgPage } from "../src/pages/OgPage.tsx";
import { ProjectPage } from "../src/pages/ProjectPage.tsx";
import { ProjectsPage } from "../src/pages/ProjectsPage.tsx";
import { SupportPage } from "../src/pages/SupportPage.tsx";
import { TravelPage } from "../src/pages/TravelPage.tsx";
import { TravelsPage } from "../src/pages/TravelsPage.tsx";
import { loadContent } from "./content.ts";
import {
  generateLlms,
  generateLlmsFull,
  generateManifest,
  generateRobots,
  generateRss,
  generateSearchIndex,
  generateSitemap,
} from "./generators.ts";
import { allLockedSharedSrcs, allSealedImages } from "./lockedImages.ts";
import { allRoutes, buildPayload } from "./payloads.ts";

/** Synchronous page table for SSR: renderToString cannot await React.lazy,
 *  so real content is rendered directly via this table (the client prefetches
 *  the chunk in main.tsx before hydrating; see pages/registry.ts). */
const SYNC_PAGES: SyncPages = {
  home: IndexPage,
  blogs: BlogsPage,
  "blog-post": BlogPostPage,
  "blog-tag": BlogTagPage,
  travels: TravelsPage,
  travel: TravelPage,
  projects: ProjectsPage,
  project: ProjectPage,
  archives: ArchivesPage,
  support: SupportPage,
  og: OgPage,
};

/** Page payload kind → the corresponding chunk's source file in the registry (manifest key). */
const PAGE_CHUNK_SOURCES: Record<Exclude<PageKind, "not-found">, string> = {
  home: "src/pages/IndexPage.tsx",
  blogs: "src/pages/BlogsPage.tsx",
  "blog-post": "src/pages/BlogPostPage.tsx",
  "blog-tag": "src/pages/BlogTagPage.tsx",
  travels: "src/pages/TravelsPage.tsx",
  travel: "src/pages/TravelPage.tsx",
  projects: "src/pages/ProjectsPage.tsx",
  project: "src/pages/ProjectPage.tsx",
  archives: "src/pages/ArchivesPage.tsx",
  og: "src/pages/OgPage.tsx",
  support: "src/pages/SupportPage.tsx",
};

interface AssetUrls {
  js: string;
  css: string[];
  /** Entry CSS content (read at build time, inlined into each page's <head>, removing the render-blocking serial request) */
  cssInline: string;
  /** Full production-build manifest, used to resolve each page chunk's modulepreload */
  manifest?: Record<string, { file: string }>;
}

const DIST_DIR = path.resolve("dist");

/** Client asset names (resolved from the build-time manifest; hashed file names). */
function clientAssets(): AssetUrls {
  const manifestPath = path.join(DIST_DIR, ".vite", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    { isEntry?: boolean; file: string; css?: string[] }
  >;
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  if (!entry) {
    throw new Error("client entry not found in the Vite manifest");
  }
  const css = (entry.css ?? []).map((file) => `/${file}`);
  // A single CSS entry is an existing design decision (request coalescing);
  // inlining saves its one remaining serial RTT. Defensive escaping of
  // </style>: build-output CSS should not contain that substring in theory.
  const cssInline = css
    .map((href) => readFileSync(path.join(DIST_DIR, href.slice(1)), "utf8").replaceAll("</style", "<\\/style"))
    .join("\n");
  return { js: `/${entry.file}`, css, cssInline, manifest };
}

/** modulepreload for the current page's chunk (fetched in parallel with the entry JS, ready before hydration). */
function pagePreload(kind: PageKind, assets: AssetUrls): string {
  if (kind === "not-found" || !assets.manifest) {
    return "";
  }
  const chunk = assets.manifest[PAGE_CHUNK_SOURCES[kind]]?.file;
  return chunk ? `\n    <link rel="modulepreload" crossorigin href="/${chunk}">` : "";
}

/** Dev-mode assets: source entry + vite client (CSS injected via JS modules). */
const DEV_ASSETS: AssetUrls = { js: "/src/main.tsx", css: [], cssInline: "" };

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Strip bulky fields from page-data: body HTML (contentHtml) and the travel
 *  map SVG (mapSvg) are stored single-source in the DOM (SEO/first paint read
 *  the DOM; on client page swaps they are parsed back out of the fetched
 *  document), so the SPA contract does not double the document size. */
function slimForClient(data: AnyPageData): AnyPageData {
  if (isBlogPostData(data)) {
    const { contentHtml: _contentHtml, ...post } = data.post;
    return { ...data, post };
  }
  if (isTravelsData(data)) {
    const { mapSvg: _mapSvg, ...rest } = data;
    return rest;
  }
  if (isTravelData(data)) {
    const { contentHtml: _contentHtml, ...trip } = data.trip;
    return { ...data, trip };
  }
  if (isProjectData(data)) {
    const { contentHtml: _contentHtml, ...project } = data.project;
    return { ...data, project };
  }
  return data;
}

/** Default share card (public/og-default.png, 1200×630; source page /og/, see the OgPage.tsx header comment for the screenshot command). */
const OG_IMAGE = "/og-default.png";

/** KaTeX styles loaded on demand: injected only on pages containing formulas
 *  (render-blocking site-wide would cost too much). The file is copied from
 *  node_modules into dist/ during prerender (version pinned by pnpm-lock). */
const KATEX_HREF = "/katex.min.css";

function katexAssetPath(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("katex/dist/katex.min.css");
}

/** Whether the page payload needs KaTeX styles. */
function needsKatex(payload: AnyPageData): boolean {
  if (isBlogPostData(payload)) {
    return payload.post.needsKatex === true;
  }
  if (isTravelData(payload)) {
    return payload.trip.needsKatex === true;
  }
  if (isProjectData(payload)) {
    return payload.project.needsKatex === true;
  }
  return false;
}

/** Structured data: BlogPosting for post pages, WebSite + Person for the home
 *  page, nothing elsewhere. Locked posts emit none (metadata beyond
 *  description/headline should not profile the post for crawlers). */
function jsonLdFor(payload: ReturnType<typeof buildPayload>, pathname: string): string {
  const g = payload.globals;
  if (isBlogPostData(payload)) {
    if (payload.post.locked) {
      return "";
    }
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

/** Normalize the request path: decode, complete leading/trailing slashes (consistent with trailingSlash semantics). */
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

/** Render the full page HTML. Omitted assets = dev mode. */
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
  // Locked posts are noindexed like /og/: the URL's existence can be public,
  // but search results should not show title/description snapshots (the
  // description is already fallback copy; whether the title is worth indexing
  // is the author's call)
  // Locked posts/travels are noindexed like /og/: the URL's existence can be
  // public, but search results should not show title/description snapshots
  // (the description is already fallback copy; whether the title is worth
  // indexing is the author's call)
  const noindex =
    g.page === "og" ||
    (isBlogPostData(payload) && payload.post.locked !== undefined) ||
    (isTravelData(payload) && payload.trip.locked !== undefined);
  const noindexTag = noindex ? `<meta name="robots" content="noindex">` : "";
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
  // Direct link to the raw Markdown (Copy as Markdown / direct agent fetch;
  // prerenderAll writes index.md to disk); locked posts get none. Each of the
  // three detail pages points at its own <kind>/<slug>/index.md.
  const markdownAltHref = (() => {
    if (isBlogPostData(payload) && payload.post.locked === undefined) {
      return `${g.siteUrl}/blogs/${encodeURIComponent(payload.post.slug)}/index.md`;
    }
    if (isTravelData(payload) && payload.trip.locked === undefined) {
      return `${g.siteUrl}/travels/${encodeURIComponent(payload.trip.slug)}/index.md`;
    }
    if (isProjectData(payload)) {
      return `${g.siteUrl}/projects/${encodeURIComponent(payload.project.slug)}/index.md`;
    }
    return "";
  })();
  const markdownAltTag = markdownAltHref
    ? `<link rel="alternate" type="text/markdown" href="${escapeHtml(markdownAltHref)}">`
    : "";
  // KaTeX styles only serve formulas deep in the body (invisible at first
  // paint), loaded via the print→all async trick to avoid blocking the first
  // frame (measured: desktop audit 97→99); noscript covers the no-JS case.
  // Production points at the file copied into dist; dev links node_modules
  // directly (/@fs/ needs a URL-shaped path: on POSIX strip the leading slash
  // (it is rejoined with the prefix); on Windows turn the drive path C:\…
  // backslashes into forward slashes (/ @fsC:\… would 404 and formula pages
  // would have no styles in dev)).
  const katexHref = a.js.startsWith("/src/")
    ? `/@fs/${katexAssetPath()
        .replace(/^[/\\]/, "")
        .replaceAll("\\", "/")}`
    : KATEX_HREF;
  const katexLink = needsKatex(payload)
    ? `<link data-katex="true" rel="stylesheet" href="${katexHref}" media="print" onload="this.media='all'">` +
      `<noscript><link data-katex="true" rel="stylesheet" href="${katexHref}"></noscript>`
    : "";
  // Production: entry CSS is delivered via <link> (single CSS entry = the
  // existing request-coalescing design; the comparison experiment showed
  // inline and <link> have identical simulated FCP — first paint is dominated
  // by factors outside the critical chain — so keep <link> in exchange for
  // browser CSS cache reuse). Dev: CSS is injected via vite JS modules; KaTeX
  // goes through /@fs/.
  const cssLinks = a.css
    .map((href) => `<link rel="stylesheet" crossorigin href="${href}">`)
    .concat(katexLink)
    .join("\n    ");
  const devClient = a.js.startsWith("/src/") ? `<script type="module" src="/@vite/client"></script>` : "";
  // The slides' default one-page-at-a-time form clips later slides outside
  // the 16:9 stage; without JS this style expands them into a stacked view
  // (noscript content in the head only applies when JS is unavailable — SPA
  // page swaps always have JS, so it does not need to follow). The style
  // arrives with the head, avoiding coupling beyond the HOST_CSS override
  // ordering issue inside the body.
  const deckNoscript =
    isBlogPostData(payload) && payload.post.deck
      ? `<noscript><style data-deck-noscript>${DECK_NOSCRIPT_CSS}</style></noscript>`
      : "";
  const pageDataJson = JSON.stringify(slimForClient(payload)).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="${THEME_COLOR_LIGHT}">
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="${THEME_COLOR_DARK}">
    <title>${escapeHtml(g.title)}</title>
    <meta name="description" content="${escapeHtml(g.description)}">
    ${canonical}
    ${markdownAltTag}
    ${ogTags}
    ${jsonLdTag}
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="shortcut icon" href="/favicon.png" type="image/png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(g.siteName)}" href="/rss.xml">
    ${g.page === "og" ? "" : `<script>${THEME_BOOTSTRAP}</script>`}
    ${cssLinks}
    ${deckNoscript}
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

/** Prerender all routes + static asset files into dist/. */
export async function prerenderAll(): Promise<void> {
  const assets = clientAssets();
  const routes = allRoutes();

  for (const route of routes) {
    const html = await renderRoute(route, assets);
    // Slugs in route URLs are encoded; disk paths use the decoded raw slug
    const relative = route === "/" ? "index.html" : `${route.slice(1)}index.html`;
    const filePath = path.join(DIST_DIR, ...relative.split("/").map((segment) => decodeURIComponent(segment)));
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, html);
    console.log(`  prerendered ${route}`);
  }

  // 404 page (served directly when wrangler not_found_handling = 404-page)
  writeFileSync(path.join(DIST_DIR, "404.html"), await renderRoute("/__not_found__", assets));

  // Raw Markdown export (data source of the "Copy as Markdown" button + the
  // index.md direct link agents fetch, pointed at by the <head> alternate):
  // unlocked content each writes one verbatim copy, 100% faithful; locked
  // posts are never written to disk (fail-closed; the page does not render
  // the button either). Deck posts export as standard Marp documents.
  const markdownTargets: Array<readonly ["blogs" | "projects" | "travels", { slug: string; locked?: unknown }]> = [
    ...loadContent().blogs.map((entry) => ["blogs", entry] as const),
    ...loadContent().projects.map((entry) => ["projects", entry] as const),
    ...loadContent().travels.map((entry) => ["travels", entry] as const),
  ];
  let markdownCount = 0;
  for (const [kind, entry] of markdownTargets) {
    if (entry.locked !== undefined) {
      continue;
    }
    const sourcePath = path.join(process.cwd(), "content", kind, `${entry.slug}.md`);
    const filePath = path.join(DIST_DIR, kind, decodeURIComponent(entry.slug), "index.md");
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, readFileSync(sourcePath, "utf8"));
    markdownCount += 1;
  }
  if (markdownCount > 0) {
    console.log(`  exported ${markdownCount} markdown file(s) (index.md)`);
  }

  // Machine-readable static files
  const staticFiles: Array<[string, string]> = [
    ["rss.xml", generateRss()],
    ["sitemap.xml", generateSitemap()],
    ["robots.txt", generateRobots()],
    ["search-index.json", generateSearchIndex()],
    ["llms.txt", generateLlms()],
    ["llms-full.txt", generateLlmsFull()],
    ["manifest.json", generateManifest()],
  ];
  for (const [name, content] of staticFiles) {
    writeFileSync(path.join(DIST_DIR, name), content);
    console.log(`  generated /${name}`);
  }

  // Locked posts' exclusive images: encrypt into .bin assets and delete the
  // plaintext originals in dist (vite already copied them from public/).
  // This must happen before compress-images — with the plaintext deleted the
  // compressor naturally skips them; image references inside the ciphertext
  // live entirely within it and are unaffected by its rewriting.
  const sealedImages = allSealedImages();
  for (const { rel, src, bytes } of sealedImages) {
    const binPath = path.join(DIST_DIR, "images", ...rel.split("/"));
    mkdirSync(path.dirname(binPath), { recursive: true });
    writeFileSync(binPath, await bytes);
    rmSync(path.join(DIST_DIR, src.slice(1)), { force: true });
  }
  if (sealedImages.length > 0) {
    console.log(`  sealed ${sealedImages.length} locked image(s) as .bin (plaintext removed)`);
  }

  // Manifest of shared plaintext images referenced by locked posts:
  // compress-images skips conversion based on it and keeps the original
  // extension files — references inside the envelope ciphertext cannot be
  // rewritten, and deleting the originals after converting to webp would 404
  // the shared images after unlock (the compression script deletes the
  // manifest right after reading; it never ships).
  const sharedSrcs = allLockedSharedSrcs();
  if (sharedSrcs.length > 0) {
    writeFileSync(path.join(DIST_DIR, ".locked-shared-images.json"), JSON.stringify(sharedSrcs));
    console.log(`  protected ${sharedSrcs.length} shared plaintext image(s) for locked posts`);
  }

  // The manifest is only used at build time to resolve asset names; the published artifact does not need it
  rmSync(path.join(DIST_DIR, ".vite"), { recursive: true, force: true });

  // KaTeX styles loaded on demand (needsKatex pages inject the reference);
  // fonts inside the CSS use relative paths (fonts/…) and are copied into
  // dist/fonts/ along with the file
  const katexDist = path.dirname(katexAssetPath());
  copyFileSync(path.join(katexDist, "katex.min.css"), path.join(DIST_DIR, "katex.min.css"));
  cpSync(path.join(katexDist, "fonts"), path.join(DIST_DIR, "fonts"), { recursive: true });
  console.log("  copied /katex.min.css + /fonts/");
}

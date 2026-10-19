// Build-time content pipeline: content/<type>/*.md → typed entries
// (frontmatter + reading time + compiled HTML + TOC tree). Node-side only
// (SSR / prerender / static generators); the client bundle never imports this
// file — Markdown is compiled at build time, so runtime has zero compilation
// cost.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path, { join } from "node:path";
import matter from "gray-matter";
import { imageSize } from "image-size";
import { pandocMarkFromMarkdown } from "mdast-util-mark";
import { pandocMark } from "micromark-extension-mark";
import readingTime from "reading-time";
import rehypeExternalLinks from "rehype-external-links";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkDeflist from "remark-deflist";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { type Processor, unified } from "unified";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { BASELINE_COPY_CODE } from "../src/lib/i18n/baseline.ts";
import type { DeckMeta, LockedContent, TocItem } from "../src/lib/types.ts";
import { remarkCallouts } from "./callouts";
import { deriveSecretKeys, encryptBundle, type SecretRef } from "./crypto";
import { compileDeck, renderDeckEmbed } from "./deck";
import {
  plantumlFigure,
  renderGeoSvg,
  topoToGeo,
  translateFlowToMermaid,
  translateSequenceToMermaid,
} from "./diagrams";
import { decodeEntities, escapeAttr, escapeHtml } from "./html.ts";
import { noteImageRefs, sealImagesForPost } from "./lockedImages";
import { highlightCode } from "./shiki.ts";

const contentDirectory = path.join(process.cwd(), "content");

// ==highlight== (Pandoc/Typora style): a micromark micro-extension wired into
// remark-parse through the standard injection point. Note that data(key,
// value) replaces wholesale rather than appending — read out the existing
// list before pushing, or you would wipe out the extensions already
// registered by remark-gfm / remark-math (pandocMark is a factory function;
// call it to obtain the extension object). The mark mdast node has no
// official hast handler, so after parsing we uniformly set data.hName="mark"
// on the tree (same mechanism as gfm delete's data.hName; remarkRehype's
// unknown-node fallback emits <mark> from it) — you cannot wrap enter.mark
// and attach from its return value: the upstream handler builds the node via
// this.enter() and returns undefined.
function remarkMark(this: Processor) {
  const data = this.data() as {
    micromarkExtensions?: unknown[];
    fromMarkdownExtensions?: unknown[];
  };
  data.micromarkExtensions ??= [];
  data.micromarkExtensions.push(pandocMark());
  data.fromMarkdownExtensions ??= [];
  data.fromMarkdownExtensions.push(pandocMarkFromMarkdown);
  return (tree: Node) => {
    visit(tree, (node) => {
      if (node.type !== "mark") {
        return;
      }
      const mark = node as Node & { data?: { hName?: string } };
      mark.data ??= {};
      mark.data.hName = "mark";
    });
  };
}

/** Inject intrinsic dimensions for site-local images (src starting with "/" →
 *  files under public/): Markdown images and raw <img> in the body that lack
 *  width/height introduce CLS and trip the a11y audit (unsized-images);
 *  off-site images can't be measured, so they are left as-is. A missing alt
 *  is likewise backfilled as empty (decorative semantics). */
/** Local structural type for hast element nodes (the project does not depend on @types/hast directly) */
interface HastElement extends Node {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
}

function rehypeLocalImageSize() {
  return (tree: Node) => {
    visit(tree, "element", (node: HastElement) => {
      if (node.tagName !== "img") {
        return;
      }
      node.properties ??= {};
      const properties = node.properties;
      const src = String(properties.src ?? "");
      if (!src.startsWith("/")) {
        return;
      }
      try {
        const dim = imageSize(readFileSync(join(process.cwd(), "public", src)));
        properties.width ??= dim.width;
        properties.height ??= dim.height;
      } catch {
        // No matching file under public/ (includes demo tags with percentage widths); skip injection
      }
      properties.alt ??= "";
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // Math: the standard remark-math library. Known divergences from GitHub's
  // rendering (upstream has not implemented cmark-gfm's delimiter rules; this
  // is an upstream boundary, not a regression — don't add hacks here):
  //   1. A digit right after `$` still opens math (dollar amounts like $100
  //      get mis-paired as a formula)
  //   2. Lacks the "digit right after a closing $ does not close" check
  //   3. `\$` escapes inside math are unwrapped at the markdown layer, so
  //      KaTeX receives a bare $ and errors
  // To align fully with GitHub, the patched tools/math-gfm.js can be recovered
  // from commit 0686022.
  .use(remarkMath)
  .use(remarkMark)
  .use(remarkEmoji)
  .use(remarkCallouts)
  .use(remarkDeflist)
  // Raw HTML: content is compiled at build time and written solely by the
  // site author, so it is trusted — allowed through and re-parsed back into
  // the element tree by rehype-raw (previously allowDangerousHtml:false
  // dropped HTML nodes wholesale, silently deleting sections like the "HTML
  // support" matrix).
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeLocalImageSize)
  .use(rehypeKatex)
  .use(rehypeSlug)
  .use(rehypeExternalLinks, { rel: ["noopener", "noreferrer"], target: "_blank" })
  .use(rehypeStringify);

/** Single code block → code-card HTML (language label + copy button + shiki
 *  highlighting). Unrecognized languages fall back to plain <pre><code>;
 *  content is never swallowed. */
function renderCodeBlock(lang: string, code: string): string {
  const label = lang || "text";
  return `<div class="code-card" data-lang="${escapeAttr(label)}"><div class="code-card-head"><span class="code-lang">${escapeHtml(label)}</span><button class="copy-code" type="button">${BASELINE_COPY_CODE}</button></div>${highlightCode(lang, code)}</div>`;
}

/** Diagram card shell: a header label in the code-card language style (no copy button). */
function diagramFigure(lang: string, body: string): string {
  return `<figure class="diagram-card"><figcaption class="code-card-head"><span class="code-lang">${escapeHtml(lang)}</span></figcaption>${body}</figure>`;
}

/** Build-time compatibility layer for Typora-specific fences: invalid data always falls back to a plain code block; content is never swallowed. */
function renderDiagram(lang: string, code: string): string | undefined {
  try {
    switch (lang) {
      case "sequence":
      case "flow": {
        const chart = lang === "sequence" ? translateSequenceToMermaid(code) : translateFlowToMermaid(code);
        return `<div class="mermaid-placeholder" data-chart="${escapeAttr(chart)}"></div>`;
      }
      case "geojson":
      case "topojson": {
        const json = JSON.parse(code) as Record<string, unknown>;
        const geo = lang === "topojson" ? topoToGeo(json) : json;
        return diagramFigure(lang, renderGeoSvg(geo));
      }
      case "plantuml":
        return diagramFigure(lang, plantumlFigure(code));
      case "stl":
        return `<div class="stl-placeholder" data-lang="stl" data-stl="${escapeAttr(code)}"></div>`;
      default:
        return undefined;
    }
  } catch {
    return renderCodeBlock(lang, code);
  }
}

/** Markdown → HTML + TOC. Post-processing:
 *  1. mermaid / sequence / flow code blocks → mermaid placeholder containers
 *     (the first stores the source verbatim; the latter two are translated to
 *     mermaid source at build time); the client loads mermaid dynamically
 *     only once they enter the viewport (the library is ~2.7MB; preloading it
 *     once dropped the perf score to 82);
 *  2. geojson / topojson → projected at build time into static SVG figure
 *     cards; plantuml → lazy img from the public rendering service; stl →
 *     placeholder container (three.js rendered lazily on the client);
 *  3. remaining code blocks → code-card (language label + copy button + shiki
 *     highlighting);
 *  4. tables get wrapped in a horizontal scroll container (columns are not
 *     squeezed on narrow screens);
 *  5. GFM task list checkboxes get aria-hidden (purely decorative);
 *  6. the leading h1 is stripped (the page header already renders the title,
 *     avoiding a double h1 + duplicate headings);
 *  7. h2/h3 are collected into the TOC (ids come from rehype-slug, so body
 *     anchors and the TOC share one source). */
function compileMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const html = processor
    .processSync(markdown)
    .toString()
    .trim()
    .replace(/^<h1[^>]*>[\s\S]*?<\/h1>\s*/, "")
    .replace(
      /<pre><code(?: class="language-([\w#+.-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
      (match, lang: string | undefined, code: string) => {
        const decoded = decodeEntities(code);
        if (lang === "mermaid") {
          return `<div class="mermaid-placeholder" data-chart="${escapeAttr(decoded)}"></div>`;
        }
        // Marpit slides (marp / deck fences): compiled at build time into the
        // embed placeholder structure; invalid data falls back to a plain
        // code block — content is never swallowed
        if (lang === "marp" || lang === "deck") {
          try {
            return renderDeckEmbed(compileDeck(decoded));
          } catch {
            return renderCodeBlock(lang, decoded);
          }
        }
        if (lang) {
          const diagram = renderDiagram(lang, decoded);
          if (diagram !== undefined) {
            return diagram;
          }
          return renderCodeBlock(lang, decoded);
        }
        // No language annotation: keep the escaped source verbatim, adding only the code-card shell and copy button
        return `<div class="code-card"><div class="code-card-head"><button class="copy-code" type="button">${BASELINE_COPY_CODE}</button></div>${match}</div>`;
      },
    )
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>")
    // GFM aligned columns: mdast-util-to-hast emits the deprecated align
    // attribute, which modern browsers no longer apply — converting to inline
    // text-align is what actually takes effect
    .replace(/<(th|td) align="(left|center|right)"/g, '<$1 style="text-align:$2"')
    .replace(/<input((?:(?!aria-hidden)[^>]*)?type="checkbox"[^>]*)>/g, '<input aria-hidden="true"$1>');

  const toc: TocItem[] = [];
  for (const match of html.matchAll(/<h([23])[^>]*?\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const depth = Number(match[1]) as 2 | 3;
    const text = decodeEntities((match[3] ?? "").replaceAll(/<[^>]+>/g, "")).trim();
    if (match[2] && text) {
      toc.push({ depth, id: match[2], text });
    }
  }
  return { html, toc };
}

export interface BlogEntry {
  slug: string;
  /** Source .md path relative to content/<kind>/ (subfolders are organizational; the URL slug stays the bare filename) */
  sourceRelPath: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  /** Reading time (minutes, rounded up; display copy is handled by i18n) */
  readingMinutes: number;
  /** Hand-written summary (frontmatter.summary; used by the post page's summary card; absent means no card) */
  summary?: string;
  contentHtml: string;
  /** Body contains KaTeX formulas (the page must load katex.min.css on demand) */
  needsKatex: boolean;
  /** h2/h3 table of contents (rehype-slug ids; shared by the client TOC and anchors) */
  toc: TocItem[];
  /** Raw Markdown body (used by llms-full.txt; not included in page payloads) */
  content: string;
  /** Slide deck metadata (posts with frontmatter deck: true): the css ships
   *  with the payload (the head does not change on SPA page swaps, so styles
   *  must be injectable per swap); slide HTML travels through contentHtml's
   *  single-source DOM channel */
  deck?: DeckMeta;
  /** Encrypted envelope (set when frontmatter.secret matches): contentHtml/
   *  toc/content never ship (private to build memory); only the envelope is
   *  written out with the payload, and the client restores it after unlock */
  locked?: LockedContent;
}

export interface ProjectEntry {
  slug: string;
  /** Source .md path relative to content/<kind>/ (subfolders are organizational; the URL slug stays the bare filename) */
  sourceRelPath: string;
  title: string;
  date?: string;
  description?: string;
  type: "personal" | "starred";
  tags: string[];
  link?: string;
  /** Cover image (frontmatter.image; a site-root path like /images/xxx.png) */
  image?: string;
  contentHtml: string;
  /** Body contains KaTeX formulas (the page must load katex.min.css on demand) */
  needsKatex: boolean;
  /** Raw Markdown body (used by llms-full.txt; not included in page payloads) */
  content: string;
}

type RawEntry = {
  slug: string;
  /** Source .md path relative to content/<kind>/ (mirrored on the public entries for the markdown export) */
  sourceRelPath: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  type?: "personal" | "starred";
  tags?: string[];
  link?: string;
  image?: string;
  readingMinutes?: number;
  summary?: string;
  contentHtml?: string;
  needsKatex?: boolean;
  toc?: TocItem[];
  content?: string;
  locked?: LockedContent;
  /** frontmatter secret name (blogs/travels; the sealing stage derives the envelope from it) */
  secretName?: string;
  /** Whole-post slide deck (frontmatter deck: true; blogs only) */
  deck?: DeckMeta;
  /** Travel-specific (travels) */
  place?: string;
  coords?: [number, number];
  endDate?: string;
  companion?: "couple" | "solo";
  cover?: string;
};

/** Travel entry: data source for the /travels/ postcard wall and map pins. */
export interface TravelEntry {
  slug: string;
  /** Source .md path relative to content/<kind>/ (subfolders are organizational; the URL slug stays the bare filename) */
  sourceRelPath: string;
  title: string;
  /** Short label for the map pin */
  place: string;
  /** [lng, lat] */
  coords: [number, number];
  date?: string;
  endDate?: string;
  companion: "couple" | "solo";
  cover?: string;
  description?: string;
  summary?: string;
  /** Related travelogue (/blogs/...) */
  link?: string;
  contentHtml: string;
  /** Body contains KaTeX formulas (the page must load katex.min.css on demand) */
  needsKatex: boolean;
  /** Raw Markdown body (private to build memory; not in the payload) */
  content: string;
  /** Encrypted envelope (frontmatter.secret match): contentHtml does not ship */
  locked?: LockedContent;
}

export interface ContentIndex {
  blogs: BlogEntry[];
  projects: ProjectEntry[];
  travels: TravelEntry[];
}

/** frontmatter whitelist; keys outside it always warn (typo defense). */
const FRONTMATTER_KEYS = new Set([
  "title",
  "description",
  "date",
  "tags",
  "category",
  "type",
  "link",
  "image",
  "draft",
  "summary",
  "secret",
  "deck",
]);

/** travels-specific whitelist (body is the story text; photos go through body Markdown images). */
const TRAVEL_FRONTMATTER_KEYS = new Set([
  "title",
  "description",
  "date",
  "endDate",
  "place",
  "coords",
  "companion",
  "cover",
  "summary",
  "link",
  "draft",
  "secret",
]);

function validateFrontmatter(type: string, slug: string, data: Record<string, unknown>): void {
  const whitelist = type === "travels" ? TRAVEL_FRONTMATTER_KEYS : FRONTMATTER_KEYS;
  for (const key of Object.keys(data)) {
    if (!whitelist.has(key)) {
      console.warn(
        `[content] ${type}/${slug}.md: unknown frontmatter field "${key}" (fix the typo or extend the whitelist)`,
      );
    }
  }
  if (!data.title) {
    console.warn(`[content] ${type}/${slug}.md: missing title — lists and the document head fall back to the slug`);
  }
  if (type !== "travels" && !data.description) {
    console.warn(`[content] ${type}/${slug}.md: missing description — SEO/OG copy falls back to the default text`);
  }
  if (!data.date) {
    console.warn(
      `[content] ${type}/${slug}.md: missing date — sorting falls to the end and the sitemap has no lastmod`,
    );
  }
}

function parseDate(type: string, slug: string, value: unknown): string | undefined {
  // Unquoted YAML dates (date: 2023-06-01) are parsed by gray-matter into
  // Date instances; they must be accepted too and the calendar field
  // extracted, or the whole date is silently dropped (no dates in lists,
  // archives land in "unknown", sitemap has no lastmod).
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || value === "") {
    return undefined;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    console.warn(`[content] ${type}/${slug}.md: unparseable date "${value}" (ISO form required, e.g. 2024-12-20)`);
    return undefined;
  }
  return value;
}

/** Recursive .md listing under content/<type>/: subfolders are a pure
 *  file-tree organizing device — the slug stays the bare filename, so
 *  routes and URLs never change. Duplicate filenames across folders collide
 *  on the slug that routes, .bin assets and anchors all key on: hard error,
 *  not a silent overwrite. Listing is sorted for deterministic iteration. */
function markdownFiles(type: "blogs" | "projects" | "travels"): { relPath: string; slug: string }[] {
  const dirPath = path.join(contentDirectory, type);
  if (!existsSync(dirPath)) {
    return [];
  }
  const bySlug = new Map<string, string>();
  const files: { relPath: string; slug: string }[] = [];
  // utf8 encoding (the default) always yields strings at runtime; the union in
  // the @types/node recursive overload only materializes with encoding:"buffer"
  for (const relPath of (readdirSync(dirPath, { recursive: true }) as string[]).sort()) {
    if (!relPath.endsWith(".md")) {
      continue;
    }
    const slug = path.basename(relPath).replace(/\.md$/, "");
    const prior = bySlug.get(slug);
    if (prior !== undefined) {
      throw new Error(
        `[content] ${type}: duplicate slug "${slug}" (${prior} vs ${type}/${relPath}) — subfolders are organizational only; keep .md filenames unique across ${type}/`,
      );
    }
    bySlug.set(slug, `${type}/${relPath}`);
    files.push({ relPath, slug });
  }
  return files;
}

function readEntries(type: "blogs" | "projects" | "travels"): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const { relPath, slug } of markdownFiles(type)) {
    const { data, content } = matter(readFileSync(path.join(contentDirectory, type, relPath), "utf8"));
    validateFrontmatter(type, slug, data);
    // draft: true entries are removed wholesale at build time; they never reach routes / lists / RSS
    if (data.draft === true) {
      continue;
    }
    // secret: <name> → encrypted content (blogs/travels; projects have no
    // lock screen UI). The envelope is generated in loadContent's sealing
    // stage — exclusive-image detection needs the site-wide image reference
    // analysis to finish first. With a missing password, loadSecret throws
    // right at the deriveSecretKeys stage — fail-closed.
    const secretName =
      type !== "projects" && typeof data.secret === "string" && data.secret !== "" ? data.secret : undefined;
    if (data.secret !== undefined && secretName === undefined) {
      console.warn(
        type === "projects"
          ? `[content] ${type}/${slug}.md: secret only supports blogs/travels (projects have no lock screen) — ignored`
          : `[content] ${type}/${slug}.md: secret must be a non-empty string — ignored`,
      );
    }
    // deck: true → whole-post slides (Marpit dialect, tools/deck.ts).
    // Combining it with secret fails the build outright: v1 has no slide
    // encryption, and silently treating it as plaintext would violate
    // fail-closed.
    const isDeck = data.deck === true;
    if (data.deck !== undefined && !isDeck) {
      console.warn(`[content] ${type}/${slug}.md: deck must be true — treated as a regular post`);
    }
    if (isDeck && secretName !== undefined) {
      throw new Error(
        `[content] ${type}/${slug}.md: deck + secret is not supported yet (no slide encryption) — drop one of them`,
      );
    }
    const deckPost = isDeck ? compileDeck(content) : undefined;
    const compiled = deckPost
      ? {
          html: deckPost.slides.join("\n"),
          toc: [] as TocItem[],
          css: deckPost.css,
          count: deckPost.count,
        }
      : compileMarkdown(content);
    // Travel-specific fields: coords must be a [lng, lat] numeric pair; companion defaults to couple
    let coords: [number, number] | undefined;
    if (type === "travels") {
      const raw = data.coords;
      if (Array.isArray(raw) && raw.length === 2 && raw.every((n) => typeof n === "number" && Number.isFinite(n))) {
        coords = [raw[0] as number, raw[1] as number];
      } else {
        console.warn(
          `[content] ${type}/${slug}.md: coords must be a [lng, lat] numeric pair — the pin will be missing`,
        );
      }
    }
    const companion = data.companion === "solo" ? "solo" : "couple";
    if (
      type === "travels" &&
      data.companion !== undefined &&
      data.companion !== "solo" &&
      data.companion !== "couple"
    ) {
      console.warn(`[content] ${type}/${slug}.md: companion must be couple | solo — treated as couple`);
    }
    entries.push({
      slug,
      sourceRelPath: relPath,
      title: data.title || slug,
      date: parseDate(type, slug, data.date),
      description: data.description,
      category: data.category,
      tags: data.tags ?? [],
      type: data.type === "starred" ? "starred" : "personal",
      link: typeof data.link === "string" ? data.link : undefined,
      image: data.image,
      readingMinutes: Math.ceil(readingTime(content).minutes),
      summary: typeof data.summary === "string" ? data.summary : undefined,
      contentHtml: compiled.html,
      needsKatex: compiled.html.includes('class="katex'),
      toc: compiled.toc,
      content,
      secretName,
      deck: deckPost ? { css: deckPost.css } : undefined,
      place: type === "travels" && typeof data.place === "string" && data.place !== "" ? data.place : undefined,
      coords,
      endDate: type === "travels" ? parseDate(type, slug, data.endDate) : undefined,
      companion,
      cover: type === "travels" && typeof data.cover === "string" ? data.cover : undefined,
    });
  }
  // Sort by date descending, undated entries last (same ordering as before the migration)
  return entries.sort((a, b) => {
    if (a.date && b.date) {
      return Date.parse(b.date) - Date.parse(a.date);
    }
    return a.date ? -1 : b.date ? 1 : 0;
  });
}

/** Scan blogs/travels frontmatter and collect the encrypted content that
 *  needs pre-derived keys (namespace keys + secret names). draft entries have
 *  already been removed wholesale and take no part. */
function collectSecretRefs(): SecretRef[] {
  const refs: SecretRef[] = [];
  for (const kind of ["blogs", "travels"] as const) {
    for (const { relPath, slug } of markdownFiles(kind)) {
      const { data } = matter(readFileSync(path.join(contentDirectory, kind, relPath), "utf8"));
      if (data.draft === true) {
        continue;
      }
      if (typeof data.secret === "string" && data.secret !== "") {
        refs.push({
          key: `${kind}:${slug}`,
          context: `${kind}/${relPath}`,
          secretName: data.secret,
        });
      }
    }
  }
  return refs;
}

// Argon2id is an async API while the content pipeline is fully synchronous:
// same pattern as the shiki highlighter — await the heavy lifting at module
// load time (roughly hundreds of ms per post), after which loadContent's call
// paths stay synchronous.
await deriveSecretKeys(collectSecretRefs());

let cache: ContentIndex | null = null;

export function loadContent(): ContentIndex {
  if (!cache) {
    const rawBlogs = readEntries("blogs");
    const rawProjects = readEntries("projects");
    const rawTravels = readEntries("travels");

    // The image reference analysis must complete site-wide before sealing:
    // exclusivity is a site-wide determination (an image also referenced by
    // any public content cannot be encrypted). Keys use the `<kind>:<slug>`
    // namespace (matching the crypto keys) so blogs/travels slugs with the
    // same name don't overwrite each other's reference tables
    for (const entry of rawBlogs) {
      noteImageRefs(`blogs:${entry.slug}`, entry.contentHtml ?? "", entry.secretName !== undefined);
    }
    for (const entry of rawProjects) {
      noteImageRefs(`projects:${entry.slug}`, entry.contentHtml ?? "", false);
    }
    for (const entry of rawTravels) {
      // A locked travel's frontmatter cover is also a private photo — splice
      // it into the reference analysis so the sealing pipeline encrypts it
      // too (no plaintext left behind in dist)
      const html =
        entry.cover !== undefined && entry.cover !== ""
          ? `${entry.contentHtml ?? ""}<img src="${entry.cover}">`
          : (entry.contentHtml ?? "");
      noteImageRefs(`travels:${entry.slug}`, html, entry.secretName !== undefined);
    }

    // Seal the locked content: body HTML + TOC + the exclusive-image IV table
    // go into the envelope ciphertext together. Plaintext never leaves build
    // memory (payloads/generators no longer consume it for locked content).
    for (const entry of rawBlogs) {
      if (!entry.secretName) {
        continue;
      }
      const images = sealImagesForPost(`blogs:${entry.slug}`, entry.slug);
      const bundle = JSON.stringify({
        html: entry.contentHtml,
        toc: entry.toc,
        ...(Object.keys(images).length > 0 ? { images } : {}),
      });
      entry.locked = encryptBundle(`blogs:${entry.slug}`, bundle);
    }
    for (const entry of rawTravels) {
      if (!entry.secretName) {
        continue;
      }
      const images = sealImagesForPost(`travels:${entry.slug}`, entry.slug);
      const bundle = JSON.stringify({
        html: entry.contentHtml,
        ...(Object.keys(images).length > 0 ? { images } : {}),
      });
      entry.locked = encryptBundle(`travels:${entry.slug}`, bundle);
    }

    const toBlog = (entry: RawEntry): BlogEntry => ({
      slug: entry.slug,
      sourceRelPath: entry.sourceRelPath,
      title: entry.title,
      date: entry.date,
      description: entry.description,
      category: entry.category,
      tags: entry.tags ?? [],
      readingMinutes: entry.readingMinutes ?? 1,
      summary: entry.summary,
      contentHtml: entry.contentHtml ?? "",
      needsKatex: entry.needsKatex ?? false,
      toc: entry.toc ?? [],
      content: entry.content ?? "",
      deck: entry.deck,
      locked: entry.locked,
    });
    const toProject = (entry: RawEntry): ProjectEntry => ({
      slug: entry.slug,
      sourceRelPath: entry.sourceRelPath,
      title: entry.title,
      date: entry.date,
      description: entry.description,
      type: entry.type === "starred" ? "starred" : "personal",
      tags: entry.tags ?? [],
      link: entry.link,
      image: entry.image,
      contentHtml: entry.contentHtml ?? "",
      needsKatex: entry.needsKatex ?? false,
      content: entry.content ?? "",
    });
    const toTravel = (entry: RawEntry): TravelEntry => ({
      slug: entry.slug,
      sourceRelPath: entry.sourceRelPath,
      title: entry.title,
      place: entry.place ?? entry.title,
      coords: entry.coords ?? [0, 0],
      date: entry.date,
      endDate: entry.endDate,
      companion: entry.companion ?? "couple",
      cover: entry.cover,
      description: entry.description,
      summary: entry.summary,
      link: entry.link,
      contentHtml: entry.contentHtml ?? "",
      needsKatex: entry.needsKatex ?? false,
      content: entry.content ?? "",
      locked: entry.locked,
    });
    cache = {
      blogs: rawBlogs.map(toBlog),
      projects: rawProjects.map(toProject),
      travels: rawTravels.map(toTravel),
    };
  }
  return cache;
}

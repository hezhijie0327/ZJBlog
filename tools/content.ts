// 构建期内容管线：content/<type>/*.md → 类型化条目（frontmatter + 阅读时长
// + 编译后的 HTML + 目录树）。仅在 Node 侧使用（SSR / 预渲染 / 静态生成器），
// 客户端 bundle 永不引入本文件 —— Markdown 在构建期编译，运行时零编译成本。

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
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
import { remarkAlert } from "remark-github-blockquote-alert";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { createHighlighter } from "shiki";
import { type Processor, unified } from "unified";
import {
  plantumlFigure,
  renderGeoSvg,
  topoToGeo,
  translateFlowToMermaid,
  translateSequenceToMermaid,
} from "./diagrams";

const contentDirectory = path.join(process.cwd(), "content");

// shiki 构建期语法高亮：双主题（defaultColor:false 输出 CSS 变量，prose.css
// 按 html.dark 切换）。两个主题都是 WCAG 高对比变体，且站点代码底色在各自
// 基准底的有利方向上（浅态更浅 / 暗态更暗），全部语法色 AA 达标 —— 这是
// 审计门禁对代码文本的硬要求（普通暗色主题在浅暖底上必然失守）。
const SHIKI_LIGHT = "github-light-high-contrast";
const SHIKI_DARK = "github-dark-high-contrast";
const SHIKI_LANGS = [
  "bash",
  "typescript",
  "javascript",
  "python",
  "yaml",
  "go",
  "dockerfile",
  "json",
  "toml",
  "ini",
  "css",
  "batch",
  "text",
] as const;
const highlighter = await createHighlighter({
  langs: [...SHIKI_LANGS],
  themes: [SHIKI_LIGHT, SHIKI_DARK],
});

// ==高亮==（Pandoc/Typora 风格）：micromark 微扩展经标准注入点挂进 remark-parse。
// 注意 data(key, value) 是整体替换而非追加 —— 必须读出现有列表再 push，
// 否则会把 remark-gfm / remark-math 已注册的扩展整个顶掉（pandocMark 是
// 工厂函数，须调用取扩展对象）。mark mdast 节点没有官方 hast handler，
// 内联补一个（输出形态对齐 gfm strikethrough 的 handler）。
function remarkMark(this: Processor) {
  const data = this.data() as {
    micromarkExtensions?: unknown[];
    mdastExtensions?: unknown[];
    handlers?: Record<string, unknown>;
  };
  data.micromarkExtensions ??= [];
  data.micromarkExtensions.push(pandocMark());
  data.mdastExtensions ??= [];
  data.mdastExtensions.push(pandocMarkFromMarkdown);
  type HastElement = {
    type: "element";
    tagName: string;
    properties: Record<string, unknown>;
    children: unknown[];
  };
  const markToHast = (state: { all: (node: unknown) => HastElement[] }, node: unknown): HastElement => ({
    type: "element",
    tagName: "mark",
    properties: {},
    children: state.all(node),
  });
  data.handlers ??= {};
  data.handlers.mark = markToHast;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkMark)
  .use(remarkEmoji)
  .use(remarkAlert)
  .use(remarkDeflist)
  // raw HTML：内容构建期编译且仅来自本人撰写，视为可信 —— 放行后由
  // rehype-raw 重解析回元素树（此前 allowDangerousHtml:false 会把 HTML
  // 节点整体丢弃，造成「HTML 支持情况」一类章节内容静默消失）。
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeKatex)
  .use(rehypeSlug)
  .use(rehypeExternalLinks, { rel: ["noopener", "noreferrer"], target: "_blank" })
  .use(rehypeStringify);

/** 解码 rehype-stringify 的字符引用（喂给 shiki / TOC 文本前必须还原原文）。
 *  顺序敏感：先解命名/数字实体，最后解 &amp; —— 否则 "&amp;lt;" 会被
 *  二次解码成 "<"。 */
function decodeEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#x3C;", "<")
    .replaceAll("&#x3c;", "<")
    .replaceAll("&#x26;", "&")
    .replaceAll("&#x60;", "`")
    .replaceAll("&amp;", "&");
}

function escapeAttr(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** 目录条目（构建期从编译产物提取，id 与 rehype-slug 生成的锚点一致）。 */
export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** 单个代码块 → code-card HTML（语言标签 + 复制按钮 + shiki 高亮）。
 *  未识别语言回退纯 <pre><code>，不吞内容。 */
function renderCodeBlock(lang: string, code: string): string {
  const label = lang || "text";
  let body: string;
  try {
    body = highlighter
      .codeToHtml(code, {
        lang: label,
        themes: { light: SHIKI_LIGHT, dark: SHIKI_DARK },
        defaultColor: false,
      })
      .replace(/ tabindex="0"/g, "");
  } catch {
    body = `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
  return `<div class="code-card" data-lang="${escapeAttr(label)}"><div class="code-card-head"><span class="code-lang">${escapeHtml(label)}</span><button class="copy-code" type="button">复制</button></div>${body}</div>`;
}

/** 图示卡外壳：与 code-card 同语言的头部标签（无复制按钮）。 */
function diagramFigure(lang: string, body: string): string {
  return `<figure class="diagram-card"><figcaption class="code-card-head"><span class="code-lang">${escapeHtml(lang)}</span></figcaption>${body}</figure>`;
}

/** Typora 专属 fence 的构建期兼容层：非法数据一律回退普通代码块，不吞内容。 */
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

/** Markdown → HTML + 目录。后处理：
 *  1. mermaid / sequence / flow 代码块 → mermaid 占位容器（前者原文直存，
 *     后两者构建期翻译为 mermaid 源码），客户端进视口后才动态加载 mermaid
 *     渲染（库 ~2.7MB，预加载曾致 perf 掉到 82）；
 *  2. geojson / topojson → 构建期直接投影成静态 SVG 图卡；plantuml → 公共
 *     渲染服务的 lazy img；stl → 占位容器（客户端 three.js 惰性渲染）；
 *  3. 其余代码块 → code-card（语言标签 + 复制按钮 + shiki 高亮）；
 *  4. 表格包一层横向滚动容器（窄屏不挤压列）；
 *  5. GFM 任务清单复选框补 aria-hidden（纯装饰）；
 *  6. 剥掉行首 h1（页面头部已渲染标题，避免双 h1 + 标题重复）；
 *  7. h2/h3 收进目录（id 由 rehype-slug 生成，正文锚点与 TOC 同源）。 */
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
        if (lang) {
          const diagram = renderDiagram(lang, decoded);
          if (diagram !== undefined) {
            return diagram;
          }
          return renderCodeBlock(lang, decoded);
        }
        // 无语言标注：保留转义后的原文，仅补 code-card 外壳与复制按钮
        return `<div class="code-card"><div class="code-card-head"><button class="copy-code" type="button">复制</button></div>${match}</div>`;
      },
    )
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>")
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
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  /** 阅读时长（分钟，向上取整；展示文案由 i18n 负责） */
  readingMinutes: number;
  /** 手写摘要（frontmatter.summary，文章页摘要卡用；不填则无卡） */
  summary?: string;
  contentHtml: string;
  /** h2/h3 目录（rehype-slug 的 id，客户端 TOC 与锚点共用） */
  toc: TocItem[];
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
  image?: string;
  readingMinutes?: number;
  summary?: string;
  contentHtml?: string;
  toc?: TocItem[];
  content?: string;
};

export interface ContentIndex {
  blogs: BlogEntry[];
  projects: ProjectEntry[];
}

/** frontmatter 白名单；白名单外的键一律告警（typo 防线）。 */
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
]);

function validateFrontmatter(type: string, slug: string, data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    if (!FRONTMATTER_KEYS.has(key)) {
      console.warn(`[content] ${type}/${slug}.md: 未知的 frontmatter 字段 "${key}"（检查拼写或补充白名单）`);
    }
  }
  if (!data.title) {
    console.warn(`[content] ${type}/${slug}.md: 缺少 title，列表与文档头将退化显示 slug`);
  }
  if (!data.description) {
    console.warn(`[content] ${type}/${slug}.md: 缺少 description，SEO/OG 描述将使用兜底文案`);
  }
  if (!data.date) {
    console.warn(`[content] ${type}/${slug}.md: 缺少 date，排序将退到最后且 sitemap 无 lastmod`);
  }
}

function parseDate(type: string, slug: string, value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    console.warn(`[content] ${type}/${slug}.md: 无法解析的日期 "${value}"（需要 ISO 形如 2024-12-20）`);
    return undefined;
  }
  return value;
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
    validateFrontmatter(type, slug, data);
    // draft: true 的条目构建期整体剔除，不进路由 / 列表 / RSS
    if (data.draft === true) {
      continue;
    }
    const compiled = compileMarkdown(content);
    entries.push({
      slug,
      title: data.title || slug,
      date: parseDate(type, slug, data.date),
      description: data.description,
      category: data.category,
      tags: data.tags ?? [],
      type: data.type === "starred" ? "starred" : "personal",
      link: data.link,
      image: data.image,
      readingMinutes: Math.ceil(readingTime(content).minutes),
      summary: typeof data.summary === "string" ? data.summary : undefined,
      contentHtml: compiled.html,
      toc: compiled.toc,
      content,
    });
  }
  // 日期倒序，无日期排后（与迁移前排序一致）
  return entries.sort((a, b) => {
    if (a.date && b.date) {
      return Date.parse(b.date) - Date.parse(a.date);
    }
    return a.date ? -1 : b.date ? 1 : 0;
  });
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
      summary: entry.summary,
      contentHtml: entry.contentHtml ?? "",
      toc: entry.toc ?? [],
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

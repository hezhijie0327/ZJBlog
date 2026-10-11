// 构建期幻灯片编译（marp-core，Marpit 方言的超集）：整篇 deck 博文
// （frontmatter deck: true）与普通正文的 ```marp fence 共用本模块。deck 内容
// 不支持的站内扩展见文件尾的「方言边界」注释，已桥接的：mermaid（占位容器 +
// 站内渲染器）、数学 KaTeX、callouts、==mark==、emoji、任务清单、定义列表、
// sequence/flow（转 mermaid），产物是静态 <section> + 主题 CSS，客户端零
// Marp 代码（播放器见 features/deck）。
//
// 产物约定（与 src/features/deck/DeckViewer.tsx、pageData.ts 三方对齐）：
//   - section 的 id 一律剥掉换成 data-slide（多个 deck 同页会撞 duplicate-id
//     审计），标题整体降一级（h1 让给文章标题，heading-order 审计）；
//   - 代码块用站内 shiki 双主题重高亮，站内图注入固有尺寸（unsized-images
//     审计）；演讲者备注（HTML 注释）注入每页 .deck-notes；
//   - 嵌入形态的 CSS 剥掉 @page（否则会劫持文章打印的纸张尺寸）。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Marp } from "@marp-team/marp-core";
import { mark } from "@mdit/plugin-mark";
import { tasklist } from "@mdit/plugin-tasklist";
import { imageSize } from "image-size";
import markdownItDeflist from "markdown-it-deflist";
import { deckCallouts } from "./deckCallouts";
import deckThemeCss from "./deckTheme.css?raw";
import { translateFlowToMermaid, translateSequenceToMermaid } from "./diagrams";
import { decodeEntities, escapeAttr, escapeHtml } from "./html.ts";
import { highlightCode } from "./shiki.ts";

export interface DeckResult {
  /** 逐页 section HTML（含 data-slide 标号，无容器） */
  slides: string[];
  /** marpit 生成的完整样式（主题 scoping 到 div.marpit > section + 归一化） */
  css: string;
  count: number;
}

/** 站点缝（DESIGN.md §5.2 家族契约）：同一份编译管线跑在两个站点上——
 *  ZJBlog 构建期（可信作者、shiki、本地图尺寸）与 ZJSearch 运行时（模型
 *  内容、无 shiki、无本地文件系统）。缺省值 = 博客行为，调用点零改动。 */
export interface DeckCompileOptions {
  /** 源内 raw HTML：true = 可信作者直通（博客）；false = 转义为可见文本
   *  （模型内容——指令注释与演讲者备注的解析不受影响，实测确认） */
  html?: boolean;
  /** 代码 fence 高亮器（吃解码后的代码，返回 HTML）；缺省保留 markdown-it
   *  默认形态（转义代码块）——博客传站内 shiki 双主题 pass */
  highlight?: (lang: string, code: string) => string;
  /** 站内图（/ 开头 src）注入固有尺寸（博客的 unsized-images 审计）；运行时
   *  渲染器没有本地文件系统，关掉 */
  imageSizes?: boolean;
  /** 标题整体降一级（h1 让给文章标题，博客的 heading-order 审计）；独立
   *  deck（无文章标题上下文）保留作者层级 */
  demoteHeadings?: boolean;
}

// 内核换成 marp-core（数学 KaTeX、emoji 短代码由内核接管，替代手接的
// @mdit/plugin-katex / plugin-emoji）。构造参数把 marp-core 调高的默认值全部
// 钉回 Marpit 语义——DeckViewer 与打印契约建立在普通 <section> 流上：
// inlineSVG 关、breaks/linkify 关、标题不产 id（duplicate-id 审计）、不注入
// 浏览器 helper <script>；fence 高亮让回 markdown-it 默认形态，由
// postProcessSlide 统一走站内 shiki（内置 hljs 的 class 形态吃不进高亮桥接
// 正则）。
//
// 双实例：开数学的实例产 HTML；marp-core 只要开着数学就会把整套 KaTeX CSS
// （@font-face 指向 jsDelivr CDN）追加进渲染 css，而页面级 /katex.min.css 已
// 按 needsKatex 注入，deck css 不需要也不该重复背它——css 与内容无关，用
// math:false 的孪生实例空渲染取纯主题 css。工厂保证两实例配置不漂移。
function createMarp(math: boolean, html: boolean): Marp {
  const marp = new Marp({
    inlineSVG: false,
    looseYAML: false,
    cssContainerQuery: false,
    emoji: { shortcode: true, unicode: false },
    math: math ? "katex" : false,
    script: false,
    slug: false,
    markdown: {
      html,
      breaks: false,
      linkify: false,
      highlight: () => "",
    },
  });
  marp.use(deckCallouts);
  marp.use(mark);
  marp.use(tasklist);
  marp.use(markdownItDeflist);
  marp.themeSet.default = marp.themeSet.add(deckThemeCss);
  return marp;
}

/** 实例缓存（math × html 四种组合惰性建）：数学实例产 HTML，math:false
 *  孪生实例取纯主题 css。 */
const marpCache = new Map<string, Marp>();

function getMarp(math: boolean, html: boolean): Marp {
  const key = `${math ? 1 : 0}${html ? 1 : 0}`;
  let marp = marpCache.get(key);
  if (!marp) {
    marp = createMarp(math, html);
    marpCache.set(key, marp);
  }
  return marp;
}

/** 站内图注入固有尺寸（src 以 / 开头 → public/ 下的文件）。deck 不走
 *  rehypeLocalImageSize 的 hast 管线，这里做字符串层等价物；markdown-it 产出
 *  的 <img> 属性形态可控（双引号、无尺寸）。 */
function injectLocalImageSizes(html: string): string {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = /src="([^"]+)"/.exec(tag)?.[1] ?? "";
    if (!src.startsWith("/")) {
      return tag;
    }
    let out = /\balt=/.test(tag) ? tag : tag.replace(/>$/, ' alt="">');
    try {
      const dim = imageSize(readFileSync(join(process.cwd(), "public", src)));
      out = out.replace(/\bsrc="[^"]*"/, (match) => `${match} width="${dim.width}" height="${dim.height}"`);
    } catch {
      // public/ 下找不到对应文件（外站图等），不注入尺寸
    }
    return out;
  });
}

/** 单页后处理：标题降级 → 代码重高亮 / mermaid 占位 → 图片尺寸 → 剥 id 加
 *  data-slide → 注入演讲者备注。三个站点缝经 options 生效。 */
function postProcessSlide(
  page: string,
  index: number,
  notes: readonly string[],
  options: Omit<Required<DeckCompileOptions>, "highlight"> & { highlight?: (lang: string, code: string) => string },
): string {
  let html = page;
  if (options.demoteHeadings) {
    // 页面 h1 属文章标题，幻灯片页题从 h2 起
    html = html.replace(
      /<(\/?)h([1-5])(?=[\s>])/g,
      (_match, slash: string, level: string) => `<${slash}h${Number(level) + 1}`,
    );
  }
  html = html.replace(
    /<pre><code(?: class="language-([\w#+.-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (match, lang: string | undefined, code: string) => {
      const decoded = decodeEntities(code);
      // mermaid 走站内同款占位容器：DeckViewer 挂 MermaidRenderer 惰性渲染，
      // 打印浅色联动自动生效（语法与文章词汇表一致）
      if (lang === "mermaid") {
        return `<div class="mermaid-placeholder" data-chart="${escapeAttr(decoded)}"></div>`;
      }
      // Typora sequence/flow：构建期翻译为 mermaid（与文章管线同款转换）
      if (lang === "sequence" || lang === "flow") {
        const chart = lang === "sequence" ? translateSequenceToMermaid(decoded) : translateFlowToMermaid(decoded);
        return `<div class="mermaid-placeholder" data-chart="${escapeAttr(chart)}"></div>`;
      }
      return options.highlight ? options.highlight(lang ?? "", decoded) : match;
    },
  );
  if (options.imageSizes) {
    html = injectLocalImageSizes(html);
  }
  // 任务清单复选框纯装饰，补 aria-hidden（与文章管线 compileMarkdown 同款）
  html = html.replace(/<input((?:(?!aria-hidden)[^>]*)?type="checkbox"[^>]*)>/g, '<input aria-hidden="true"$1>');
  html = html.replace(/^<section\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s+id="[^"]*"/g, "");
    return `<section data-slide="${index + 1}"${cleaned}>`;
  });
  // 正文包一层 .deck-body：播放器的溢出适配（deckFit）对它做等比缩放 +
  // 宽度补偿——固定 720px 画布上超高的页整页缩小落进画布，而不是被
  // overflow 裁掉。备注 aside 在 wrapper 之外（注入发生在其后）。
  html = html.replace(
    /^(<section\b[^>]*>)([\s\S]*)<\/section>\s*$/,
    (_match, open: string, inner: string) => `${open}<div class="deck-body">${inner}</div></section>`,
  );
  if (notes.length > 0) {
    const body = notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("");
    html = html.replace(/<\/section>\s*$/, `<aside class="deck-notes">${body}</aside></section>`);
  }
  return html;
}

/** Markdown（Marpit 方言）→ 逐页 HTML + 主题 CSS。渲染错误直接上抛构建失败
 *  （fail-closed，与站内管线的信任模型一致）；缺省选项 = 博客行为。 */
export function compileDeck(markdown: string, options: DeckCompileOptions = {}): DeckResult {
  const resolved: Omit<Required<DeckCompileOptions>, "highlight"> & {
    highlight?: (lang: string, code: string) => string;
  } = {
    html: options.html ?? true,
    // 博客缺省 = 站内 shiki 双主题（zjsearch 孪生文件无此导入，缺省保持
    // markdown-it 默认形态——站点缝在各自的调用缺省里）
    highlight: options.highlight ?? highlightCode,
    imageSizes: options.imageSizes ?? true,
    demoteHeadings: options.demoteHeadings ?? true,
  };
  // gray-matter 的 content 以换行开头，而 marpit 的 front-matter 插件要求
  // 指令块位于文档第 0 个字符——前导空白会让指令块漏解析，`---` 被当成
  // markdown 渲染（实测产生空页 + 指令段落被 underline 成标题）
  const source = markdown.replace(/^\s+/, "");
  const marp = getMarp(true, resolved.html);
  const { html: pages, comments } = marp.render(source, { htmlAsArray: true });
  const { css } = getMarp(false, resolved.html).render("");
  const list = Array.isArray(pages) ? pages : [pages];
  const slides = list.map((page, index) => postProcessSlide(page, index, comments[index] ?? [], resolved));
  return { slides, css, count: slides.length };
}

/** 嵌入形态（```marp fence）的占位结构：样式 + 幻灯片随 contentHtml 单份
 *  DOM 通道走；DeckViewer 从 .deck-embed 提取并重渲染增强版，无 JS 时本结构
 *  即完整可读的堆叠视图。@page 必须剥除——否则嵌在文章里的 deck 会在打印时
 *  劫持整页纸张尺寸。 */
export function renderDeckEmbed(result: DeckResult): string {
  const css = result.css.replace(/@page\s*\{[^}]*\}\s*/g, "");
  return `<div class="deck-embed"><style data-deck-css>${css}</style><div class="marpit deck-embed-body" data-deck-content>${result.slides.join("\n")}</div></div>`;
}

// 构建期幻灯片编译（Marpit）：整篇 deck 博文（frontmatter deck: true）与普通
// 正文的 ```marp fence 共用本模块。Marpit 是 markdown-it 系的独立方言——deck
// 内容不支持的站内扩展见文件尾的「方言边界」注释，已桥接的：mermaid（占位
// 容器 + 站内渲染器）、数学 KaTeX、callouts、==mark==、emoji、任务清单、
// 定义列表、sequence/flow（转 mermaid），产物是静态 <section> + 主题 CSS，
// 客户端零 Marp 代码（播放器见 features/deck）。
//
// 产物约定（与 src/features/deck/DeckViewer.tsx、pageData.ts 三方对齐）：
//   - section 的 id 一律剥掉换成 data-slide（多个 deck 同页会撞 duplicate-id
//     审计），标题整体降一级（h1 让给文章标题，heading-order 审计）；
//   - 代码块用站内 shiki 双主题重高亮，站内图注入固有尺寸（unsized-images
//     审计）；演讲者备注（HTML 注释）注入每页 .deck-notes；
//   - 嵌入形态的 CSS 剥掉 @page（否则会劫持文章打印的纸张尺寸）。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Marpit } from "@marp-team/marpit";
import { bareEmoji } from "@mdit/plugin-emoji";
import { katex } from "@mdit/plugin-katex";
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

const marpit = new Marpit({ markdown: { html: true } });
marpit.use(deckCallouts);
marpit.use(katex);
marpit.use(mark);
marpit.use(bareEmoji);
marpit.use(tasklist);
marpit.use(markdownItDeflist);
marpit.themeSet.default = marpit.themeSet.add(deckThemeCss);

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
 *  data-slide → 注入演讲者备注。 */
function postProcessSlide(page: string, index: number, notes: readonly string[]): string {
  let html = page
    // 页面 h1 属文章标题，幻灯片页题从 h2 起
    .replace(/<(\/?)h([1-5])(?=[\s>])/g, (_match, slash: string, level: string) => `<${slash}h${Number(level) + 1}`)
    .replace(
      /<pre><code(?: class="language-([\w#+.-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
      (_match, lang: string | undefined, code: string) => {
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
        return highlightCode(lang ?? "", decoded);
      },
    );
  html = injectLocalImageSizes(html);
  // 任务清单复选框纯装饰，补 aria-hidden（与文章管线 compileMarkdown 同款）
  html = html.replace(/<input((?:(?!aria-hidden)[^>]*)?type="checkbox"[^>]*)>/g, '<input aria-hidden="true"$1>');
  html = html.replace(/^<section\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s+id="[^"]*"/g, "");
    return `<section data-slide="${index + 1}"${cleaned}>`;
  });
  if (notes.length > 0) {
    const body = notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("");
    html = html.replace(/<\/section>\s*$/, `<aside class="deck-notes">${body}</aside></section>`);
  }
  return html;
}

/** Markdown（Marpit 方言）→ 逐页 HTML + 主题 CSS。渲染错误直接上抛构建失败
 *  （fail-closed，与站内管线的信任模型一致）。 */
export function compileDeck(markdown: string): DeckResult {
  // gray-matter 的 content 以换行开头，而 marpit 的 front-matter 插件要求
  // 指令块位于文档第 0 个字符——前导空白会让指令块漏解析，`---` 被当成
  // markdown 渲染（实测产生空页 + 指令段落被 underline 成标题）
  const source = markdown.replace(/^\s+/, "");
  const { html: pages, css, comments } = marpit.render(source, { htmlAsArray: true });
  const list = Array.isArray(pages) ? pages : [pages];
  const slides = list.map((page, index) => postProcessSlide(page, index, comments[index] ?? []));
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

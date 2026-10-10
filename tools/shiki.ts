// shiki 构建期语法高亮：双主题（defaultColor:false 输出 CSS 变量，prose.css /
// deck 主题按 html.dark 切换）。两个主题都是 WCAG 高对比变体，且站点代码底色
// 在各自基准底的有利方向上（浅态更浅 / 暗态更暗），全部语法色 AA 达标 —— 这是
// 审计门禁对代码文本的硬要求（普通暗色主题在浅暖底上必然失守）。
// 模块加载期 await 完成初始化（与 crypto 派生同一模式），此后调用路径全同步；
// content.ts 与 deck.ts 共用同一实例（同一 module graph 单例）。

import { createHighlighter } from "shiki";
import { escapeHtml } from "./html.ts";

export const SHIKI_LIGHT = "github-light-high-contrast";
export const SHIKI_DARK = "github-dark-high-contrast";
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

/** 单个代码块 → shiki 高亮 HTML。未识别语言回退纯 <pre><code>，不吞内容。 */
export function highlightCode(lang: string, code: string): string {
  const label = lang || "text";
  try {
    return highlighter
      .codeToHtml(code, {
        lang: label,
        themes: { light: SHIKI_LIGHT, dark: SHIKI_DARK },
        defaultColor: false,
      })
      .replace(/ tabindex="0"/g, "");
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

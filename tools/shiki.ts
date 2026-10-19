// shiki build-time syntax highlighting: dual theme (defaultColor:false emits
// CSS variables; prose.css / the deck theme switch on html.dark). Both themes
// are WCAG high-contrast variants, and the site's code background sits in the
// favorable direction of each baseline (lighter in light mode / darker in
// dark mode), so every syntax color passes AA — a hard requirement of the
// audit gate for code text (ordinary dark themes inevitably fail on a light
// warm background).
// Initialization is awaited at module load (same pattern as the crypto
// derivation); every call path is synchronous afterwards. content.ts and
// deck.ts share the same instance (a single module-graph singleton).

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

/** A single code block → shiki-highlighted HTML. Unrecognized languages fall
 *  back to plain <pre><code>, never swallowing the content. */
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

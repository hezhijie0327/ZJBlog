// KaTeX 样式按需补注：SSR 只对含公式页（needsKatex）注入 /katex.min.css；
// 客户端从无公式页 SPA 换页到含公式页时，head 不换——这里检测并补一次
// link（幂等）。文章（Prose）与 deck（DeckViewer）共用。

export function ensureKatexStyles(): void {
  if (document.querySelector("link[data-katex], style[data-katex]")) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/katex.min.css";
  link.dataset.katex = "true";
  document.head.appendChild(link);
}

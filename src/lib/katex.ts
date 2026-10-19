// On-demand KaTeX style top-up: SSR only injects /katex.min.css for pages containing
// formulas (needsKatex); when the client SPA-navigates from a formula-free page to one
// with formulas, head does not change — this detects that and adds the link once
// (idempotent). Shared by posts (Prose) and decks (DeckViewer).

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

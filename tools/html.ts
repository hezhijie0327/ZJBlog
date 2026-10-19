// Small HTML string utilities (a shared build-time leaf module, zero deps —
// both content.ts and deck.ts need it; placed here to avoid circular
// imports).

/** Decode character references emitted by rehype-stringify / markdown-it
 *  (the original text must be restored before feeding shiki / TOC text).
 *  Order-sensitive: resolve named/numeric entities first and &amp; last —
 *  otherwise "&amp;lt;" would be double-decoded into "<". */
export function decodeEntities(text: string): string {
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

export function escapeAttr(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

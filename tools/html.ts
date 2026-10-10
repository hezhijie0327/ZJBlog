// HTML 字符串小工具（构建期共用叶子模块，零依赖——content.ts 与 deck.ts
// 都要用，放这里避免循环导入）。

/** 解码 rehype-stringify / markdown-it 输出的字符引用（喂给 shiki / TOC 文本
 *  前必须还原原文）。顺序敏感：先解命名/数字实体，最后解 &amp; —— 否则
 *  "&amp;lt;" 会被二次解码成 "<"。 */
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

// 页面 payload 管道：构建期把整页状态以 JSON 嵌进
// `<script id="page-data" type="application/json">`；客户端导航 fetch 同一
// URL 并从 HTML 响应中提取 payload。
//
// 正文 HTML（contentHtml）是唯一例外：长文若同时进 DOM 和 page-data 会让
// 文档体积翻倍，因此 page-data 里不含它 —— 正文单份存于 DOM，首帧从当前
// 文档读回、SPA 换页时从 fetch 到的文档解析（见 attachProseHtml）。

import { type AnyPageData, isBlogPostData, isProjectData } from "@/lib/types.ts";

/** 正文单份存于 DOM：把 .prose 的 innerHTML 注回 payload（就地补齐）。 */
function attachProseHtml(doc: Document, data: AnyPageData): AnyPageData {
  if (isBlogPostData(data) && data.post.contentHtml === undefined) {
    const html = doc.querySelector(".prose")?.innerHTML;
    if (html !== undefined) {
      return { ...data, post: { ...data.post, contentHtml: html } };
    }
  }
  if (isProjectData(data) && data.project.contentHtml === undefined) {
    const html = doc.querySelector(".prose")?.innerHTML;
    if (html !== undefined) {
      return { ...data, project: { ...data.project, contentHtml: html } };
    }
  }
  return data;
}

export function parseEmbeddedPageData(): AnyPageData | null {
  const el = document.getElementById("page-data");
  const text = el?.textContent?.trim();
  if (!text) {
    return null;
  }
  try {
    return attachProseHtml(document, JSON.parse(text) as AnyPageData);
  } catch {
    return null;
  }
}

export function extractPageData(html: string): AnyPageData {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.getElementById("page-data")?.textContent?.trim();
  if (!text) {
    throw new Error("page-data missing in response");
  }
  return attachProseHtml(doc, JSON.parse(text) as AnyPageData);
}

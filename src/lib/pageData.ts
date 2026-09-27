// 页面 payload 管道：构建期把整页状态以 JSON 嵌进
// `<script id="page-data" type="application/json">`；客户端导航 fetch 同一
// URL 并从 HTML 响应中提取 payload。
//
// 大体积字段（正文 contentHtml / 旅行地图 mapSvg）是例外：若同时进 DOM 和
// page-data 会让文档体积翻倍，因此 page-data 里不含它们 —— 单份存于 DOM，
// 首帧从当前文档读回、SPA 换页时从 fetch 到的文档解析（见 attachProseHtml）。

import { type AnyPageData, isBlogPostData, isProjectData, isTravelsData } from "@/lib/types.ts";

/** 单份存于 DOM 的字段就地注回 payload。加密博文跳过：锁屏页没有正文
 *  DOM，锁定 payload 永远不该被回填。 */
function attachProseHtml(doc: Document, data: AnyPageData): AnyPageData {
  if (isBlogPostData(data) && data.post.contentHtml === undefined && data.post.locked === undefined) {
    const html = doc.querySelector(".prose")?.innerHTML;
    if (html !== undefined) {
      return { ...data, post: { ...data.post, contentHtml: html } };
    }
  }
  if (isTravelsData(data) && data.mapSvg === undefined) {
    const mapSvg = doc.getElementById("travel-map")?.innerHTML;
    if (mapSvg !== undefined && mapSvg !== "") {
      return { ...data, mapSvg };
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

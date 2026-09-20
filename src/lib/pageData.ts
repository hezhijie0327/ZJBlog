// 页面 payload 管道：构建期把整页状态以 JSON 嵌进
// `<script id="page-data" type="application/json">`；客户端导航 fetch 同一
// URL 并从 HTML 响应中提取 payload。

import type { AnyPageData } from "@/lib/types.ts";

export function parseEmbeddedPageData(): AnyPageData | null {
  const el = document.getElementById("page-data");
  const text = el?.textContent?.trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as AnyPageData;
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
  return JSON.parse(text) as AnyPageData;
}

// 启动引导：解析页面内嵌 payload → React 接管 #app。
// 用 hydrateRoot 复用预渲染 DOM（不用 createRoot 重建 —— 那会先清空文档，
// 页脚等远端内容短暂坍缩回视口再弹回，产生 0.25 的 CLS）。要求首帧渲染
// 与 SSR 完全一致：任何依赖浏览器状态的 UI 都必须在挂载后才分化。

import { hydrateRoot } from "react-dom/client";
import { App } from "@/app.tsx";
import { parseEmbeddedPageData } from "@/lib/pageData.ts";
import { watchSystemTheme } from "@/lib/theme.ts";
import "./styles/global.css";

const container = document.getElementById("app");
if (container) {
  watchSystemTheme();
  hydrateRoot(container, <App initialData={parseEmbeddedPageData()} />);
}

// 页面注册表：每条路由（含首页）一个 chunk，入口 bundle 只留 Shell。
// pageLoaders 是唯一的 chunk 加载来源：首帧水合前预取（main.tsx）、站内换页
// 预取（router onPageData）与 React.lazy 分发（app.tsx）共用，保证每块只取一次；
// Suspense 骨架只在 chunk 未就绪时兜底。

import { lazy } from "react";
import type { AnyPageData } from "@/lib/types.ts";

export const pageLoaders = {
  home: () => import("@/pages/IndexPage.tsx"),
  blogs: () => import("@/pages/BlogsPage.tsx"),
  "blog-post": () => import("@/pages/BlogPostPage.tsx"),
  "blog-tag": () => import("@/pages/BlogTagPage.tsx"),
  projects: () => import("@/pages/ProjectsPage.tsx"),
  project: () => import("@/pages/ProjectPage.tsx"),
  archives: () => import("@/pages/ArchivesPage.tsx"),
  support: () => import("@/pages/SupportPage.tsx"),
  og: () => import("@/pages/OgPage.tsx"),
} as const;

export type LoadablePage = keyof typeof pageLoaders;

/** payload 到手即预取对应 chunk（渲染前），让骨架尽量不出现。 */
export function preloadPage(data: AnyPageData): void {
  const { page } = data.globals;
  if (page !== "not-found") {
    void pageLoaders[page]();
  }
}

/** URL → 页面 chunk（路由模式表；顺序敏感，具体路径先于列表路径匹配）。 */
const ROUTE_PATTERNS: ReadonlyArray<readonly [RegExp, LoadablePage]> = [
  [/^\/blogs\/tags\/[^/]+\/$/, "blog-tag"],
  [/^\/blogs\/[^/]+\/$/, "blog-post"],
  [/^\/blogs\/$/, "blogs"],
  [/^\/projects\/[^/]+\/$/, "project"],
  [/^\/projects\/$/, "projects"],
  [/^\/archives\/$/, "archives"],
  [/^\/support\/$/, "support"],
  [/^\/og\/$/, "og"],
  [/^\/$/, "home"],
];

/** hover/focus 预取：站内链接悬停即热身目标 chunk（pageLoaders 天然去重）。 */
export function prefetchHref(href: string): void {
  if (typeof window === "undefined") {
    return;
  }
  let pathname: string;
  try {
    pathname = new URL(href, window.location.href).pathname;
  } catch {
    return;
  }
  for (const [pattern, kind] of ROUTE_PATTERNS) {
    if (pattern.test(pathname)) {
      void pageLoaders[kind]();
      return;
    }
  }
}

export const LazyIndexPage = lazy(async () => ({ default: (await pageLoaders.home()).IndexPage }));
export const LazyBlogsPage = lazy(async () => ({ default: (await pageLoaders.blogs()).BlogsPage }));
export const LazyBlogPostPage = lazy(async () => ({ default: (await pageLoaders["blog-post"]()).BlogPostPage }));
export const LazyBlogTagPage = lazy(async () => ({ default: (await pageLoaders["blog-tag"]()).BlogTagPage }));
export const LazyProjectsPage = lazy(async () => ({ default: (await pageLoaders.projects()).ProjectsPage }));
export const LazyProjectPage = lazy(async () => ({ default: (await pageLoaders.project()).ProjectPage }));
export const LazyArchivesPage = lazy(async () => ({ default: (await pageLoaders.archives()).ArchivesPage }));
export const LazySupportPage = lazy(async () => ({ default: (await pageLoaders.support()).SupportPage }));
export const LazyOgPage = lazy(async () => ({ default: (await pageLoaders.og()).OgPage }));

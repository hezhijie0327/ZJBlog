// Page registry: one chunk per route (home included); the entry bundle keeps only the Shell.
// pageLoaders is the single source of chunk loading: shared by the pre-hydration first-frame
// prefetch (main.tsx), in-app navigation prefetch (router onPageData), and the React.lazy
// dispatch (app.tsx), guaranteeing each chunk is fetched exactly once; the Suspense skeleton
// only covers chunks that are not yet ready.

import { lazy } from "react";
import type { AnyPageData } from "@/lib/types.ts";

export const pageLoaders = {
  home: () => import("@/pages/IndexPage.tsx"),
  blogs: () => import("@/pages/BlogsPage.tsx"),
  "blog-post": () => import("@/pages/BlogPostPage.tsx"),
  "blog-tag": () => import("@/pages/BlogTagPage.tsx"),
  travels: () => import("@/pages/TravelsPage.tsx"),
  travel: () => import("@/pages/TravelPage.tsx"),
  projects: () => import("@/pages/ProjectsPage.tsx"),
  project: () => import("@/pages/ProjectPage.tsx"),
  archives: () => import("@/pages/ArchivesPage.tsx"),
  support: () => import("@/pages/SupportPage.tsx"),
  og: () => import("@/pages/OgPage.tsx"),
} as const;

type LoadablePage = keyof typeof pageLoaders;

/** Prefetches the matching chunk as soon as the payload arrives (before render), keeping the
 *  skeleton from showing as much as possible. */
export function preloadPage(data: AnyPageData): void {
  const { page } = data.globals;
  if (page !== "not-found") {
    void pageLoaders[page]();
  }
}

/** URL → page chunk (route pattern table; order-sensitive, specific paths match before
 *  listing paths). */
const ROUTE_PATTERNS: ReadonlyArray<readonly [RegExp, LoadablePage]> = [
  [/^\/blogs\/tags\/[^/]+\/$/, "blog-tag"],
  [/^\/blogs\/[^/]+\/$/, "blog-post"],
  [/^\/blogs\/$/, "blogs"],
  [/^\/travels\/[^/]+\/$/, "travel"],
  [/^\/travels\/$/, "travels"],
  [/^\/projects\/[^/]+\/$/, "project"],
  [/^\/projects\/$/, "projects"],
  [/^\/archives\/$/, "archives"],
  [/^\/support\/$/, "support"],
  [/^\/og\/$/, "og"],
  [/^\/$/, "home"],
];

/** hover/focus prefetch: hovering an in-site link warms up the target chunk (pageLoaders
 *  dedupes naturally). */
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
export const LazyTravelsPage = lazy(async () => ({ default: (await pageLoaders.travels()).TravelsPage }));
export const LazyTravelPage = lazy(async () => ({ default: (await pageLoaders.travel()).TravelPage }));
export const LazyProjectsPage = lazy(async () => ({ default: (await pageLoaders.projects()).ProjectsPage }));
export const LazyProjectPage = lazy(async () => ({ default: (await pageLoaders.project()).ProjectPage }));
export const LazyArchivesPage = lazy(async () => ({ default: (await pageLoaders.archives()).ArchivesPage }));
export const LazySupportPage = lazy(async () => ({ default: (await pageLoaders.support()).SupportPage }));
export const LazyOgPage = lazy(async () => ({ default: (await pageLoaders.og()).OgPage }));

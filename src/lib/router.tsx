// Lightweight SPA router (fetch-and-swap): every route is fully prerendered HTML;
// in-site navigation fetches the target URL, extracts the page-data payload from the
// returned HTML, and pushState-swaps the page. Network-level failures fall back to a
// full page load.
//
// Session-level payload cache (payloads are immutable build artifacts): forward/back and
// revisits cost zero requests; scrollRestoration is taken over manually (the browser's
// automatic restore happens before the swap, so the position is guaranteed wrong); after
// navigation, focus moves to the main h1 so screen-reader and keyboard users can perceive
// that the page changed.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { extractPageData } from "@/lib/pageData.ts";
import type { AnyPageData } from "@/lib/types.ts";

interface RouterContextValue {
  data: AnyPageData | null;
  loading: boolean;
  error: string | null;
  /** In-site navigation; falls back to a full page load on failure. */
  navigate: (url: string) => void;
  /** Current full href (including origin), for nav highlighting and the like. */
  href: string;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/** Key for cache / scroll positions: pathname + search (hash stripped, stable across encodings). */
function routeKey(value: string): string {
  const url = new URL(value, window.location.href);
  return `${url.pathname}${url.search}`;
}

/** Sync the document head on client-side navigation: title + description (crawlers read the prerendered HTML; this serves users). */
function applyDocumentHead(data: AnyPageData) {
  document.title = data.globals.title;
  const description = document.querySelector('meta[name="description"]');
  description?.setAttribute("content", data.globals.description);
}

/** Move focus to the page heading (falls back to main when no h1). preventScroll: scrolling is owned by the router. */
function focusPageHeading() {
  const target = document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("main");
  if (!target) {
    return;
  }
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}

/** Session-level payload cache: module-scoped, survives page switches. */
const payloadCache = new Map<string, AnyPageData>();
/** Scroll position when leaving a page (routeKey → scrollY). */
const scrollPositions = new Map<string, number>();

export function RouterProvider({
  initialData,
  onPageData,
  children,
}: {
  initialData: AnyPageData | null;
  /** Callback after payload extraction, before render (prefetches the target page chunk so the Suspense skeleton shows as little as possible). */
  onPageData?: (data: AnyPageData) => void;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<AnyPageData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // SSR (prerender/dev SSR) has no window; use "/" as a placeholder and take the real href at client startup
  const [href, setHref] = useState(() => (typeof window !== "undefined" ? window.location.href : "/"));
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  // The browser's "auto" restore runs on the old page (swapping is async), so the position is guaranteed wrong — take over manually in full
  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  const load = useCallback(
    async (url: string, historyMode: "push" | "none" = "push") => {
      const seq = ++seqRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const key = routeKey(url);
      const cached = payloadCache.get(key);

      const finish = (pageData: AnyPageData) => {
        if (seq !== seqRef.current) {
          return; // superseded by a newer navigation
        }
        onPageData?.(pageData);
        if (historyMode !== "none") {
          // payloads do not go into history state: data lives in React state, popstate re-fetches by URL (hitting the cache)
          window.history.pushState(null, "", url);
        }
        setHref(new URL(url, window.location.href).href);
        setData(pageData);
        setLoading(false);
        applyDocumentHead(pageData);
        if (historyMode === "none") {
          // Forward/back: restore the reading position from when we left
          window.scrollTo(0, scrollPositions.get(key) ?? 0);
        } else {
          window.scrollTo(0, 0);
        }
        focusPageHeading();
      };

      // Session cache hit: instant page swap with zero requests
      if (cached) {
        finish(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "text/html" },
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        const html = await resp.text();
        const pageData = extractPageData(html);
        payloadCache.set(key, pageData);
        finish(pageData);
      } catch (err) {
        if (controller.signal.aborted || seq !== seqRef.current) {
          return;
        }
        // Network/CORS failure: full page load as the fallback
        if (err instanceof TypeError) {
          window.location.assign(url);
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    },
    [onPageData],
  );

  const navigate = useCallback(
    (url: string) => {
      if (url === window.location.href) {
        return;
      }
      // Record the leaving page's reading position (restored on forward/back)
      scrollPositions.set(routeKey(window.location.href), window.scrollY);
      void load(url, "push");
    },
    [load],
  );

  const hrefRef = useRef(href);
  hrefRef.current = href;

  useEffect(() => {
    const onPopState = () => {
      // Ignore hash-only changes
      const stripHash = (value: string) => {
        const url = new URL(value);
        url.hash = "";
        return url.href;
      };
      if (stripHash(window.location.href) === stripHash(hrefRef.current)) {
        return;
      }
      void load(window.location.href, "none");
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      abortRef.current?.abort();
    };
  }, [load]);

  return <RouterContext.Provider value={{ data, loading, error, navigate, href }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter outside of RouterProvider");
  }
  return ctx;
}

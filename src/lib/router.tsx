// 轻量 SPA 路由（ZJSearch 同款 fetch-and-swap）：每条路由都是完整预渲染
// HTML；站内导航 fetch 目标 URL，从返回的 HTML 提取 page-data payload，
// pushState 换页。网络级失败回退整页加载。

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { extractPageData } from "@/lib/pageData.ts";
import type { AnyPageData } from "@/lib/types.ts";

export interface NavigateOptions {
  replace?: boolean;
}

interface RouterContextValue {
  data: AnyPageData | null;
  loading: boolean;
  error: string | null;
  /** 站内导航；失败时回退整页加载。 */
  navigate: (url: string, options?: NavigateOptions) => void;
  /** 重新拉取当前 URL。 */
  reload: () => void;
  /** 当前完整 href（含 origin），供导航高亮等使用。 */
  href: string;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/** 换页时同步文档头：title + description（爬虫看预渲染 HTML，这里服务用户）。 */
function applyDocumentHead(data: AnyPageData) {
  document.title = data.globals.title;
  const description = document.querySelector('meta[name="description"]');
  description?.setAttribute("content", data.globals.description);
}

export function RouterProvider({
  initialData,
  onPageData,
  children,
}: {
  initialData: AnyPageData | null;
  /** payload 提取后、渲染前回调（预取目标页 chunk，让 Suspense 骨架尽量不出现）。 */
  onPageData?: (data: AnyPageData) => void;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<AnyPageData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // SSR（预渲染/dev SSR）无 window，以 "/" 占位；客户端启动即取真实 href
  const [href, setHref] = useState(() => (typeof window !== "undefined" ? window.location.href : "/"));
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const load = useCallback(
    async (url: string, historyMode: "push" | "replace" | "none" = "push") => {
      const seq = ++seqRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
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
        if (seq !== seqRef.current) {
          return; // 已被更新的导航取代
        }
        onPageData?.(pageData);
        if (historyMode !== "none") {
          // payload 不进 history state：数据在 React 状态里，popstate 按 URL 重取
          window.history[historyMode === "replace" ? "replaceState" : "pushState"](null, "", url);
        }
        setHref(new URL(url, window.location.href).href);
        setData(pageData);
        setLoading(false);
        applyDocumentHead(pageData);
        // 有意立即跳顶（"auto" 不与 reduced-motion 对抗）
        window.scrollTo(0, 0);
      } catch (err) {
        if (controller.signal.aborted || seq !== seqRef.current) {
          return;
        }
        // 网络/CORS 失败：整页加载兜底
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
    (url: string, options?: NavigateOptions) => {
      if (url === window.location.href) {
        return;
      }
      void load(url, options?.replace ? "replace" : "push");
    },
    [load],
  );

  const reload = useCallback(() => {
    void load(window.location.href, "none");
  }, [load]);

  const hrefRef = useRef(href);
  hrefRef.current = href;

  useEffect(() => {
    const onPopState = () => {
      // 忽略纯 hash 变化
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

  return (
    <RouterContext.Provider value={{ data, loading, error, navigate, reload, href }}>{children}</RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouter outside of RouterProvider");
  }
  return ctx;
}

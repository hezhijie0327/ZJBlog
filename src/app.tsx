// 应用组装：Provider 树 + payload 分发（判别联合 switch）。
// 所有页面（含首页）按页分块（pages/registry.ts）；SSR/预渲染传 syncPages
// 同步渲染真实内容，客户端首帧经 main.tsx 预取 chunk 后水合，站内换页由
// Suspense 骨架兜底。404 体积小，保持急加载。

import { LoaderCircle } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette.tsx";
import { Shell } from "@/components/Shell.tsx";
import { I18nContext, readLocalePreference, storeLocalePreference, type UiLocale } from "@/lib/i18n.ts";
import { RouterProvider, useRouter } from "@/lib/router.tsx";
import type { AnyPageData, SyncPages } from "@/lib/types.ts";
import {
  isArchivesData,
  isBlogPostData,
  isBlogsData,
  isHomeData,
  isProjectData,
  isProjectsData,
  isSupportData,
} from "@/lib/types.ts";
import { NotFoundPage } from "@/pages/NotFoundPage.tsx";
import {
  LazyArchivesPage,
  LazyBlogPostPage,
  LazyBlogsPage,
  LazyIndexPage,
  LazyProjectPage,
  LazyProjectsPage,
  LazySupportPage,
  preloadPage,
} from "@/pages/registry.ts";

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin-slow text-ink-3" />
    </div>
  );
}

function Pages({ syncPages }: { syncPages?: SyncPages }) {
  const { data, error } = useRouter();

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-sm text-ink-2">{error ?? "…"}</p>
      </div>
    );
  }

  // payload 分发（类型守卫见 lib/types.ts）；syncPages 有值 = 服务端，同步
  // 组件渲染真实内容（renderToString 等不了 lazy），否则走分块 + Suspense。
  if (isHomeData(data)) {
    const Sync = syncPages?.home;
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyIndexPage data={data} />}</Suspense>
    );
  }
  if (isBlogsData(data)) {
    const Sync = syncPages?.blogs;
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyBlogsPage data={data} />}</Suspense>
    );
  }
  if (isBlogPostData(data)) {
    const Sync = syncPages?.["blog-post"];
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyBlogPostPage data={data} />}</Suspense>
    );
  }
  if (isProjectsData(data)) {
    const Sync = syncPages?.projects;
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyProjectsPage data={data} />}</Suspense>
    );
  }
  if (isProjectData(data)) {
    const Sync = syncPages?.project;
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyProjectPage data={data} />}</Suspense>
    );
  }
  if (isArchivesData(data)) {
    const Sync = syncPages?.archives;
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyArchivesPage data={data} />}</Suspense>
    );
  }
  if (isSupportData(data)) {
    const Sync = syncPages?.support;
    return <Suspense fallback={<PageFallback />}>{Sync ? <Sync /> : <LazySupportPage />}</Suspense>;
  }
  return <NotFoundPage />;
}

export function App({
  initialData,
  syncPages,
}: {
  initialData: AnyPageData | null;
  /** SSR/预渲染的同步页面组件表；客户端不传，走 registry 分块。 */
  syncPages?: SyncPages;
}) {
  // UI 语言默认跟随 payload（zh-CN，与预渲染一致保证水合无差）；挂载后从
  // localStorage 校正一次用户偏好（与 ThemeToggle 同款模式——无法 pre-paint，
  // 英文偏好用户会有一帧中文闪烁）。切换即时生效并同步 <html lang>。
  const [locale, setLocale] = useState<UiLocale>(initialData?.globals.locale ?? "zh-CN");
  useEffect(() => {
    const stored = readLocalePreference();
    document.documentElement.lang = stored === "en" ? "en" : "zh";
    setLocale((current) => (stored === current ? current : stored));
  }, []);

  const switchLocale = useCallback(() => {
    const next = locale === "zh-CN" ? "en" : "zh-CN";
    storeLocalePreference(next);
    document.documentElement.lang = next === "en" ? "en" : "zh";
    setLocale(next);
  }, [locale]);

  const i18n = useMemo(() => ({ locale, switchLocale }), [locale, switchLocale]);

  return (
    <I18nContext.Provider value={i18n}>
      <RouterProvider initialData={initialData} onPageData={preloadPage}>
        <Shell>
          <Pages syncPages={syncPages} />
        </Shell>
        <CommandPalette />
      </RouterProvider>
    </I18nContext.Provider>
  );
}

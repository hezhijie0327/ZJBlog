// 应用组装：Provider 树 + payload 分发（判别联合 switch）。
// 所有页面（含首页）按页分块（pages/registry.ts）；SSR/预渲染传 syncPages
// 同步渲染真实内容，客户端首帧经 main.tsx 预取 chunk 后水合，站内换页由
// Suspense 骨架兜底。404 体积小，保持急加载。

import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";
import { CommandPalette } from "@/components/CommandPalette.tsx";
import { Shell } from "@/components/Shell.tsx";
import { I18nContext } from "@/lib/i18n.ts";
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
  const locale = initialData?.globals.locale ?? "zh-CN";
  return (
    <I18nContext.Provider value={locale}>
      <RouterProvider initialData={initialData} onPageData={preloadPage}>
        <Shell>
          <Pages syncPages={syncPages} />
        </Shell>
        <CommandPalette />
      </RouterProvider>
    </I18nContext.Provider>
  );
}

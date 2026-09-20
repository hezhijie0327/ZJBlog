// 应用组装：Provider 树 + payload 分发（判别联合 switch）。
// 首页与 404 急加载，其余页面经 lazyPages 按需取块。

import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";
import { CommandPalette } from "@/components/CommandPalette.tsx";
import { Shell } from "@/components/Shell.tsx";
import { I18nContext } from "@/lib/i18n.ts";
import { RouterProvider, useRouter } from "@/lib/router.tsx";
import type { AnyPageData } from "@/lib/types.ts";
import {
  isArchivesData,
  isBlogPostData,
  isBlogsData,
  isDonationData,
  isHomeData,
  isProjectData,
  isProjectsData,
} from "@/lib/types.ts";
import { IndexPage } from "@/pages/IndexPage.tsx";
import { ArchivesPage, BlogPostPage, BlogsPage, DonationPage, ProjectPage, ProjectsPage } from "@/pages/lazyPages.ts";
import { NotFoundPage } from "@/pages/NotFoundPage.tsx";

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin-slow text-ink-3" />
    </div>
  );
}

function Pages() {
  const { data, error } = useRouter();

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-sm text-ink-2">{error ?? "…"}</p>
      </div>
    );
  }

  // payload 分发（类型守卫见 lib/types.ts）
  if (isHomeData(data)) {
    return <IndexPage data={data} />;
  }
  if (isBlogsData(data)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <BlogsPage data={data} />
      </Suspense>
    );
  }
  if (isBlogPostData(data)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <BlogPostPage data={data} />
      </Suspense>
    );
  }
  if (isProjectsData(data)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ProjectsPage data={data} />
      </Suspense>
    );
  }
  if (isProjectData(data)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ProjectPage data={data} />
      </Suspense>
    );
  }
  if (isArchivesData(data)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <ArchivesPage data={data} />
      </Suspense>
    );
  }
  if (isDonationData(data)) {
    return (
      <Suspense fallback={<PageFallback />}>
        <DonationPage />
      </Suspense>
    );
  }
  return <NotFoundPage />;
}

export function App({ initialData }: { initialData: AnyPageData | null }) {
  const locale = initialData?.globals.locale ?? "zh-CN";
  return (
    <I18nContext.Provider value={locale}>
      <RouterProvider initialData={initialData}>
        <Shell>
          <Pages />
        </Shell>
        <CommandPalette />
      </RouterProvider>
    </I18nContext.Provider>
  );
}

// App assembly: Provider tree + payload dispatch (discriminated-union switch).
// All pages (including home) are chunked per page (pages/registry.ts); SSR/prerender pass
// syncPages to render real content synchronously, the client's first frame hydrates after
// prefetching the chunk via main.tsx, and in-site navigation falls back to the Suspense
// skeleton. 404 is small; keep it eagerly loaded.

import { LoaderCircle } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette.tsx";
import { Shell } from "@/components/Shell.tsx";
import type { StringKey } from "@/lib/i18n/en.ts";
import {
  I18nContext,
  readLocalePreference,
  storeLocalePreference,
  translateFor,
  type UiLocale,
  useLocale,
} from "@/lib/i18n.ts";
import { RouterProvider, useRouter } from "@/lib/router.tsx";
import type { AnyPageData, PageKind, SyncPages } from "@/lib/types.ts";
import {
  isArchivesData,
  isBlogPostData,
  isBlogsData,
  isBlogTagData,
  isHomeData,
  isOgData,
  isProjectData,
  isProjectsData,
  isSupportData,
  isTravelData,
  isTravelsData,
} from "@/lib/types.ts";
import { NotFoundPage } from "@/pages/NotFoundPage.tsx";
import {
  LazyArchivesPage,
  LazyBlogPostPage,
  LazyBlogsPage,
  LazyBlogTagPage,
  LazyIndexPage,
  LazyOgPage,
  LazyProjectPage,
  LazyProjectsPage,
  LazySupportPage,
  LazyTravelPage,
  LazyTravelsPage,
  preloadPage,
} from "@/pages/registry.ts";

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin-slow text-ink-3" />
    </div>
  );
}

// Pages whose tab titles follow the UI language: the prerendered document.title is the
// zh-CN baseline (globals.title is baked at build time); EN-preference users get it
// rewritten with the current wordbook after hydration correction and on every navigation.
// Only covers list/utility pages whose titles come from the wordbook; content pages
// (posts/travels/project details/tags) have author-original titles, and home + 404 read
// the same in both languages — all keep the original payload values.
const PAGE_TITLE_KEYS: Partial<Record<PageKind, StringKey>> = {
  archives: "page.archives.title",
  blogs: "page.blogs.title",
  projects: "page.projects.title",
  support: "page.support.title",
  travels: "page.travels.title",
};

/** Zero-render component mounted inside the Router: rewrites document.title when locale ≠ the payload baseline (zh-CN). */
function DocumentTitleSync() {
  const { data } = useRouter();
  const locale = useLocale();
  useEffect(() => {
    if (!data || locale === data.globals.locale) {
      return;
    }
    const key = PAGE_TITLE_KEYS[data.globals.page];
    if (key) {
      document.title = `${translateFor(locale)(key)} | ${data.globals.siteName}`;
    }
  }, [data, locale]);
  return null;
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

  // Payload dispatch (type guards in lib/types.ts); syncPages present = server side,
  // where sync components render real content (renderToString cannot await lazy),
  // otherwise chunking + Suspense.
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
    // key per slug: the page component instance persists across same-kind SPA navigation,
    // and per-post state (the unlocked plaintext bundle, lightbox) must not leak into the
    // next post; remounting also re-reads the session unlock cache for the new slug
    const Sync = syncPages?.["blog-post"];
    return (
      <Suspense fallback={<PageFallback />}>
        {Sync ? <Sync data={data} /> : <LazyBlogPostPage data={data} key={data.post.slug} />}
      </Suspense>
    );
  }
  if (isBlogTagData(data)) {
    const Sync = syncPages?.["blog-tag"];
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyBlogTagPage data={data} />}</Suspense>
    );
  }
  if (isTravelsData(data)) {
    const Sync = syncPages?.travels;
    return (
      <Suspense fallback={<PageFallback />}>{Sync ? <Sync data={data} /> : <LazyTravelsPage data={data} />}</Suspense>
    );
  }
  if (isTravelData(data)) {
    // Same per-item remount as blog posts above (locked-trip plaintext must not leak)
    const Sync = syncPages?.travel;
    return (
      <Suspense fallback={<PageFallback />}>
        {Sync ? <Sync data={data} /> : <LazyTravelPage data={data} key={data.trip.slug} />}
      </Suspense>
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
  if (isOgData(data)) {
    const Sync = syncPages?.og;
    return <Suspense fallback={<PageFallback />}>{Sync ? <Sync /> : <LazyOgPage />}</Suspense>;
  }
  return <NotFoundPage />;
}

export function App({
  initialData,
  syncPages,
}: {
  initialData: AnyPageData | null;
  /** Sync page component table for SSR/prerender; the client omits it and uses registry chunking. */
  syncPages?: SyncPages;
}) {
  // The UI language initially follows the payload (zh-CN, matching prerender so hydration
  // has no mismatch); after mount the user preference is corrected once from localStorage
  // (same pattern as ThemeToggle — it cannot run pre-paint, so EN-preference users see one
  // frame of Chinese flash). Switching takes effect immediately and syncs <html lang>.
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
        <DocumentTitleSync />
        <Shell>
          <Pages syncPages={syncPages} />
        </Shell>
        <CommandPalette />
      </RouterProvider>
    </I18nContext.Provider>
  );
}

// giscus comments (powered by GitHub Discussions): the iframe mounts only on
// entering the viewport (the same lazy strategy as MermaidRenderer — zero
// requests on first paint, nothing injected during audit load). With
// incomplete config (siteConfig.giscus.categoryId empty), a placeholder card
// renders instead of an invalid iframe.
//
// Light/dark coupling: the theme prop is bound to html.dark (both in-site and
// system switches flip it); when the prop changes, @giscus/react postMessages
// setConfig to the iframe and giscus swaps its self-hosted theme stylesheet
// in place — no iframe remount, drafts survive (same approach as Justin3go's
// VitePress integration). On SPA navigation the pathname becomes the key to
// force a remount, so the iframe loads the matching discussion for the new
// path.

import Giscus from "@giscus/react";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useLocale, useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { CARD } from "@/lib/styles.ts";
import { watchThemeDark } from "@/lib/theme.ts";
import { useInView } from "@/lib/useInView.ts";

export function GiscusComments() {
  const t = useT();
  const locale = useLocale();
  const { href } = useRouter();
  // On SPA navigation the pathname changes while this component stays mounted
  // — use the pathname as the giscus widget key to force a remount, so the
  // iframe loads the matching discussion for the new path
  const pathname = new URL(href, "http://localhost").pathname;
  // Mounting starts only on entering the viewport (with a 300px buffer)
  const { ref: containerRef, inView: visible } = useInView<HTMLElement>({ once: true });
  // Mirror of html.dark, the site's single source of truth: the initial value
  // must be computable during SSR too, so guard window before reading the DOM
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const { repo, repoId, category, categoryId } = siteConfig.giscus;
  const configured = Boolean(repo && repoId && category && categoryId);

  // Theme coupling: html.dark flips (in-site or system switch) → theme prop
  // updates → @giscus/react internally postMessages setConfig and the iframe
  // swaps its theme stylesheet in place
  useEffect(() => watchThemeDark(setDark), []);

  // Self-hosted theme CSS (maps the site token palette, see
  // public/giscus-*.css): giscus loads custom themes by full URL, and a
  // cross-origin iframe needs an absolute address. window exists only in the
  // browser — touching it during render crashes the whole SSR tree into
  // client rendering (.prose is never persisted, body injection breaks its
  // chain, article pages go fully blank); an empty string is fine under SSR
  // because the iframe only mounts after visible is true (browser-only).
  const theme = typeof window === "undefined" ? "" : `${window.location.origin}/giscus-${dark ? "dark" : "light"}.css`;

  return (
    <section className="print-hide mt-14 border-t border-line pt-8" ref={containerRef}>
      {/* The article title is the h1 and comments are a secondary section, so
          an h2 keeps the heading hierarchy continuous */}
      <h2 className="mb-6 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
        <MessageSquare aria-hidden="true" className="size-4 text-ink-3" />
        {t("comments.title")}
      </h2>
      {!configured ? (
        <div className={cn(CARD, "px-6 py-8 text-center")}>
          <p className="font-serif text-base font-semibold text-ink">{t("comments.notConfigured")}</p>
          <p className="mt-2 text-sm text-ink-2">{t("comments.notConfiguredBlurb")}</p>
        </div>
      ) : (
        visible && (
          <Giscus
            category={category}
            categoryId={categoryId}
            emitMetadata="0"
            inputPosition="top"
            // The key holds only the path: navigation remounts the whole
            // widget to load the matching discussion. Light/dark goes through
            // the theme prop's postMessage coupling, not the key — toggling
            // never remounts the iframe
            key={pathname}
            lang={locale}
            mapping="pathname"
            reactionsEnabled="1"
            repo={repo}
            repoId={repoId}
            strict="0"
            theme={theme}
          />
        )
      )}
    </section>
  );
}

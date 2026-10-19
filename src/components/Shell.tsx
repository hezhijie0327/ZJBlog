// Page shell: SPA Link (intercepts internal navigation + hover prefetch) +
// top loading progress bar + Shell (skip link / navigation / main / footer +
// floating back-to-top).

import type { MouseEvent, ReactNode } from "react";
import { BackToTop } from "@/components/BackToTop.tsx";
import { Footer } from "@/components/Footer.tsx";
import { Navigation } from "@/components/Navigation.tsx";
import { useT } from "@/lib/i18n.ts";
import { isModifiedClick } from "@/lib/link.ts";
import { useRouter } from "@/lib/router.tsx";
import { prefetchHref } from "@/pages/registry.ts";

/** Anchor: internal URLs go through SPA navigation; everything else (external
 * links / extension-bearing ones like /rss.xml) uses the default behavior. */
export function Link({
  href,
  children,
  className,
  ariaLabel,
  ariaCurrent,
  title,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  /** Current-item marker (navigation active state), e.g. aria-current="page" */
  ariaCurrent?: "page" | "location" | "step" | "true";
  title?: string;
  /** Additional click callback (e.g. closing the mobile menu), runs before the navigation logic */
  onClick?: () => void;
}) {
  const { navigate } = useRouter();
  const path = href.split("?")[0] ?? href;
  const internal = href.startsWith("/") && !/\.[a-z0-9]+$/i.test(path);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (!internal || isModifiedClick(event)) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  // Prefetch the target page chunk on hover/focus: it is likely cached by
  // click time, making navigation near-instant
  const handlePrefetch = () => {
    if (internal) {
      prefetchHref(href);
    }
  };

  return (
    <a
      className={className}
      href={href}
      {...(ariaCurrent ? { "aria-current": ariaCurrent } : {})}
      onClick={handleClick}
      onFocus={handlePrefetch}
      onPointerEnter={handlePrefetch}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      {...(title ? { title } : {})}
    >
      {children}
    </a>
  );
}

/** Top progress bar during page transitions (purely decorative, aria-hidden). */
function ProgressBar({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      <div className="h-full w-full origin-left bg-accent-strong animate-progress" />
    </div>
  );
}

/** Page shell: same structure as the pre-migration layout (skip link + sticky
 * nav + main + footer + floating back-to-top). */
export function Shell({ children }: { children: ReactNode }) {
  const { href, loading } = useRouter();
  const t = useT();
  // OG share-card page (/og/): a 1200x630 screenshot canvas that hides all
  // site chrome
  if (new URL(href, "http://localhost").pathname === "/og/") {
    return <div className="min-h-dvh bg-bg">{children}</div>;
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <ProgressBar active={loading} />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-100 focus:rounded-full focus:bg-accent-strong focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast"
        href="#main-content"
      >
        {t("misc.skipToContent")}
      </a>
      <Navigation />
      <main className="flex-1 pb-12" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}

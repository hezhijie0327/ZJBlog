// Top navigation: sticky frosted glass, desktop links + mobile drawer, and a
// search/theme/language/RSS/GitHub/support action area.
// On narrow screens (<sm) RSS/support fold into the drawer (it already holds a
// second entry) so the header icon row fits within 320px.

import { Languages, Menu, MonitorDown, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/components/Shell.tsx";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import { cn } from "@/lib/cn.ts";
import { useLocaleSwitch, useT } from "@/lib/i18n.ts";
import { promptInstall, watchInstallAvailability } from "@/lib/installPrompt.ts";
import { useRouter } from "@/lib/router.tsx";
import { ICON_BTN } from "@/lib/styles.ts";

const MOBILE_MENU_ID = "mobile-menu";

/** "Install App" icon button (driven by beforeinstallprompt, DESIGN.md §18)
    -- placement speaks the same language as ZJSearch HeaderActions: first in
    the right icon group, left of search. The button appears only after the
    event is captured (not rendered during SSR or the first hydrated frame, no
    hydration mismatch); iOS Safari never dispatches the event so the button
    never appears there, and installation goes through the system
    "Share -> Add to Home Screen". */
function InstallAppButton() {
  const t = useT();
  const [available, setAvailable] = useState(false);
  useEffect(() => watchInstallAvailability(setAvailable), []);
  if (!available) {
    return null;
  }
  return (
    <button
      aria-label={t("nav.installApp")}
      className={ICON_BTN}
      onClick={() => {
        void promptInstall();
      }}
      title={t("nav.installApp")}
      type="button"
    >
      <MonitorDown aria-hidden="true" className="size-4" />
    </button>
  );
}

export function Navigation() {
  const t = useT();
  const switchLocale = useLocaleSwitch();
  const { data, href } = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.projects"), href: "/projects/" },
    { name: t("nav.blogs"), href: "/blogs/" },
    { name: t("nav.travels"), href: "/travels/" },
    { name: t("nav.archives"), href: "/archives/" },
    { name: t("nav.support"), href: "/support/" },
  ];

  // Active state is derived from the payload's page type (not window.location):
  // SSR and the client's first render match exactly, so hydration can reuse
  // the prerendered DOM seamlessly
  const activeHref = (() => {
    switch (data?.globals.page) {
      case "home":
        return "/";
      case "blogs":
      case "blog-post":
      case "blog-tag":
        return "/blogs/";
      case "travels":
      case "travel":
        return "/travels/";
      case "projects":
      case "project":
        return "/projects/";
      case "archives":
        return "/archives/";
      case "support":
        return "/support/";
      default:
        return null;
    }
  })();

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  // Escape closes the drawer; it also collapses after navigation (including
  // back/forward) so it never covers the new page
  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
    };
  }, [isMenuOpen]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a href change is the navigation signal (including back/forward); collapse the drawer
  useEffect(() => {
    setIsMenuOpen(false);
  }, [href]);

  return (
    <header className="app-bar sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Logo (text wordmark + brand period only; the avatar appears only
              on the Hero paper card and the author card) */}
          <Link className="group flex items-center" href="/">
            <span className="whitespace-nowrap font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              {t("site.brand")}
              {/* Brand period (DESIGN.md §2.1): a solid gold dot as the closing
                  mark, same color family as the logo's period */}
              <span
                aria-hidden="true"
                className="ms-[0.14em] inline-block size-[0.25em] rounded-full bg-accent-strong"
              />
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  ariaCurrent={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-3 py-1.5 text-sm transition-colors",
                    isActive ? "font-medium text-ink" : "text-ink-2 hover:text-ink",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-accent-strong" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right action area (install/search/theme/language + small-screen
              menu) */}
          <div className="flex items-center gap-0.5">
            <InstallAppButton />
            <button
              aria-label={t("nav.search")}
              className={ICON_BTN}
              onClick={openSearch}
              title={t("nav.searchTitle")}
              type="button"
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
            <ThemeToggle />
            {/* UI language switch: the Languages icon (consistent with the
                overall icon language); aria-label/title announce the target
                language (t("nav.language") flips with the current locale) */}
            <button
              aria-label={t("nav.language")}
              className={ICON_BTN}
              onClick={switchLocale}
              title={t("nav.language")}
              type="button"
            >
              <Languages aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-controls={MOBILE_MENU_ID}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className={cn(ICON_BTN, "md:hidden")}
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
              }}
              type="button"
            >
              {isMenuOpen ? (
                <X aria-hidden="true" className="size-4" />
              ) : (
                <Menu aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav: persistent DOM + grid-rows height transition (animated
            both ways; invisible when collapsed so links are unfocusable), page
            links only (RSS already lives in the top bar, not in the drawer) */}
        <nav
          aria-hidden={!isMenuOpen}
          aria-label={t("nav.mobileNav")}
          className={cn(
            "grid border-line/80 transition-[grid-template-rows,visibility] duration-200 ease-out md:hidden",
            isMenuOpen ? "visible border-t [grid-template-rows:1fr]" : "invisible [grid-template-rows:0fr]",
          )}
          id={MOBILE_MENU_ID}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col py-3">
              {navigation.map((item) => {
                const isActive = item.href === activeHref;
                return (
                  <Link
                    ariaCurrent={isActive ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => {
                      setIsMenuOpen(false);
                    }}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

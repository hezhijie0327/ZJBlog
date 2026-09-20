// 顶部导航：sticky 毛玻璃、桌面链接 + 移动端抽屉、搜索/主题/RSS/GitHub 操作区。

import { Menu, Rss, Search, X } from "lucide-react";
import { useState } from "react";
import { GithubIcon } from "@/components/icons.tsx";
import { Link } from "@/components/Shell.tsx";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { ICON_BTN } from "@/lib/styles.ts";

export function Navigation() {
  const t = useT();
  const { data } = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.projects"), href: "/projects/" },
    { name: t("nav.blogs"), href: "/blogs/" },
    { name: t("nav.archives"), href: "/archives/" },
    { name: t("nav.support"), href: "/donation/" },
  ];

  // 激活态从 payload 的页面类型推导（而非 window.location）：
  // SSR 与客户端首帧渲染完全一致，hydration 才能无缝复用预渲染 DOM
  const activeHref = (() => {
    switch (data?.globals.page) {
      case "home":
        return "/";
      case "blogs":
      case "blog-post":
        return "/blogs/";
      case "projects":
      case "project":
        return "/projects/";
      case "archives":
        return "/archives/";
      case "donation":
        return "/donation/";
      default:
        return null;
    }
  })();

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <Link className="group flex items-center gap-2.5" href="/">
            <img
              alt={siteConfig.author}
              className="size-8 rounded-full object-cover ring-1 ring-line"
              height={32}
              loading="eager"
              src="/avatar.jpg"
              width={32}
            />
            <span className="font-serif text-base font-semibold tracking-tight">{siteConfig.name}</span>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
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

          {/* 右侧操作区 */}
          <div className="flex items-center gap-0.5">
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
            <a
              aria-label={t("nav.rss")}
              className={cn(ICON_BTN, "hidden sm:grid")}
              href="/rss.xml"
              title={t("nav.rss")}
            >
              <Rss aria-hidden="true" className="size-4" />
            </a>
            <a
              aria-label={t("nav.github")}
              className={ICON_BTN}
              href={siteConfig.social.github}
              rel="noopener noreferrer"
              target="_blank"
              title={t("nav.github")}
            >
              <GithubIcon className="size-4" />
            </a>
            <button
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

        {/* 移动端导航 */}
        {isMenuOpen && (
          <nav className="border-t border-line/80 py-3 md:hidden">
            <div className="flex flex-col">
              {navigation.map((item) => {
                const isActive = item.href === activeHref;
                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
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
          </nav>
        )}
      </div>
    </header>
  );
}

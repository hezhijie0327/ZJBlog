// 顶部导航：sticky 毛玻璃、桌面链接 + 移动端抽屉、搜索/主题/语言/RSS/GitHub/支持操作区。
// 窄屏（<sm）时 RSS/支持 收进抽屉（抽屉内本就有第二入口），头部图标行才放得下 320px。

import { Languages, Menu, Rss, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons.tsx";
import { Link } from "@/components/Shell.tsx";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useLocaleSwitch, useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { ICON_BTN } from "@/lib/styles.ts";

const MOBILE_MENU_ID = "mobile-menu";

export function Navigation() {
  const t = useT();
  const switchLocale = useLocaleSwitch();
  const { data, href } = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.projects"), href: "/projects/" },
    { name: t("nav.blogs"), href: "/blogs/" },
    { name: t("nav.archives"), href: "/archives/" },
    { name: t("nav.support"), href: "/support/" },
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
      case "support":
        return "/support/";
      default:
        return null;
    }
  })();

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  // Escape 关闭抽屉；换页（含前进/后退）后收起，避免遮住新页面
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: href 变化即导航信号（含前进/后退），收起抽屉
  useEffect(() => {
    setIsMenuOpen(false);
  }, [href]);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <Link className="group flex items-center gap-2.5" href="/">
            <img
              alt={t("site.author")}
              className="size-8 rounded-full object-cover ring-1 ring-line"
              height={32}
              loading="eager"
              src="/avatar.jpg"
              width={32}
            />
            <span className="whitespace-nowrap font-serif text-base font-semibold tracking-tight">
              {t("site.brand")}
            </span>
          </Link>

          {/* 桌面导航 */}
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

          {/* 右侧操作区：只保留高频控制项（搜索/主题/语言/GitHub）；RSS 与支持
              在页脚和移动端抽屉各有入口（RSS 阅读器也会经 head 的 rel=alternate
              自动发现订阅源），图标行在 320px 才放得下 */}
          <div className="flex items-center gap-0.5">
            <button
              aria-label={t("nav.search")}
              className={cn(ICON_BTN, "max-sm:size-8")}
              onClick={openSearch}
              title={t("nav.searchTitle")}
              type="button"
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
            <ThemeToggle />
            {/* UI 语言切换：文A 图标（与整体图标语言统一）；aria-label/title
                播报目标语言（t("nav.language") 随当前语言翻转） */}
            <button
              aria-label={t("nav.language")}
              className={cn(ICON_BTN, "max-sm:size-8")}
              onClick={switchLocale}
              title={t("nav.language")}
              type="button"
            >
              <Languages aria-hidden="true" className="size-4" />
            </button>
            {/* RSS：桌面顶栏 + 移动端抽屉（<sm 折叠进抽屉，保住 320px） */}
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
              className={cn(ICON_BTN, "max-sm:size-8")}
              href={siteConfig.social.github}
              rel="noopener noreferrer"
              target="_blank"
              title={t("nav.github")}
            >
              <GithubIcon className="size-4" />
            </a>
            <button
              aria-controls={MOBILE_MENU_ID}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              className={cn(ICON_BTN, "max-sm:size-8 md:hidden")}
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

        {/* 移动端导航：页面链接（含支持 tab）+ RSS（顶栏 <sm 不放 RSS 图标） */}
        {isMenuOpen && (
          <nav aria-label={t("nav.mobileNav")} className="border-t border-line/80 py-3 md:hidden" id={MOBILE_MENU_ID}>
            <div className="flex flex-col">
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
            <div className="mt-3 border-t border-line/70 pt-3">
              <a
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                href="/rss.xml"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              >
                <Rss aria-hidden="true" className="size-3.5" />
                {t("nav.rss")}
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

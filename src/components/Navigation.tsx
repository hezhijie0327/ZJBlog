// 顶部导航：sticky 毛玻璃、桌面链接 + 移动端抽屉、搜索/主题/语言/RSS/GitHub/支持操作区。
// 窄屏（<sm）时 RSS/支持 收进抽屉（抽屉内本就有第二入口），头部图标行才放得下 320px。

import { Heart, Menu, Rss, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons.tsx";
import { Link } from "@/components/Shell.tsx";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useLocale, useLocaleSwitch, useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { ICON_BTN } from "@/lib/styles.ts";

const MOBILE_MENU_ID = "mobile-menu";

export function Navigation() {
  const t = useT();
  const locale = useLocale();
  const switchLocale = useLocaleSwitch();
  const { data, href } = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: t("nav.home"), href: "/" },
    { name: t("nav.projects"), href: "/projects/" },
    { name: t("nav.blogs"), href: "/blogs/" },
    { name: t("nav.archives"), href: "/archives/" },
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
  const isSupport = data?.globals.page === "support";

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

          {/* 右侧操作区（<sm 时 RSS/支持折叠进抽屉，图标缩小以保住 320px） */}
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
            {/* UI 语言切换：显示目标语言标签（中文界面显示 EN，英文界面显示 中） */}
            <button
              aria-label={t("nav.language")}
              className={cn(ICON_BTN, "max-sm:size-8 font-mono text-[11px] font-semibold")}
              onClick={switchLocale}
              title={t("nav.language")}
              type="button"
            >
              {locale === "zh-CN" ? "EN" : "中"}
            </button>
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
            {/* 支持：精简页入口（右上角图标 + 抽屉第二入口）；选中态用填充圆盘
                表达（仅变色对比度不足 1.5:1，非视觉的 aria-current 已有） */}
            <Link
              aria-current={isSupport ? "page" : undefined}
              aria-label={t("nav.support")}
              className={cn(ICON_BTN, "hidden sm:grid", isSupport && "bg-accent-soft text-ink")}
              href="/support/"
              title={t("nav.support")}
            >
              <Heart aria-hidden="true" className="size-4" />
            </Link>
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

        {/* 移动端导航：页面链接 + 支持 / RSS（顶栏图标之外的第二入口） */}
        {isMenuOpen && (
          <nav aria-label={t("nav.mobileNav")} className="border-t border-line/80 py-3 md:hidden" id={MOBILE_MENU_ID}>
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
            <div className="mt-3 border-t border-line/70 pt-3">
              <Link
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isSupport ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
                href="/support/"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              >
                <Heart aria-hidden="true" className="size-3.5" />
                {t("nav.support")}
              </Link>
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

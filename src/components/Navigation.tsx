// 顶部导航：sticky 毛玻璃、桌面链接 + 移动端抽屉、搜索/主题/语言/RSS/GitHub/支持操作区。
// 窄屏（<sm）时 RSS/支持 收进抽屉（抽屉内本就有第二入口），头部图标行才放得下 320px。

import { Languages, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/components/Shell.tsx";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
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
      case "blog-tag":
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
          {/* Logo（纯文字字标 + 品牌句号，头像只在 Hero 纸片与署名卡出现） */}
          <Link className="group flex items-center" href="/">
            <span className="whitespace-nowrap font-serif text-2xl font-semibold tracking-tight">
              {t("site.brand")}
              {/* 品牌句号（DESIGN.md §2.1）：实心金点收尾，与品牌标句号同色系 */}
              <span aria-hidden="true" className="ms-0.5 inline-block size-[0.25em] rounded-full bg-accent-strong" />
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

          {/* 右侧操作区（搜索/主题/语言 + 小屏菜单）：GitHub 与 RSS 的入口
              在首页联系版块，顶栏不再重复 */}
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
            {/* UI 语言切换：文A 图标（与整体图标语言统一）；aria-label/title
                播报目标语言（t("nav.language") 随当前语言翻转） */}
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

        {/* 移动端导航：常驻 DOM + grid-rows 高度过渡（展开/收起都有动画，
            收起态 invisible 使链接不可聚焦），页面链接（RSS 已常驻顶栏，不进抽屉） */}
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

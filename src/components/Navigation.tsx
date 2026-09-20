"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ICON_BTN } from "@/lib/styles";
import { t } from "@/lib/i18n";
import ThemeToggle from "@/components/ThemeToggle";
import { siteConfig } from "@/config/site";
import { Menu, Search, X, Rss } from "lucide-react";
import { GithubIcon } from "@/components/icons";

const navigation = [
  { name: t("nav.home"), href: "/" },
  { name: t("nav.projects"), href: "/projects" },
  { name: t("nav.blogs"), href: "/blogs" },
  { name: t("nav.archives"), href: "/archives" },
  { name: t("nav.support"), href: "/donation" },
];

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isPathActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/avatar.jpg"
              alt={siteConfig.author}
              width={32}
              height={32}
              priority
              className="size-8 rounded-full object-cover ring-1 ring-line"
            />
            <span className="font-serif text-base font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const isActive = isPathActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "font-medium text-ink"
                      : "text-ink-2 hover:text-ink",
                  )}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-accent-strong" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={openSearch}
              aria-label={t("nav.search")}
              title={t("nav.searchTitle")}
              className={ICON_BTN}
            >
              <Search className="size-4" />
            </button>
            <ThemeToggle />
            <a
              href="/rss.xml"
              aria-label={t("nav.rss")}
              title={t("nav.rss")}
              className={cn(ICON_BTN, "hidden sm:grid")}
            >
              <Rss className="size-4" />
            </a>
            <a
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("nav.github")}
              title={t("nav.github")}
              className={ICON_BTN}
            >
              <GithubIcon className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={isMenuOpen}
              className={cn(ICON_BTN, "md:hidden")}
            >
              {isMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="border-t border-line/80 py-3 md:hidden">
            <div className="flex flex-col">
              {navigation.map((item) => {
                const isActive = isPathActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-surface-2 font-medium text-ink"
                        : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
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

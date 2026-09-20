"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { siteConfig } from "@/config/site";
import { Menu, Search, X, Rss } from "lucide-react";
import { GithubIcon } from "@/components/icons";

const navigation = [
  { name: "首页", href: "/" },
  { name: "项目", href: "/projects" },
  { name: "博客", href: "/blogs" },
  { name: "归档", href: "/archives" },
  { name: "支持", href: "/donation" },
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
              aria-label="搜索"
              title="搜索 (Ctrl+K)"
              className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Search className="size-4" />
            </button>
            <ThemeToggle />
            <a
              href="/rss.xml"
              aria-label="RSS 订阅"
              title="RSS 订阅"
              className="hidden grid place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink sm:grid size-9"
            >
              <Rss className="size-4" />
            </a>
            <a
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub"
              className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <GithubIcon className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "关闭菜单" : "打开菜单"}
              aria-expanded={isMenuOpen}
              className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink md:hidden"
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

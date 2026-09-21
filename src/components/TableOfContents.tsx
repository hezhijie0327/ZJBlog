// 文章目录（TOC）：构建期提取的 h2/h3（id 与 rehype-slug 锚点同源）。
// 桌面宽屏 sticky 右栏；滚动时高亮当前小节（IntersectionObserver 增强，
// 不支持时退化为纯链接列表）。

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import type { TocItem } from "@/lib/types.ts";

export function TableOfContents({ items }: { items: TocItem[] }) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0 || !("IntersectionObserver" in window)) {
      return;
    }
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) {
      return;
    }
    // 标题越过视口上沿 1/3 处即视为当前小节
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -66% 0px" },
    );
    for (const heading of headings) {
      observer.observe(heading);
    }
    return () => {
      observer.disconnect();
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t("post.toc")} className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto py-2">
      <p className={cn("mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3")}>{t("post.toc")}</p>
      <ul className="space-y-1 border-l border-line">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                aria-current={active ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l py-1 transition-colors",
                  item.depth === 3 ? "pl-7" : "pl-4",
                  active
                    ? "border-accent-strong font-medium text-ink"
                    : "border-transparent text-ink-3 hover:border-line hover:text-ink",
                )}
                href={`#${item.id}`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

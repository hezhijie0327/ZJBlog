// Table of contents: h2/h3 extracted at build time (ids share the same origin
// as rehype-slug anchors). A sticky right column on wide desktop screens;
// highlights the current section while scrolling (an IntersectionObserver
// enhancement, degrading to a plain link list when unsupported).

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { EYEBROW } from "@/lib/styles.ts";
import type { TocItem } from "@/lib/types.ts";

export function TableOfContents({ items }: { items: TocItem[] }) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) {
      return;
    }
    // A heading counts as the current section once it crosses the viewport's
    // upper third
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
    <nav
      aria-label={t("post.toc")}
      className="sticky top-[calc(5rem+env(safe-area-inset-top))] max-h-[calc(100dvh-6rem-env(safe-area-inset-top))] overflow-y-auto py-2"
    >
      <p className={cn(EYEBROW, "mb-3")}>{t("post.toc")}</p>
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

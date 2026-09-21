// 故事分镜条（首页专属，lg+ 显示）：固定在视口底部的章节锚点导航，
// IntersectionObserver 滚动高亮当前区块。纯导航部件，锚点跳转交由
// 浏览器原生行为（reduced-motion 下为瞬时跳转，见 behaviors.css）。

import { useEffect, useState } from "react";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";

export interface StorySection {
  id: string;
  no: string;
  label: string;
}

export function StoryBar({ sections }: { sections: StorySection[] }) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length === 0 || !("IntersectionObserver" in window)) {
      return;
    }
    const targets = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) {
      return;
    }
    // 视口中线附近的区块视为当前分镜
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    for (const target of targets) {
      observer.observe(target);
    }
    return () => {
      observer.disconnect();
    };
  }, [sections]);

  return (
    <nav
      aria-label={t("home.storybar")}
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 hidden justify-center lg:flex"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-bg/90 p-1 shadow-pop backdrop-blur-md">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <a
              aria-current={active ? "location" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
                active ? "bg-surface-2 font-medium text-ink" : "text-ink-3 hover:text-ink",
              )}
              href={`#${section.id}`}
              key={section.id}
            >
              <span aria-hidden="true" className={cn("font-mono text-[10px]", active ? "text-accent" : "text-ink-3")}>
                {section.no}
              </span>
              {section.label}
            </a>
          );
        })}
        <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />
        <Link
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-ink-3 transition-colors hover:text-ink"
          href="/blogs/"
        >
          {t("nav.blogs")}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  );
}

// 故事分镜条（首页专属，md+ 显示）：置于 Hero 之后的文档流内，sticky 吸附
// 在顶栏下方（top = 导航高度）。首屏时位于第一屏底部，滚过后吸附跟随；
// 由于是 in-flow sticky，滚动到页尾会随父容器自然松开 —— 不会遮挡 footer。
// IntersectionObserver 负责高亮当前区块；锚点跳转为浏览器原生行为
// （reduced-motion 下为瞬时跳转，见 behaviors.css）。

import { Clapperboard } from "lucide-react";
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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -55% 0px" },
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
      className="sticky top-14 z-40 hidden border-b border-line bg-bg/95 backdrop-blur-md md:block"
    >
      <div className="container mx-auto flex h-11 items-center justify-between gap-4 px-4">
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-ink-3">
          <Clapperboard aria-hidden="true" className="size-3.5" />
          {t("home.storybar")}
        </span>
        <div className="flex items-center gap-1">
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <a
                aria-current={active ? "location" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                  active ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink",
                )}
                href={`#${section.id}`}
                key={section.id}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "rounded-sm border border-dashed px-1 font-mono text-[10px]",
                    active ? "border-accent text-accent" : "border-line",
                  )}
                >
                  {section.no}
                </span>
                {section.label}
              </a>
            );
          })}
        </div>
        <Link
          className="hidden shrink-0 items-center gap-1 text-xs text-ink-3 transition-colors hover:text-ink lg:flex"
          href="/blogs/"
        >
          {t("nav.blogs")}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  );
}

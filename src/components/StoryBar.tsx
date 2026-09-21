// 故事分镜条（首页专属，md+ 显示）：置于 Hero 之后的文档流内，sticky 吸附
// 在顶栏下方（top = 导航高度）。首屏时位于第一屏底部，滚过后吸附跟随；
// 由于是 in-flow sticky，滚动到页尾会随父容器自然松开 —— 不会遮挡 footer。
// 高亮用 rAF 节流的 scrollspy：当前区块 = 与视口 30%–45% 判定带相交者。
// 不用 IntersectionObserver：最后一项（联系）紧挨页尾，contact + footer
// 撑不满视口剩余空间，滚到底也进不了判定带 —— IO 只在跨越时触发，
// 永远等不到那次回调；滚动重算才能加「到底部点亮最后一项」的兜底。
// 锚点跳转为浏览器原生行为（reduced-motion 下为瞬时跳转，见 behaviors.css）。

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
    const visible = sections
      .map((section) => ({ id: section.id, el: document.getElementById(section.id) }))
      .filter((s): s is { id: string; el: HTMLElement } => s.el !== null);
    const last = visible[visible.length - 1];
    if (!last) {
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      // 页尾兜底：文档滚到底时判定带里往往还是上一区块，直接点亮最后一项
      if (window.scrollY + vh >= document.documentElement.scrollHeight - 1) {
        setActiveId(last.id);
        return;
      }
      const bandTop = vh * 0.3;
      const bandBottom = vh * 0.45;
      // 判定带同时碰到多个区块时取文档顺序靠后者（延续原 IO 回调的覆盖次序）
      let current: string | null = null;
      for (const { id, el } of visible) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= bandBottom && rect.bottom > bandTop) {
          current = id;
        }
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!raf) {
        raf = requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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

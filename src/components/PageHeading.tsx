// 独立页面的 h1 页头：中文衬线标题 + 英文小标签（等宽）+ 可选右侧补充。
// 与首页的 SectionHeading（h2 章节 + 编号）区分：本组件用于列表页页题，
// 编号在独立页面上没有语义，故不设；调用方负责让其与内容列同宽对齐。

import { cn } from "@/lib/cn.ts";

interface PageHeadingProps {
  /** 中文标题（h1） */
  title: string;
  /** 英文小标签（等宽字体） */
  en: string;
  /** 右侧补充说明（如数量） */
  hint?: string;
  className?: string;
}

export function PageHeading({ title, en, hint, className }: PageHeadingProps) {
  return (
    <div className={cn("mb-10 flex items-end justify-between gap-4", className)}>
      <div className="flex items-baseline gap-4">
        <h1 className="font-serif text-3xl font-black tracking-tight text-ink sm:text-4xl">{title}</h1>
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3 sm:inline">{en}</span>
      </div>
      {hint && <span className="font-mono text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

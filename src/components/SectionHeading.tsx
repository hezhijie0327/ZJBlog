// 章节标题：编号（等宽金棕）+ 中文衬线标题 + 英文小标签 + 可选右侧补充。

import { cn } from "@/lib/cn.ts";

interface SectionHeadingProps {
  /** 章节编号，如 "01" */
  index: string;
  /** 中文标题 */
  title: string;
  /** 英文小标签（等宽字体） */
  en: string;
  /** 右侧补充说明（如数量） */
  hint?: string;
  className?: string;
}

export function SectionHeading({ index, title, en, hint, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-10 flex items-end justify-between gap-4", className)}>
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-sm font-medium text-accent">{index}</span>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 sm:inline">{en}</span>
      </div>
      {hint && <span className="font-mono text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

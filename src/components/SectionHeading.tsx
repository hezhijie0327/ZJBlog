// 标题块：编号（等宽金棕，可选）+ 中文衬线标题 + 英文小标签（可选）+ 右侧补充。
// level=1 为页面页题（h1，大号黑体）；level=2（默认）为章节标题（h2）。
// 编号在独立列表页上没有语义，故 index 可选；调用方负责让其与内容列同宽对齐。

import { cn } from "@/lib/cn.ts";
import { EYEBROW } from "@/lib/styles.ts";

interface SectionHeadingProps {
  /** 标题层级：1 = 页面页题（h1），2 = 章节标题（h2，默认） */
  level?: 1 | 2;
  /** 章节编号，如 "01" */
  index?: string;
  /** 中文标题 */
  title: string;
  /** 小标签（等宽字体；中文界面作英文点缀，英文界面与标题重复，传空隐藏） */
  en?: string;
  /** 右侧补充说明（如数量） */
  hint?: string;
  className?: string;
}

export function SectionHeading({ level = 2, index, title, en, hint, className }: SectionHeadingProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("mb-10 flex items-end justify-between gap-4", className)}>
      <div className="flex items-baseline gap-4">
        {index && <span className="font-mono text-sm font-medium text-accent">{index}</span>}
        <Heading
          className={
            level === 1
              ? "font-serif text-3xl font-black tracking-tight text-ink sm:text-4xl"
              : "font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          }
        >
          {title}
        </Heading>
        {en && <span className={cn(EYEBROW, "hidden sm:inline")}>{en}</span>}
      </div>
      {hint && <span className="font-mono text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

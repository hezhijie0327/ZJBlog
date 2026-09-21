// 空状态：DESIGN.md §7 的共享构成（卡片 + 居中标题 + 灰字说明）。

import { cn } from "@/lib/cn.ts";
import { CARD } from "@/lib/styles.ts";

interface EmptyStateProps {
  title?: string;
  desc: string;
  className?: string;
}

export function EmptyState({ title, desc, className }: EmptyStateProps) {
  return (
    <div className={cn(CARD, "px-6 py-16 text-center", className)}>
      {title && <h2 className="font-serif text-lg font-semibold text-ink">{title}</h2>}
      <p className={cn("text-sm text-ink-3", title && "mt-2")}>{desc}</p>
    </div>
  );
}

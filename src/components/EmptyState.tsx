// 空状态：DESIGN.md §9 的共享构成（图标圆盘 + 标题 + 灰字说明 + 可选胶囊动作）。
// 列表页内用卡片壳 + h2 标题；404 等整页场景用 bare 变体 + h1 页题字号，
// 复用同一构成而不是各写一套（DESIGN.md §9「404 与空状态同构」）。

import type { ReactNode } from "react";
import { cn } from "@/lib/cn.ts";
import { CARD } from "@/lib/styles.ts";

interface EmptyStateProps {
  /** 顶部图标（渲染进 accent-soft 圆盘，纯装饰） */
  icon?: ReactNode;
  /** 标题层级：404 等整页场景为 h1（字号同 §4 页面 H1），默认 h2 */
  heading?: "h1" | "h2";
  title?: string;
  desc: string;
  /** 底部动作（如返回首页的胶囊链接） */
  action?: ReactNode;
  /** 去掉卡片壳（整页居中的 404 等场景） */
  bare?: boolean;
  className?: string;
}

export function EmptyState({ icon, heading = "h2", title, desc, action, bare = false, className }: EmptyStateProps) {
  const Title = heading;
  return (
    <div className={cn(bare ? "text-center" : CARD, !bare && "px-6 py-16", "text-center", className)}>
      {icon && (
        <span
          aria-hidden="true"
          className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent"
        >
          {icon}
        </span>
      )}
      {title && (
        <Title
          className={cn(
            "font-serif font-semibold tracking-tight text-ink",
            heading === "h1" ? "text-3xl font-black sm:text-4xl" : "text-lg",
            icon && "mt-4",
          )}
        >
          {title}
        </Title>
      )}
      <p className={cn("text-sm text-ink-2", (title || icon) && "mt-1.5")}>{desc}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

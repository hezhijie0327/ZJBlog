// 标签行：#tag 文本列表，文章/项目头部与列表页共用。exclude 用于与分类
// 去重（标签里常含分类同名词）。

import { cn } from "@/lib/cn.ts";

interface TagListProps {
  tags: string[];
  /** 与该值相同的标签不渲染（通常传分类名） */
  exclude?: string;
  /** 列表页卡片内启用随卡片悬停变色 */
  hoverable?: boolean;
  className?: string;
}

export function TagList({ tags, exclude, hoverable, className }: TagListProps) {
  const visible = exclude ? tags.filter((tag) => tag !== exclude) : tags;
  if (visible.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3", className)}>
      {visible.map((tag) => (
        <span className={cn(hoverable && "transition-colors group-hover:text-ink-2")} key={tag}>
          #{tag}
        </span>
      ))}
    </div>
  );
}

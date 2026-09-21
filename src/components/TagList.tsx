// 标签行：#tag 列表，文章/项目头部与列表页共用。exclude 用于与分类去重；
// linkTags 时每个标签渲染为标签筛选页链接（博客文章页用；项目标签无页）。

import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";

interface TagListProps {
  tags: string[];
  /** 与该值相同的标签不渲染（通常传分类名） */
  exclude?: string;
  /** 列表页卡片内启用随卡片悬停变色 */
  hoverable?: boolean;
  /** 标签渲染为指向标签筛选页的链接 */
  linkTags?: boolean;
  className?: string;
}

export function TagList({ tags, exclude, hoverable, linkTags, className }: TagListProps) {
  const visible = exclude ? tags.filter((tag) => tag !== exclude) : tags;
  if (visible.length === 0) {
    return null;
  }
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3", className)}>
      {visible.map((tag) => {
        const tagClass = cn(hoverable && "transition-colors group-hover:text-ink-2");
        return linkTags ? (
          <Link
            className={cn(tagClass, "transition-colors hover:text-accent")}
            href={`/blogs/tags/${encodeURIComponent(tag)}/`}
            key={tag}
          >
            #{tag}
          </Link>
        ) : (
          <span className={tagClass} key={tag}>
            #{tag}
          </span>
        );
      })}
    </div>
  );
}

// Tag row: a list of #tags, shared by post/project headers and list pages.
// exclude dedupes against the category; with linkTags each tag renders as a
// link to its tag filter page (used on blog post pages; project tags have no
// pages).

import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";

interface TagListProps {
  tags: string[];
  /** Tags equal to this value are not rendered (usually the category name) */
  exclude?: string;
  /** Inside list-page cards, enables color change along with the card hover */
  hoverable?: boolean;
  /** Tags render as links to their tag filter pages */
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

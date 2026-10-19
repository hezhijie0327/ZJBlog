// Post list (shared by BlogsPage and tag filter pages): ghost date watermark +
// serif title + meta info + excerpt + tag row. The watermark is purely
// decorative (aria-hidden, clipped horizontally to prevent overflow).

import { ArrowUpRight, Lock, Presentation } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { TagList } from "@/components/TagList.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, DIVIDE_LIST, GHOST_DATE } from "@/lib/styles.ts";
import type { BlogListItem } from "@/lib/types.ts";

export function PostList({ blogs }: { blogs: BlogListItem[] }) {
  const t = useT();

  return (
    <div className={DIVIDE_LIST}>
      {blogs.map((blog) => (
        <article className="group relative overflow-x-clip py-8 first:pt-0" key={blog.slug}>
          {/* Ghost date watermark (decorative): outlined text behind the
              title, clipped horizontally to prevent overflow on small screens */}
          {blog.date && (
            <span aria-hidden="true" className={GHOST_DATE}>
              {formatDateISO(blog.date)}
            </span>
          )}
          <div className="relative">
            <Link className="block" href={`/blogs/${blog.slug}/`}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-accent sm:text-2xl">
                  {blog.title}
                  {/* Locked post: lock icon + screen-reader copy; description
                      is stripped at build time */}
                  {blog.locked && (
                    <>
                      <span className="sr-only">({t("post.locked")})</span>
                      <Lock aria-hidden="true" className="ml-1.5 inline size-4 align-baseline text-accent-strong" />
                    </>
                  )}
                  {/* Full-deck badge */}
                  {blog.deck && (
                    <>
                      <span className="sr-only">({t("blog.deck")})</span>
                      <Presentation
                        aria-hidden="true"
                        className="ml-1.5 inline size-4 align-baseline text-accent-strong"
                      />
                    </>
                  )}
                </h2>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-ink-3 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-ink-3">
                {blog.date && <time dateTime={blog.date}>{formatDateISO(blog.date)}</time>}
                <span>{t("meta.readingTime", { n: blog.readingMinutes })}</span>
                {blog.category && <span className={CHIP}>{blog.category}</span>}
              </div>

              {blog.description && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">{blog.description}</p>
              )}

              <TagList className="mt-3" exclude={blog.category} hoverable tags={blog.tags} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

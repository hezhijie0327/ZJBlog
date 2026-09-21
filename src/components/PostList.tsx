// 文章列表（BlogsPage 与标签筛选页共用）：幽灵日期水印 + 衬线标题 +
// 元信息 + 摘要 + 标签行。水印为纯装饰（aria-hidden，横向裁切防溢出）。

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { TagList } from "@/components/TagList.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP } from "@/lib/styles.ts";
import type { BlogListItem } from "@/lib/types.ts";

export function PostList({ blogs }: { blogs: BlogListItem[] }) {
  const t = useT();

  return (
    <div className="divide-y divide-line/70">
      {blogs.map((blog) => (
        <article className="group relative overflow-x-clip py-8 first:pt-0" key={blog.slug}>
          {/* 幽灵日期水印（装饰）：压在标题后方，横向裁切防小屏溢出 */}
          {blog.date && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-5 right-0 select-none whitespace-nowrap font-mono text-[4.5rem] font-bold leading-none text-accent-soft sm:-top-6 sm:text-[5.5rem]"
            >
              {formatDateISO(blog.date)}
            </span>
          )}
          <div className="relative">
            <Link className="block" href={`/blogs/${blog.slug}/`}>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-accent sm:text-2xl">
                  {blog.title}
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
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-[15px]">{blog.description}</p>
              )}

              <TagList className="mt-3" exclude={blog.category} hoverable tags={blog.tags} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

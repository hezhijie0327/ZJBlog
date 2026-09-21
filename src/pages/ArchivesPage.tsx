// 归档页：按年份分组的全部文章。

import { EmptyState } from "@/components/EmptyState.tsx";
import { PageHeading } from "@/components/PageHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { SECTION } from "@/lib/styles.ts";
import type { ArchivesData } from "@/lib/types.ts";

export function ArchivesPage({ data }: { data: ArchivesData }) {
  const t = useT();

  const byYear = new Map<string, ArchivesData["blogs"]>();
  for (const blog of data.blogs) {
    // frontmatter 日期无时区语义，直接取日历字段（Date UTC 解析会偏移年份）
    const year = blog.date ? formatDateISO(blog.date).slice(0, 4) : t("archives.unknownYear");
    const list = byYear.get(year) ?? [];
    list.push(blog);
    byYear.set(year, list);
  }
  const years = [...byYear.entries()].sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className={SECTION}>
      <div className="mx-auto max-w-3xl">
        <PageHeading
          en={t("page.archives.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          title={t("page.archives.title")}
        />

        <div className="space-y-14">
          {years.length > 0 ? (
            years.map(([year, posts]) => (
              <section key={year}>
                <div className="mb-5 flex items-baseline gap-4">
                  <h2 className="font-serif text-3xl font-bold text-ink">{year}</h2>
                  <span className="font-mono text-xs text-ink-3">{t("count.nPosts", { n: posts.length })}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                </div>
                <ol className="space-y-1">
                  {posts.map((blog) => (
                    <li key={blog.slug}>
                      <Link
                        className="group flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                        href={`/blogs/${blog.slug}/`}
                      >
                        {blog.date && (
                          <time className="shrink-0 font-mono text-xs text-ink-3" dateTime={blog.date}>
                            {formatDateISO(blog.date).slice(5)}
                          </time>
                        )}
                        <span className="min-w-0 flex-1 truncate font-serif text-sm font-medium text-ink transition-colors group-hover:text-accent sm:text-[15px]">
                          {blog.title}
                        </span>
                        {blog.category && (
                          <span className="hidden shrink-0 text-xs text-ink-3 sm:inline">{blog.category}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          ) : (
            <EmptyState desc={t("archives.empty")} />
          )}
        </div>
      </div>
    </div>
  );
}

// 归档页：按年份分组的全部文章。

import { PageHeading } from "@/components/PageHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, SECTION } from "@/lib/styles.ts";
import type { ArchivesData } from "@/lib/types.ts";

export function ArchivesPage({ data }: { data: ArchivesData }) {
  const t = useT();

  const byYear = new Map<string, ArchivesData["blogs"]>();
  for (const blog of data.blogs) {
    const year = blog.date ? new Date(blog.date).getFullYear().toString() : t("archives.unknownYear");
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
            <div className={cn(CARD, "px-6 py-16 text-center")}>
              <p className="text-sm text-ink-3">{t("archives.empty")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

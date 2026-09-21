// 全部文章列表页。

import { ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { PageHeading } from "@/components/PageHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { TagList } from "@/components/TagList.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, SECTION } from "@/lib/styles.ts";
import type { BlogsData } from "@/lib/types.ts";

export function BlogsPage({ data }: { data: BlogsData }) {
  const t = useT();

  return (
    <div className={SECTION}>
      <div className="mx-auto max-w-3xl">
        <PageHeading
          en={t("page.blogs.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          title={t("page.blogs.title")}
        />

        {data.blogs.length > 0 ? (
          <div className="divide-y divide-line/70">
            {data.blogs.map((blog) => (
              <article className="group py-8 first:pt-0" key={blog.slug}>
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
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-[15px]">
                      {blog.description}
                    </p>
                  )}

                  <TagList className="mt-3" exclude={blog.category} hoverable tags={blog.tags} />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState desc={t("blog.empty.desc")} title={t("blog.empty.title")} />
        )}
      </div>
    </div>
  );
}

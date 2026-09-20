// 全部文章列表页。

import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, SECTION } from "@/lib/styles.ts";
import type { BlogsData } from "@/lib/types.ts";

export function BlogsPage({ data }: { data: BlogsData }) {
  const t = useT();

  return (
    <div className={SECTION}>
      <SectionHeading
        en={t("page.blogs.en")}
        hint={t("count.posts", { n: data.blogs.length })}
        index="00"
        title={t("page.blogs.title")}
      />

      <div className="mx-auto max-w-3xl">
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
                    <span>{blog.readingTime}</span>
                    {blog.category && (
                      <span className="rounded-full border border-line px-2 py-0.5">{blog.category}</span>
                    )}
                  </div>

                  {blog.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-[15px]">
                      {blog.description}
                    </p>
                  )}

                  {blog.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                      {blog.tags.map((tag) => (
                        <span className="text-xs text-ink-3 transition-colors group-hover:text-ink-2" key={tag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={cn(CARD, "px-6 py-16 text-center")}>
            <h3 className="font-serif text-lg font-semibold text-ink">{t("blog.empty.title")}</h3>
            <p className="mt-2 text-sm text-ink-3">{t("blog.empty.desc")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

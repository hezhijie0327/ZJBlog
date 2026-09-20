import type { Metadata } from "next";
import Link from "next/link";
import { getAllBlogs } from "@/lib/content";
import { cn } from "@/lib/utils";
import { CARD, SECTION } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { formatDateISO } from "@/lib/utils";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: t("page.archives.title"),
  description: t("page.archives.title"),
};

export default function ArchivesPage() {
  const blogs = getAllBlogs();

  const byYear = new Map<string, typeof blogs>();
  for (const blog of blogs) {
    const year = blog.date
      ? new Date(blog.date).getFullYear().toString()
      : t("archives.unknownYear");
    const list = byYear.get(year) ?? [];
    list.push(blog);
    byYear.set(year, list);
  }
  const years = [...byYear.entries()].sort(
    ([a], [b]) => Number(b) - Number(a),
  );

  return (
    <div className="min-h-full">
      <div className={SECTION}>
        <SectionHeading
          index="00"
          title={t("page.archives.title")}
          en={t("page.archives.en")}
          hint={t("count.posts", { n: blogs.length })}
        />

        <div className="mx-auto max-w-3xl space-y-14">
          {years.length > 0 ? (
            years.map(([year, posts]) => (
              <section key={year}>
                <div className="mb-5 flex items-baseline gap-4">
                  <h2 className="font-serif text-3xl font-bold text-ink">
                    {year}
                  </h2>
                  <span className="font-mono text-xs text-ink-3">
                    {t("count.nPosts", { n: posts.length })}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <ol className="space-y-1">
                  {posts.map((blog) => (
                    <li key={blog.slug}>
                      <Link
                        href={`/blogs/${blog.slug}/`}
                        className="group flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        {blog.date && (
                          <time
                            dateTime={blog.date}
                            className="shrink-0 font-mono text-xs text-ink-3"
                          >
                            {formatDateISO(blog.date).slice(5)}
                          </time>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink transition-colors group-hover:text-accent-text sm:text-[15px]">
                          {blog.title}
                        </span>
                        {blog.category && (
                          <span className="hidden shrink-0 text-xs text-ink-3 sm:inline">
                            {blog.category}
                          </span>
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

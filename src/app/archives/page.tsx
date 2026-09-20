import type { Metadata } from "next";
import Link from "next/link";
import { getAllBlogs } from "@/lib/content";
import SectionHeading from "@/components/SectionHeading";
import { formatDateISO } from "@/lib/utils";

export const metadata: Metadata = {
  title: "归档",
  description: "按时间顺序浏览全部文章",
};

export default function ArchivesPage() {
  const blogs = getAllBlogs();

  const byYear = new Map<string, typeof blogs>();
  for (const blog of blogs) {
    const year = blog.date ? new Date(blog.date).getFullYear().toString() : "未知";
    const list = byYear.get(year) ?? [];
    list.push(blog);
    byYear.set(year, list);
  }
  const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a));

  return (
    <div className="min-h-full">
      <div className="container mx-auto px-4 py-14 sm:py-20">
        <SectionHeading
          index="00"
          title="归档"
          en="Archive"
          hint={`共 ${blogs.length} 篇`}
        />

        <div className="mx-auto max-w-3xl space-y-14">
          {years.length > 0 ? (
            years.map((year) => (
              <section key={year}>
                <div className="mb-5 flex items-baseline gap-4">
                  <h2 className="font-serif text-3xl font-bold text-ink">
                    {year}
                  </h2>
                  <span className="font-mono text-xs text-ink-3">
                    {byYear.get(year)!.length} 篇
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <ol className="space-y-1">
                  {byYear.get(year)!.map((blog) => (
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
            <div className="rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-card">
              <p className="text-sm text-ink-3">暂无可归档的内容。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

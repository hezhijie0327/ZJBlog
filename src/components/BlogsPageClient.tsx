import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD, SECTION } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { formatDateISO } from "@/lib/utils";
import SectionHeading from "@/components/SectionHeading";

interface Blog {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  category?: string;
  tags?: string[];
  readingTime?: string;
}

interface BlogsPageClientProps {
  blogs: Blog[];
}

export default function BlogsPageClient({ blogs }: BlogsPageClientProps) {
  return (
    <div className="min-h-full">
      <div className={SECTION}>
        <SectionHeading
          index="00"
          title={t("page.blogs.title")}
          en={t("page.blogs.en")}
          hint={t("count.posts", { n: blogs.length })}
        />

        <div className="mx-auto max-w-3xl">
          {blogs.length > 0 ? (
            <div className="divide-y divide-line/70">
              {blogs.map((blog) => (
                <article key={blog.slug} className="group py-8 first:pt-0">
                  <Link href={`/blogs/${blog.slug}/`} className="block">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="font-serif text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-accent-text sm:text-2xl">
                        {blog.title}
                      </h2>
                      <ArrowUpRight className="size-5 shrink-0 text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-text" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-ink-3">
                      {blog.date && (
                        <time dateTime={blog.date}>
                          {formatDateISO(blog.date)}
                        </time>
                      )}
                      {blog.readingTime && <span>{blog.readingTime}</span>}
                      {blog.category && (
                        <span className="rounded-full border border-line px-2 py-0.5">
                          {blog.category}
                        </span>
                      )}
                    </div>

                    {blog.description && (
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-[15px]">
                        {blog.description}
                      </p>
                    )}

                    {blog.tags && blog.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                        {blog.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-ink-3 transition-colors group-hover:text-ink-2"
                          >
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
              <h3 className="font-serif text-lg font-semibold text-ink">
                {t("blog.empty.title")}
              </h3>
              <p className="mt-2 text-sm text-ink-3">
                {t("blog.empty.desc")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

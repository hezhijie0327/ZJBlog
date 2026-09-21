// 全部文章列表页：标签云 + 文章列表（幽灵日期水印）+ 右栏最近文章（xl 宽屏）。

import { EmptyState } from "@/components/EmptyState.tsx";
import { PageHeading } from "@/components/PageHeading.tsx";
import { PostList } from "@/components/PostList.tsx";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, SECTION } from "@/lib/styles.ts";
import type { BlogsData } from "@/lib/types.ts";

export function BlogsPage({ data }: { data: BlogsData }) {
  const t = useT();
  const recent = data.blogs.slice(0, 5);
  const tags = [...new Set(data.blogs.flatMap((blog) => blog.tags))].sort((a, b) => a.localeCompare(b));

  return (
    <div className={SECTION}>
      <div className="mx-auto flex max-w-6xl justify-center gap-10">
        <div className="min-w-0 max-w-3xl flex-1">
          <PageHeading
            en={t("page.blogs.en")}
            hint={t("count.posts", { n: data.blogs.length })}
            title={t("page.blogs.title")}
          />

          {/* 标签云：点击进入标签筛选页 */}
          {tags.length > 0 && (
            <div className="mb-10 flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Link
                  className={cn(CHIP, "transition-colors hover:border-accent hover:text-accent")}
                  href={`/blogs/tags/${encodeURIComponent(tag)}/`}
                  key={tag}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {data.blogs.length > 0 ? (
            <PostList blogs={data.blogs} />
          ) : (
            <EmptyState desc={t("blog.empty.desc")} title={t("blog.empty.title")} />
          )}
        </div>

        {/* 右栏：最近文章（xl 宽屏 sticky 跟随） */}
        {recent.length > 0 && (
          <aside className="hidden w-60 shrink-0 xl:block">
            <div className="sticky top-20">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">{t("blog.rail")}</p>
              <ul className="space-y-3 border-l border-line">
                {recent.map((blog) => (
                  <li key={blog.slug}>
                    <Link
                      className="-ml-px block border-l border-transparent transition-colors hover:border-accent"
                      href={`/blogs/${blog.slug}/`}
                    >
                      <span className="block font-mono text-[11px] text-ink-3">
                        {blog.date ? formatDateISO(blog.date) : ""}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-ink-2 transition-colors hover:text-ink">
                        {blog.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

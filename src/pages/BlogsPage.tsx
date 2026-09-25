// 全部文章列表页：标签云 + 文章列表（幽灵日期水印）+ 右栏最近文章（xl 宽屏）。

import { EmptyState } from "@/components/EmptyState.tsx";
import { PostList } from "@/components/PostList.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, EYEBROW, SECTION } from "@/lib/styles.ts";
import type { BlogsData } from "@/lib/types.ts";

export function BlogsPage({ data }: { data: BlogsData }) {
  const t = useT();
  const recent = data.blogs.slice(0, 5);
  // 标签排序用 codepoint 比较：localeCompare 的 collation 在构建期 Node 与
  // 浏览器 ICU 之间不一致，曾致水合文本顺序不匹配（React #418）
  const tags = [...new Set(data.blogs.flatMap((blog) => blog.tags))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  return (
    <div className={SECTION}>
      <div className="mx-auto flex max-w-6xl justify-center gap-10">
        <div className="min-w-0 max-w-3xl flex-1">
          <SectionHeading
            en={t("page.blogs.en")}
            hint={t("count.posts", { n: data.blogs.length })}
            level={1}
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
              <p className={cn(EYEBROW, "mb-3")}>{t("blog.rail")}</p>
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

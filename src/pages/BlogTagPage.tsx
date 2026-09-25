// 标签筛选页：/blogs/tags/<tag>/，列出该标签下全部文章（列表视图与
// BlogsPage 同构，故复用 PostList）。刻意不进 sitemap（重复内容视图）。

import { BackLink } from "@/components/BackLink.tsx";
import { EmptyState } from "@/components/EmptyState.tsx";
import { PostList } from "@/components/PostList.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { useT } from "@/lib/i18n.ts";
import { SECTION } from "@/lib/styles.ts";
import type { BlogTagData } from "@/lib/types.ts";

export function BlogTagPage({ data }: { data: BlogTagData }) {
  const t = useT();

  return (
    <div className={SECTION}>
      <div className="mx-auto max-w-3xl">
        <BackLink href="/blogs/" label={t("blog.back")} />
        <SectionHeading
          className="mt-10"
          en={t("page.blogs.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          level={1}
          title={`#${data.tag}`}
        />

        {data.blogs.length > 0 ? (
          <PostList blogs={data.blogs} />
        ) : (
          <EmptyState desc={t("blog.empty.desc")} title={t("blog.empty.title")} />
        )}
      </div>
    </div>
  );
}

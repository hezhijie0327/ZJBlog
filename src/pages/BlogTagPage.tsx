// Tag filter page: /blogs/tags/<tag>/, lists all posts under that tag (the list view mirrors
// BlogsPage, hence the PostList reuse). Deliberately excluded from the sitemap (duplicate
// content view).

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

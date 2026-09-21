// 文章详情页：头部元信息 + 摘要卡 + 构建期编译的正文 + 目录右栏（xl 宽屏）
// + 上下篇导航 + 署名卡 + giscus 评论区。

import { Clock } from "lucide-react";
import { AuthorCard } from "@/components/AuthorCard.tsx";
import { BackLink } from "@/components/BackLink.tsx";
import { PostNav } from "@/components/PostNav.tsx";
import { TableOfContents } from "@/components/TableOfContents.tsx";
import { TagList } from "@/components/TagList.tsx";
import { GiscusComments } from "@/features/comments/GiscusComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, SECTION_DETAIL } from "@/lib/styles.ts";
import type { BlogPostData } from "@/lib/types.ts";

export function BlogPostPage({ data }: { data: BlogPostData }) {
  const t = useT();
  const { post } = data;

  return (
    <div className={SECTION_DETAIL}>
      <div className="mx-auto flex max-w-6xl justify-center gap-10">
        <article className="min-w-0 max-w-3xl flex-1">
          {/* 返回链接 */}
          <BackLink href="/blogs/" label={t("blog.back")} />

          {/* 文章头部：日期 · 阅读时长 · 分类一行，tags 与分类去重 */}
          <header className="mb-10 mt-8 border-b border-line pb-8">
            <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
              {post.date && <time dateTime={post.date}>{formatDateISO(post.date)}</time>}
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3" />
                {t("meta.readingTime", { n: post.readingMinutes })}
              </span>
              {post.category && <span className={CHIP}>{post.category}</span>}
            </div>
            <TagList className="mt-4" exclude={post.category} linkTags tags={post.tags} />
          </header>

          {/* 手写摘要卡（frontmatter.summary，可选） */}
          {post.summary && (
            <div className="mb-8 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">✨ {t("post.summary")}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{post.summary}</p>
            </div>
          )}

          {/* 正文 */}
          <Prose html={post.contentHtml ?? ""} needsKatex={post.needsKatex} />

          {/* 上一篇 / 下一篇 */}
          <PostNav next={post.next} prev={post.prev} />

          {/* 署名卡 */}
          <AuthorCard />

          {/* giscus 评论（GitHub Discussions，按路径映射） */}
          <GiscusComments />
        </article>

        {/* 目录右栏：宽屏 sticky 跟随 */}
        <aside className="hidden w-60 shrink-0 xl:block">
          <TableOfContents items={post.toc} />
        </aside>
      </div>
    </div>
  );
}

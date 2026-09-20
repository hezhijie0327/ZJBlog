// 文章详情页：头部元信息 + 构建期编译的正文 + GitHub 评论区。

import { ArrowLeft, Clock } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { siteConfig } from "@/config/site.ts";
import { GitHubComments } from "@/features/comments/GitHubComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { formatDate, formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import type { BlogPostData } from "@/lib/types.ts";

export function BlogPostPage({ data }: { data: BlogPostData }) {
  const t = useT();
  const { post } = data;

  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        {/* 返回链接 */}
        <Link
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-3 transition-colors hover:text-ink"
          href="/blogs/"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          {t("blog.back")}
        </Link>

        {/* 文章头部 */}
        <header className="mb-10 mt-8 border-b border-line pb-8">
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
            {post.date && <time dateTime={post.date}>{formatDateISO(post.date)}</time>}
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3" />
              {post.readingTime}
            </span>
            {post.category && <span className="rounded-full border border-line px-2.5 py-0.5">{post.category}</span>}
          </div>
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
          {post.date && (
            <p className="mt-4 text-[11px] text-ink-3">{t("blog.publishedOn", { date: formatDate(post.date) })}</p>
          )}
        </header>

        {/* 正文 */}
        <Prose html={post.contentHtml} />

        {/* GitHub 评论 */}
        <GitHubComments repo={siteConfig.commentsRepo} title={`关于文章 "${post.title}" 的讨论`} />
      </article>
    </div>
  );
}

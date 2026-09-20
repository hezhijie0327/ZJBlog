import { Metadata } from "next";
import { getAllContentSlugs, BlogItem } from "@/lib/content";
import { getContentBySlug } from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import GitHubComments from "@/components/GitHubComments";
import { t } from "@/lib/i18n";
import { siteConfig } from "@/config/site";
import { formatDate, formatDateISO } from "@/lib/utils";
import { ArrowLeft, Clock } from "lucide-react";

interface BlogPostParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllContentSlugs("blogs");
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await getContentBySlug(slug, "blogs");

  if (!post) {
    return {
      title: t("blog.notFound"),
    };
  }

  return {
    title: post.title,
    description: post.description || t("blog.fallbackDesc"),
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default async function BlogPost({ params }: BlogPostParams) {
  const { slug } = await params;
  const post = (await getContentBySlug(slug, "blogs")) as BlogItem;

  if (!post) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        {/* 返回链接 */}
        <Link
          href="/blogs"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          {t("blog.back")}
        </Link>

        {/* 文章头部 */}
        <header className="mt-8 mb-10 border-b border-line pb-8">
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
            {post.date && (
              <time dateTime={post.date}>{formatDateISO(post.date)}</time>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {post.readingTime}
            </span>
            {post.category && (
              <span className="rounded-full border border-line px-2.5 py-0.5">
                {post.category}
              </span>
            )}
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
              {post.tags.map((tag: string) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
          {post.date && (
            <p className="mt-4 text-[11px] text-ink-3">
              {t("blog.publishedOn", { date: formatDate(post.date) })}
            </p>
          )}
        </header>

        {/* 正文 */}
        <MarkdownRenderer content={post.content} />

        {/* GitHub 评论 */}
        <GitHubComments
          repo={siteConfig.commentsRepo}
          title={`关于文章 "${post.title}" 的讨论`}
        />
      </article>
    </div>
  );
}

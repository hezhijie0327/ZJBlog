import { Metadata } from "next";
import {
  getAllContentSlugs,
  getAllProjects,
  getContentBySlug,
} from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import GitHubComments from "@/components/GitHubComments";
import { formatDate, formatDateISO } from "@/lib/utils";
import { ArrowLeft, ArrowUpRight, Clock } from "lucide-react";
import { GithubIcon } from "@/components/icons";

interface ProjectParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllContentSlugs("projects");
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: ProjectParams): Promise<Metadata> {
  const { slug } = await params;
  const project = await getContentBySlug(slug, "projects");

  if (!project) {
    return {
      title: "项目未找到",
    };
  }

  return {
    title: project.title,
    description: project.description || "个人项目展示",
    keywords: project.tags,
    openGraph: {
      title: project.title,
      description: project.description,
      type: "article",
      publishedTime: project.date,
      images: project.frontmatter?.image
        ? [{ url: project.frontmatter.image }]
        : [],
      tags: project.tags,
    },
  };
}

export default async function Project({ params }: ProjectParams) {
  const { slug } = await params;
  const project = await getContentBySlug(slug, "projects");

  if (!project) {
    notFound();
  }

  const projects = getAllProjects();
  const projectData = projects.find((p) => p.slug === slug);
  const githubRepo = projectData?.githubRepo;
  const frontmatter = project.frontmatter;

  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        {/* 返回链接 */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          PROJECTS / 全部项目
        </Link>

        {/* 项目头部 */}
        <header className="mt-8 mb-10 border-b border-line pb-8">
          {frontmatter.image && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-line shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frontmatter.image}
                alt={project.title}
                className="w-full object-cover"
              />
            </div>
          )}
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">
              {project.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
            {project.date && (
              <time dateTime={project.date}>{formatDateISO(project.date)}</time>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {project.readingTime}
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5">
              {frontmatter.type === "starred" ? "精选项目" : "个人项目"}
            </span>
          </div>
          {project.tags && project.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
              {project.tags.map((tag: string) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}

          {frontmatter.link && (
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={frontmatter.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop"
              >
                {githubRepo ? (
                  <GithubIcon className="size-4" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
                {githubRepo ? "查看仓库" : "访问链接"}
              </a>
              {project.date && (
                <span className="inline-flex h-10 items-center rounded-full px-2 text-[11px] text-ink-3">
                  更新于 {formatDate(project.date)}
                </span>
              )}
            </div>
          )}
        </header>

        {/* 正文 */}
        <MarkdownRenderer content={project.content} />

        {/* GitHub 评论 */}
        <GitHubComments
          repo={githubRepo}
          title={`关于项目 "${project.title}" 的讨论`}
        />
      </article>
    </div>
  );
}

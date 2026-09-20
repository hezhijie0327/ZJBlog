// 项目详情页：封面占位 + 仓库/链接 CTA + 正文 + 该仓库评论区。

import { ArrowLeft, ArrowUpRight, Clock, Image as ImageIcon } from "lucide-react";
import { GithubIcon } from "@/components/icons.tsx";
import { Link } from "@/components/Shell.tsx";
import { GitHubComments } from "@/features/comments/GitHubComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { formatDate, formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import type { ProjectData } from "@/lib/types.ts";

export function ProjectPage({ data }: { data: ProjectData }) {
  const t = useT();
  const { project } = data;

  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        {/* 返回链接 */}
        <Link
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-3 transition-colors hover:text-ink"
          href="/projects/"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          {t("project.back")}
        </Link>

        {/* 项目头部 */}
        <header className="mb-10 mt-8 border-b border-line pb-8">
          {/* 封面占位：真图待后续整理（frontmatter.image 已预留） */}
          <div className="mb-8 grid aspect-[21/9] place-items-center rounded-2xl border border-line bg-surface-2 shadow-card">
            <ImageIcon aria-hidden="true" className="size-12 text-ink-3/40" />
          </div>
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">{project.description}</p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
            {project.date && <time dateTime={project.date}>{formatDateISO(project.date)}</time>}
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3" />
              {t("project.personal")}
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5">
              {project.type === "starred" ? t("project.starred") : t("project.personal")}
            </span>
          </div>
          {project.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
              {project.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}

          {project.link && (
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                className="inline-flex h-10 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop"
                href={project.link}
                rel="noopener noreferrer"
                target="_blank"
              >
                {project.githubRepo ? (
                  <GithubIcon className="size-4" />
                ) : (
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                )}
                {project.githubRepo ? t("project.viewRepo") : t("project.visitLink")}
              </a>
              {project.date && (
                <span className="inline-flex h-10 items-center rounded-full px-2 text-[11px] text-ink-3">
                  {t("project.updatedOn", { date: formatDate(project.date) })}
                </span>
              )}
            </div>
          )}
        </header>

        {/* 正文 */}
        <Prose html={project.contentHtml} />

        {/* GitHub 评论 */}
        <GitHubComments repo={project.githubRepo} title={`关于项目 "${project.title}" 的讨论`} />
      </article>
    </div>
  );
}

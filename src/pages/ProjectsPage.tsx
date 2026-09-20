// 项目列表页：个人项目卡片网格 + 精选第三方项目列表。

import { ArrowUpRight, Image as ImageIcon, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { hostOf } from "@/lib/link.ts";
import { BTN_OUTLINE, CARD_HOVER, LIST_CONTAINER, SECTION } from "@/lib/styles.ts";
import type { ProjectsData } from "@/lib/types.ts";

export function ProjectsPage({ data }: { data: ProjectsData }) {
  const t = useT();
  const personalProjects = data.projects.filter((p) => p.type === "personal");
  const starredProjects = data.projects.filter((p) => p.type === "starred");

  return (
    <div className={SECTION}>
      <SectionHeading
        en={t("page.projects.en")}
        hint={t("count.projects", { n: data.projects.length })}
        index="00"
        title={t("page.projects.title")}
      />

      {/* 个人项目 */}
      {personalProjects.length > 0 && (
        <section className="mb-16">
          <p className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-strong" />
            {t("projects.selectedLabel")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personalProjects.map((project, i) => (
              <Link
                className={cn(CARD_HOVER, "group flex flex-col")}
                href={`/projects/${project.slug}/`}
                key={project.slug}
              >
                {/* 封面占位：真图待后续整理（frontmatter.image 已预留） */}
                <div className="grid aspect-video place-items-center rounded-t-2xl border-b border-line bg-surface-2">
                  <ImageIcon aria-hidden="true" className="size-8 text-ink-3/50" />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 text-ink-3 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-2">{project.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {hostOf(project.link) ? (
                      <span className="truncate font-mono text-xs text-ink-3">{hostOf(project.link)}</span>
                    ) : (
                      <span />
                    )}
                    {project.date && (
                      <span className="shrink-0 font-mono text-xs text-ink-3">{formatDateISO(project.date)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 精选第三方项目 */}
      {starredProjects.length > 0 && (
        <section className="mb-16">
          <p className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
            <Star aria-hidden="true" className="size-3 text-accent-strong" />
            {t("projects.starredLabel")}
          </p>
          <div className={LIST_CONTAINER}>
            {starredProjects.map((project) => (
              <Link
                className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                href={`/projects/${project.slug}/`}
                key={project.slug}
              >
                <div className="flex min-w-0 flex-1 items-baseline gap-3">
                  <span className="shrink-0 font-medium text-ink transition-colors group-hover:text-accent">
                    {project.title}
                  </span>
                  {project.description && (
                    <span className="hidden truncate text-sm text-ink-3 sm:inline">{project.description}</span>
                  )}
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 空状态 */}
      {data.projects.length === 0 && (
        <div className={cn(CARD_HOVER, "mx-auto max-w-md px-6 py-16 text-center")}>
          <h3 className="font-serif text-lg font-semibold text-ink">{t("projects.empty.title")}</h3>
          <p className="mt-2 text-sm text-ink-3">{t("projects.empty.desc")}</p>
        </div>
      )}

      {/* GitHub 入口 */}
      <div className="text-center">
        <a className={BTN_OUTLINE} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
          <GithubIcon className="size-4" />
          {t("projects.githubMore")}
        </a>
      </div>
    </div>
  );
}

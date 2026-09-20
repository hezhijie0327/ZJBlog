// 项目列表页：个人项目卡片网格（有 frontmatter.image 时渲染封面，无图即为纯文字卡）。

import { ArrowUpRight } from "lucide-react";
import { GithubIcon } from "@/components/icons.tsx";
import { PageHeading } from "@/components/PageHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { BTN_OUTLINE, CARD, CARD_HOVER, SECTION } from "@/lib/styles.ts";
import type { ProjectsData } from "@/lib/types.ts";

export function ProjectsPage({ data }: { data: ProjectsData }) {
  const t = useT();
  const personalProjects = data.projects.filter((p) => p.type === "personal");

  return (
    <div className={SECTION}>
      <PageHeading
        en={t("page.projects.en")}
        hint={t("count.projects", { n: data.projects.length })}
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
                className={cn(CARD_HOVER, "group flex flex-col p-6")}
                href={`/projects/${project.slug}/`}
                key={project.slug}
              >
                {project.image && (
                  <img
                    alt={project.title}
                    className="mb-4 aspect-video w-full rounded-xl border border-line object-cover"
                    height={360}
                    loading="lazy"
                    src={project.image}
                    width={640}
                  />
                )}
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 text-ink-3 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </div>
                <h2 className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                  {project.title}
                </h2>
                {project.description && (
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-2">{project.description}</p>
                )}
                {project.date && <p className="mt-4 font-mono text-xs text-ink-3">{formatDateISO(project.date)}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 空状态 */}
      {data.projects.length === 0 && (
        <div className={cn(CARD, "mx-auto max-w-md px-6 py-16 text-center")}>
          <h2 className="font-serif text-lg font-semibold text-ink">{t("projects.empty.title")}</h2>
          <p className="mt-2 text-sm text-ink-3">{t("projects.empty.desc")}</p>
        </div>
      )}

      {/* GitHub 入口 */}
      <div className="text-center">
        <a className={BTN_OUTLINE} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
          <GithubIcon aria-hidden="true" className="size-4" />
          {t("projects.githubMore")}
        </a>
      </div>
    </div>
  );
}

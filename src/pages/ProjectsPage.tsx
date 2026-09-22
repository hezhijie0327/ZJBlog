// 项目列表页：个人项目卡片网格（有 frontmatter.image 时渲染封面，无图即为纯文字卡）。

import { EmptyState } from "@/components/EmptyState.tsx";
import { GithubIcon } from "@/components/icons.tsx";
import { PageHeading } from "@/components/PageHeading.tsx";
import { ProjectCard } from "@/components/ProjectCard.tsx";
import { siteConfig } from "@/config/site.ts";
import { useT } from "@/lib/i18n.ts";
import { BTN_OUTLINE, SECTION } from "@/lib/styles.ts";
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
          <p className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-strong" />
            {t("projects.selectedLabel")}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personalProjects.map((project, i) => (
              <ProjectCard heading="h2" index={i} key={project.slug} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* 空状态 */}
      {data.projects.length === 0 && (
        <EmptyState className="mx-auto max-w-md" desc={t("projects.empty.desc")} title={t("projects.empty.title")} />
      )}

      {/* GitHub 入口（mt-10 与上方 section 的 mb-16 折叠，只在空状态下提供间隔） */}
      <div className="mt-10 text-center">
        <a className={BTN_OUTLINE} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
          <GithubIcon aria-hidden="true" className="size-4" />
          {t("projects.githubMore")}
        </a>
      </div>
    </div>
  );
}

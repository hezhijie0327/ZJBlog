// Projects list page: personal project card grid (cover renders when frontmatter.image exists;
// without one the card is text-only).

import { EmptyState } from "@/components/EmptyState.tsx";
import { GithubIcon } from "@/components/icons.tsx";
import { ProjectCard } from "@/components/ProjectCard.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { BTN_OUTLINE, EYEBROW, SECTION } from "@/lib/styles.ts";
import type { ProjectsData } from "@/lib/types.ts";

export function ProjectsPage({ data }: { data: ProjectsData }) {
  const t = useT();
  const personalProjects = data.projects.filter((p) => p.type === "personal");

  return (
    <div className={SECTION}>
      <SectionHeading
        en={t("page.projects.en")}
        hint={t("count.projects", { n: data.projects.length })}
        level={1}
        title={t("page.projects.title")}
      />

      {/* Personal projects */}
      {personalProjects.length > 0 && (
        <section className="mb-16">
          <p className={cn(EYEBROW, "mb-5 flex items-center gap-2")}>
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

      {/* Empty state */}
      {data.projects.length === 0 && (
        <EmptyState className="mx-auto max-w-md" desc={t("projects.empty.desc")} title={t("projects.empty.title")} />
      )}

      {/* GitHub entry (mt-10 collapses with the section above's mb-16, providing spacing only
          in the empty state) */}
      <div className="mt-10 text-center">
        <a className={BTN_OUTLINE} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
          <GithubIcon aria-hidden="true" className="size-4" />
          {t("projects.githubMore")}
        </a>
      </div>
    </div>
  );
}

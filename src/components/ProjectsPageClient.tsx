import Link from "next/link";
import { ArrowUpRight, Image as ImageIcon, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_OUTLINE, CARD_HOVER, LIST_CONTAINER, SECTION } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { formatDateISO, hostOf } from "@/lib/utils";
import SectionHeading from "@/components/SectionHeading";
import { GithubIcon } from "@/components/icons";
import { siteConfig } from "@/config/site";

interface Project {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  type: "personal" | "starred";
  tags?: string[];
  image?: string;
  link?: string;
}

interface ProjectsPageClientProps {
  projects: Project[];
}

export default function ProjectsPageClient({
  projects,
}: ProjectsPageClientProps) {
  const personalProjects = projects.filter((p) => p.type === "personal");
  const starredProjects = projects.filter((p) => p.type === "starred");

  return (
    <div className="min-h-full">
      <div className={SECTION}>
        <SectionHeading
          index="00"
          title={t("page.projects.title")}
          en={t("page.projects.en")}
          hint={t("count.projects", { n: projects.length })}
        />

        {/* 个人项目 */}
        {personalProjects.length > 0 && (
          <section className="mb-16">
            <p className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
              <span className="inline-block size-1.5 rounded-full bg-accent-strong" />
              {t("projects.selectedLabel")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personalProjects.map((project, i) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}/`}
                  className={cn(CARD_HOVER, "group flex flex-col")}
                >
                  {/* 封面图占位：真图待后续整理（frontmatter.image 已预留） */}
                  <div className="grid aspect-video place-items-center rounded-t-2xl border-b border-line bg-surface-2">
                    <ImageIcon className="size-8 text-ink-3/50" aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-sm text-ink-3">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <ArrowUpRight className="size-4 text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-text" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-accent-text">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-2">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      {hostOf(project.link) ? (
                        <span className="truncate font-mono text-xs text-ink-3">
                          {hostOf(project.link)}
                        </span>
                      ) : (
                        <span />
                      )}
                      {project.date && (
                        <span className="shrink-0 font-mono text-xs text-ink-3">
                          {formatDateISO(project.date)}
                        </span>
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
              <Star className="size-3 text-accent-strong" />
              {t("projects.starredLabel")}
            </p>
            <div className={LIST_CONTAINER}>
              {starredProjects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}/`}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-3">
                    <span className="shrink-0 font-medium text-ink transition-colors group-hover:text-accent-text">
                      {project.title}
                    </span>
                    {project.description && (
                      <span className="hidden truncate text-sm text-ink-3 sm:inline">
                        {project.description}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent-text" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 空状态 */}
        {projects.length === 0 && (
          <div className={cn(CARD_HOVER, "mx-auto max-w-md px-6 py-16 text-center")}>
            <h3 className="font-serif text-lg font-semibold text-ink">
              {t("projects.empty.title")}
            </h3>
            <p className="mt-2 text-sm text-ink-3">
              {t("projects.empty.desc")}
            </p>
          </div>
        )}

        {/* GitHub 入口 */}
        <div className="text-center">
          <a
            href={siteConfig.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN_OUTLINE}
          >
            <GithubIcon className="size-4" />
            {t("projects.githubMore")}
          </a>
        </div>
      </div>
    </div>
  );
}

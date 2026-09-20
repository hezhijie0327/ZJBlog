import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import SectionHeading from "@/components/SectionHeading";
import { formatDateISO } from "@/lib/utils";
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

function hostOf(link?: string) {
  if (!link) return undefined;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export default function ProjectsPageClient({
  projects,
}: ProjectsPageClientProps) {
  const personalProjects = projects.filter((p) => p.type === "personal");
  const starredProjects = projects.filter((p) => p.type === "starred");

  return (
    <div className="min-h-full">
      <div className="container mx-auto px-4 py-14 sm:py-20">
        <SectionHeading
          index="00"
          title="项目"
          en="Projects"
          hint={`共 ${projects.length} 个`}
        />

        {/* 个人项目 */}
        {personalProjects.length > 0 && (
          <section className="mb-16">
            <p className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
              <span className="inline-block size-1.5 rounded-full bg-accent-strong" />
              Selected Work · 个人项目
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personalProjects.map((project, i) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}/`}
                  className="group flex flex-col rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-pop"
                >
                  {project.image && (
                    <div className="aspect-video overflow-hidden rounded-t-2xl border-b border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.image}
                        alt={project.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
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
              Starred · 精选开源项目
            </p>
            <div className="divide-y divide-line/70 rounded-2xl border border-line bg-surface">
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
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-card">
            <h3 className="font-serif text-lg font-semibold text-ink">
              暂无项目
            </h3>
            <p className="mt-2 text-sm text-ink-3">项目正在整理中，敬请期待。</p>
          </div>
        )}

        {/* GitHub 入口 */}
        <div className="text-center">
          <a
            href={siteConfig.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            <GithubIcon className="size-4" />
            在 GitHub 查看更多
          </a>
        </div>
      </div>
    </div>
  );
}

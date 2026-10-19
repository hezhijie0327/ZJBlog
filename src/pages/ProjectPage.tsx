// Project detail page: external-link CTA + body + giscus comments. The cover renders only when
// frontmatter.image is provided; without an image the page opens directly with the title.

import { ArrowUpRight } from "lucide-react";
import { BackLink } from "@/components/BackLink.tsx";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton.tsx";
import { PrintButton } from "@/components/PrintButton.tsx";
import { TagList } from "@/components/TagList.tsx";
import { GiscusComments } from "@/features/comments/GiscusComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { BTN_PRIMARY, CHIP, SECTION_DETAIL } from "@/lib/styles.ts";
import type { ProjectData } from "@/lib/types.ts";

export function ProjectPage({ data }: { data: ProjectData }) {
  const t = useT();
  const { project } = data;

  return (
    <div className={SECTION_DETAIL}>
      {/* Back link */}
      <BackLink href="/projects/" label={t("project.back")} />

      {/* Project header: the header sits directly under the container, site-wide titles share
          one left edge (DESIGN.md §6) */}
      <header className="mb-10 mt-8 border-b border-line pb-8">
        {project.image && (
          <img
            alt={project.title}
            className="mb-8 aspect-[21/9] w-full rounded-2xl border border-line object-cover shadow-card"
            decoding="async"
            fetchPriority="high"
            height={549}
            loading="eager"
            src={project.image}
            width={1280}
          />
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {project.title}
          </h1>
          <div className="flex shrink-0 items-center gap-1 pt-1 print-hide">
            <CopyMarkdownButton href={`/projects/${encodeURIComponent(project.slug)}/index.md`} />
            <PrintButton titleBase={project.title} />
          </div>
        </div>
        {project.description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">{project.description}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
          {project.date && <time dateTime={project.date}>{formatDateISO(project.date)}</time>}
          <span className={CHIP}>{project.type === "starred" ? t("project.starred") : t("project.personal")}</span>
        </div>
        <TagList className="mt-4" tags={project.tags} />

        {project.link && (
          <div className="mt-7">
            <a className={BTN_PRIMARY} href={project.link} rel="noopener noreferrer" target="_blank">
              <ArrowUpRight aria-hidden="true" className="size-4" />
              {t("project.visitLink")}
            </a>
          </div>
        )}
      </header>

      <article className="mx-auto max-w-3xl">
        {/* Body */}
        <Prose html={project.contentHtml ?? ""} needsKatex={project.needsKatex} />

        {/* giscus comments (GitHub Discussions, mapped by path) */}
        <GiscusComments />
      </article>
    </div>
  );
}

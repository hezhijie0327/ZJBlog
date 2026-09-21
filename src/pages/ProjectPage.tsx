// 项目详情页：外链 CTA + 正文 + giscus 评论区。
// 封面仅在 frontmatter.image 提供时渲染，无图直接以标题开页。

import { ArrowUpRight } from "lucide-react";
import { BackLink } from "@/components/BackLink.tsx";
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
      <article className="mx-auto max-w-3xl">
        {/* 返回链接 */}
        <BackLink href="/projects/" label={t("project.back")} />

        {/* 项目头部 */}
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
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {project.title}
          </h1>
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

        {/* 正文 */}
        <Prose html={project.contentHtml ?? ""} needsKatex={project.needsKatex} />

        {/* giscus 评论（GitHub Discussions，按路径映射） */}
        <GiscusComments />
      </article>
    </div>
  );
}

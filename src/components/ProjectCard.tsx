// 项目卡片：首页精选与项目列表页共用（标题层级随调用方传入，保证各自
// 页面的标题层级不断档）。

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { CARD_HOVER } from "@/lib/styles.ts";
import type { ProjectListItem } from "@/lib/types.ts";

interface ProjectCardProps {
  project: ProjectListItem;
  /** 卡片序号（等宽装饰编号，从 0 计） */
  index: number;
  /** 卡片标题的标签层级：列表页 h2，首页章节内 h3 */
  heading: "h2" | "h3";
}

export function ProjectCard({ project, index, heading: Heading }: ProjectCardProps) {
  return (
    <Link className={cn(CARD_HOVER, "group relative flex flex-col p-6")} href={`/projects/${project.slug}/`}>
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
        <span className="font-mono text-sm text-ink-3">{String(index + 1).padStart(2, "0")}</span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 text-ink-3 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
      <Heading className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-accent">
        {project.title}
      </Heading>
      {project.description && (
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-2">{project.description}</p>
      )}
      {project.date && <p className="mt-4 font-mono text-xs text-ink-3">{formatDateISO(project.date)}</p>}
    </Link>
  );
}

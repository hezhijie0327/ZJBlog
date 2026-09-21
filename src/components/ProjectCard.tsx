// 项目卡片：首页精选与项目列表页共用（标题层级随调用方传入，保证各自
// 页面的标题层级不断档）。
// 设计对标参考站的 SELECTED WORK 卡：胶带 + 封面 + 编号/域名 + 标题 +
// 描述 + 外链箭头。封面优先用 frontmatter.image，缺省渲染品牌化纸面封面。

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

/** 卡片上的域名行：GitHub 链接显示 owner/repo，其余取主机名。 */
function domainOf(project: ProjectListItem): string {
  if (project.link) {
    try {
      const url = new URL(project.link);
      if (url.hostname === "github.com") {
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments.length > 0) {
          return segments
            .slice(0, 2)
            .join("/")
            .replace(/\.git$/, "");
        }
      }
      return url.hostname.replace(/^www\./, "");
    } catch {
      /* 非法链接退回 slug */
    }
  }
  return project.slug;
}

export function ProjectCard({ project, index, heading: Heading }: ProjectCardProps) {
  const domain = domainOf(project);
  // 封面上的短名：取「 - 」前的主名，避免长标题在封面里换行
  const shortName = project.title.split(/\s+[-—]\s+/)[0] ?? project.title;
  return (
    <Link className={cn(CARD_HOVER, "group relative flex flex-col pt-5")} href={`/projects/${project.slug}/`}>
      {/* 胶带（纯装饰） */}
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-1/2 z-10 h-6 w-28 -translate-x-1/2 -rotate-2 bg-accent-soft/80"
      />
      {/* 封面：frontmatter.image 优先，缺省为品牌化纸面封面（首字母 + 域名） */}
      <div className="relative overflow-hidden border-b border-line">
        {project.image ? (
          <img
            alt={project.title}
            className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            height={360}
            loading="lazy"
            src={project.image}
            width={640}
          />
        ) : (
          <div className="project-cover relative flex h-40 flex-col items-center justify-center gap-1 transition-transform duration-500 group-hover:scale-[1.03]">
            <span aria-hidden="true" className="font-serif text-6xl font-black leading-none text-accent/20">
              {shortName.charAt(0)}
            </span>
            <span className="font-mono text-[11px] tracking-[0.18em] text-ink-3">{shortName}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex items-center gap-2 font-mono text-xs text-ink-3">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span aria-hidden="true" className="h-3 w-px bg-line" />
          <span className="truncate">{domain}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <Heading className="font-serif text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
            {project.title}
          </Heading>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-ink-3 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>
        {project.description && (
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-2">{project.description}</p>
        )}
        {project.date && <p className="mt-4 font-mono text-xs text-ink-3">{formatDateISO(project.date)}</p>}
      </div>
    </Link>
  );
}

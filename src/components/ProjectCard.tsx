// Project card: shared by the home page's featured section and the projects
// list page (the heading level is passed in by the caller so each page's
// heading hierarchy stays unbroken).
// Design modeled on the reference site's SELECTED WORK card: tape + cover +
// index/domain + title + description + external-link arrow. The cover prefers
// frontmatter.image; without one a branded paper cover is rendered.

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { CARD_HOVER } from "@/lib/styles.ts";
import type { ProjectListItem } from "@/lib/types.ts";

interface ProjectCardProps {
  project: ProjectListItem;
  /** Card index (mono decorative number, counted from 0) */
  index: number;
  /** Heading tag for the card title: h2 on the list page, h3 inside a home page section */
  heading: "h2" | "h3";
}

/** Domain line on the card: GitHub links show owner/repo, everything else uses the hostname. */
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
      /* Invalid link falls back to the slug */
    }
  }
  return project.slug;
}

export function ProjectCard({ project, index, heading: Heading }: ProjectCardProps) {
  const domain = domainOf(project);
  // Short name for the cover: take the main name before " - " so long titles
  // do not wrap on the cover
  const shortName = project.title.split(/\s+[-—]\s+/)[0] ?? project.title;
  // Physical feel: pinned cards each carry a slight tilt, and tape position
  // and angle vary deterministically with content (seed physics -- no random
  // numbers allowed; SSR and client hydration must match).
  const tilt = index % 2 === 0 ? "-rotate-[0.35deg]" : "rotate-[0.45deg]";
  return (
    <Link className={cn(CARD_HOVER, "group relative flex flex-col pt-5", tilt)} href={`/projects/${project.slug}/`}>
      {/* Tape (purely decorative): pressed on the card's top edge, position
          and angle vary with the title seed */}
      <Tape className="w-24 bg-accent-soft/80" seed={project.title} />
      {/* Cover: frontmatter.image first; default is the branded paper cover
          (initial letter + domain) */}
      <div className="relative overflow-hidden border-b border-line">
        {project.image ? (
          <img
            alt={project.title}
            className="aspect-[2/1] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:aspect-[16/10]"
            height={360}
            loading="lazy"
            src={project.image}
            width={640}
          />
        ) : (
          <div className="project-cover relative flex h-32 flex-col items-center justify-center gap-1 transition-transform duration-500 group-hover:scale-[1.03] sm:h-40">
            <span aria-hidden="true" className="font-serif text-6xl font-black leading-none text-accent/20">
              {shortName.charAt(0)}
            </span>
            <span className="font-mono text-xs tracking-[0.18em] text-ink-3">{shortName}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
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

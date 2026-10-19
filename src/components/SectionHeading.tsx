// Heading block: index number (mono, gold-brown, optional) + serif title +
// small English eyebrow label (optional) + right-side hint.
// level=1 is the page title (h1, large black weight); level=2 (default) is a
// section heading (h2).
// The number has no meaning on standalone list pages, hence index is optional;
// the caller keeps it width-aligned with the content column.

import { cn } from "@/lib/cn.ts";
import { EYEBROW } from "@/lib/styles.ts";

interface SectionHeadingProps {
  /** Heading level: 1 = page title (h1), 2 = section heading (h2, default) */
  level?: 1 | 2;
  /** Section index, e.g. "01" */
  index?: string;
  /** Title text (localized) */
  title: string;
  /** Small eyebrow label (mono font; an English accent in the zh UI,
      duplicates the title in the en UI -- pass empty to hide) */
  en?: string;
  /** Right-side hint (e.g. a count) */
  hint?: string;
  className?: string;
}

export function SectionHeading({ level = 2, index, title, en, hint, className }: SectionHeadingProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cn("mb-10 flex items-end justify-between gap-4", className)}>
      <div className="flex items-baseline gap-4">
        {index && <span className="font-mono text-sm font-medium text-accent">{index}</span>}
        <Heading
          className={
            level === 1
              ? "font-serif text-3xl font-black tracking-tight text-ink sm:text-4xl"
              : "font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          }
        >
          {title}
        </Heading>
        {en && <span className={cn(EYEBROW, "hidden sm:inline")}>{en}</span>}
      </div>
      {hint && <span className="font-mono text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

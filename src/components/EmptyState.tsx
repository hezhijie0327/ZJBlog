// Empty state: the shared composition from DESIGN.md §9 (icon disc + title +
// gray description + optional pill action). Inside list pages the empty state
// is a notice paper (paper-note + tape on two corners, same language as
// ZJSearch PaperEmpty, §7); full-page scenes like 404 use the bare variant
// (the paper shell is supplied by the caller) plus the h1 page-title size,
// reusing the same composition instead of writing separate ones
// (DESIGN.md §9 "404 and empty states share one structure").

import type { ReactNode } from "react";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";

interface EmptyStateProps {
  /** Top icon (rendered inside the accent-soft disc, purely decorative) */
  icon?: ReactNode;
  /** Heading level: h1 for full-page scenes like 404 (same size as the §4 page H1), h2 by default */
  heading?: "h1" | "h2";
  title?: string;
  desc: string;
  /** Bottom action (e.g. a pill link back to the home page) */
  action?: ReactNode;
  /** Drop the paper shell (full-page centered 404; the shell is supplied by the caller) */
  bare?: boolean;
  className?: string;
}

export function EmptyState({ icon, heading = "h2", title, desc, action, bare = false, className }: EmptyStateProps) {
  const Title = heading;
  const body = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent"
        >
          {icon}
        </span>
      )}
      {title && (
        <Title
          className={cn(
            "font-serif font-semibold tracking-tight text-ink",
            heading === "h1" ? "text-3xl font-black sm:text-4xl" : "text-lg",
            icon && "mt-4",
          )}
        >
          {title}
        </Title>
      )}
      <p className={cn("text-sm text-ink-2", (title || icon) && "mt-1.5")}>{desc}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </>
  );
  if (bare) {
    return <div className={cn("text-center", className)}>{body}</div>;
  }
  return (
    <div className={cn("relative", className)}>
      {/* Tape pressed on two corners of the notice paper (§7: the tape must
          be a sibling of the clipped element) */}
      <Tape className="w-20 bg-accent-soft/80" corner="start" seed="notice-a" />
      <Tape className="w-16 bg-accent-soft/60" corner="end" seed="notice-b" />
      <div className="paper-note px-6 py-16 text-center">{body}</div>
    </div>
  );
}

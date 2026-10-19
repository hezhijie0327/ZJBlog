// 404 page: prerendered as /404.html (wrangler not_found_handling); the client-side fallback
// renders the same. Notice-paper form (DESIGN.md §7, same language as ZJSearch's thread-not-found):
// torn-edge note + tape on two corners + torn-strip action (PAPER_STRIP family contract — the sole
// action of an empty state); content composition still goes through EmptyState (§9 "404 and empty
// states share one shape"), with the bare variant laid on the paper-note sheet.

import { Compass } from "lucide-react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { Link } from "@/components/Shell.tsx";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { PAPER_STRIP } from "@/lib/styles.ts";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="mx-auto flex w-full flex-1 flex-col items-center justify-center px-4 pb-24 pt-24 animate-fade-up">
      {/* Pinned to the wall with a slight tilt; tape hangs on the untilted outer layer (§7: tape
          must be a sibling of the clipped element — inside paper-note the torn edge would clip
          its corners) */}
      <div className="relative w-full max-w-xl rotate-[0.6deg]">
        <Tape className="-top-3 left-10 w-24 -rotate-3 bg-accent-soft/80" />
        <Tape className="-top-3 right-10 w-20 rotate-[4deg] bg-accent-soft/60" />
        <EmptyState
          action={
            <Link
              className={cn(
                PAPER_STRIP,
                "-rotate-1 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
              )}
              href="/"
            >
              {t("notFound.back")}
            </Link>
          }
          bare
          className="paper-note px-6 py-14 sm:px-10"
          desc={t("notFound.blurb")}
          heading="h1"
          icon={<Compass className="size-7" />}
          title="404"
        />
      </div>
    </div>
  );
}

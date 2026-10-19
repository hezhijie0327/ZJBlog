// End-of-post author card: letter-signoff language (DESIGN.md §7, same
// narrative as the lock screen's sealed letter) -- blank torn-edge paper +
// a single tape pressed on one corner + a small CC-license postmark. The
// postmark text duplicates the in-body license link, so it demotes to a
// decorative layer (§7: the postmark is the only paper-craft piece allowed to
// carry real information, provided the information has no other source).
// Not printed onto the paper: the .print-wordmark injected by print.ts is the
// printed copy's signature, avoiding a double signoff.

import { Tape } from "@/components/Tape.tsx";
import { useT } from "@/lib/i18n.ts";

export function AuthorCard() {
  const t = useT();
  const author = t("site.author");
  return (
    <div className="print-hide relative mt-12 rotate-[0.35deg]">
      {/* Single tape on one corner (§7: the tape must be a sibling of the
          clipped element; inside the paper it gets cut off by the torn edge) */}
      <Tape className="w-20 bg-accent-soft/60" corner="end" seed={author} />
      <div className="paper-note paper-note--blank flex items-center gap-4 p-5">
        <img
          alt={author}
          className="size-12 shrink-0 rounded-full object-cover ring-1 ring-line"
          height={48}
          loading="lazy"
          src="/avatar.jpg"
          width={48}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{t("post.authorBy", { author })}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            <a
              className="transition-colors hover:text-accent"
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
              rel="noopener noreferrer"
              target="_blank"
            >
              CC BY-NC-SA 4.0
            </a>{" "}
            · {t("post.licenseNote")}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="paper-postmark pointer-events-none hidden size-16 shrink-0 rotate-12 text-ink-3 sm:grid"
        >
          <span className="font-mono text-xs font-semibold">CC</span>
          {/* Negative right margin cancels the trailing tracking gap so the
              postmark text is optically centered (same trick as LockScreen) */}
          <span className="-mr-[0.18em] font-mono text-[7px] leading-none tracking-[0.18em]">BY-NC-SA</span>
        </div>
      </div>
    </div>
  );
}

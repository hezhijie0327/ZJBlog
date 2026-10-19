// Lock screen: a sealed letter (DESIGN.md §7 paper-craft language) -- the
// torn-edge letterhead .paper-note sits at a slight tilt, tape pressed on two
// corners (must be a sibling of the clip-path element), and a round "SEALED"
// postmark in the bottom-right. The password form goes pending while Argon2id
// derives (roughly the hundred-millisecond scale); a GCM authentication
// failure = wrong password, so the error shows in place and the typed input
// is kept.
// Shared by blog posts and travel detail pages; unlockKey is the namespace
// key of the unlock cache (blogs and travels can share the same slug).

import { Lock } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { UnlockError, type UnlockedBundle, unlockPost } from "@/lib/locked.ts";
import { EYEBROW, PAPER_STRIP } from "@/lib/styles.ts";
import type { LockedContent } from "@/lib/types.ts";

export function LockScreen({
  locked,
  onUnlock,
  slug,
  unlockKey,
}: {
  locked: LockedContent;
  onUnlock: (bundle: UnlockedBundle) => void;
  slug: string;
  /** Unlock cache namespace key (e.g. travel:<slug>); falls back to slug */
  unlockKey?: string;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The lock screen's primary action is typing the password: focus the input
  // on mount (same pattern as CommandPalette focusing on open; the autoFocus
  // attribute is avoided to pass the a11y noAutofocus gate)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || password === "") {
      return;
    }
    setPending(true);
    setFailed(false);
    let bundle: UnlockedBundle;
    try {
      // The cache key carries the namespace (unlockKey); the asset name is
      // always the bare slug -- mixing the two makes .bin requests 404
      // (see the unlockPost comment)
      bundle = await unlockPost(unlockKey ?? slug, locked, password, slug);
    } catch (error) {
      if (!(error instanceof UnlockError)) {
        throw error;
      }
      setFailed(true);
      setPending(false);
      return;
    }
    onUnlock(bundle);
  }

  return (
    <div className="relative mx-auto mt-2 max-w-lg rotate-[0.45deg]">
      {/* Tape pressed on two corners, over the torn paper edge (§7: the tape
          is a sibling of the clipped element) */}
      <Tape className="w-24 bg-accent-soft/80" corner="start" seed={`${slug}-a`} />
      <Tape className="w-20 bg-accent-soft/60" corner="end" seed={`${slug}-b`} />

      {/* Round postmark (DESIGN.md §7 .paper-postmark shared primitive; keep
          the recipe in sync on both sides): stamped on the letter in the
          bottom-right, hidden on narrow screens to stay clear of the text.
          The lock-screen postmark is pure decoration, aria-hidden. */}
      <div
        aria-hidden="true"
        className="paper-postmark pointer-events-none absolute bottom-6 right-6 z-10 hidden size-20 rotate-12 text-ink-3 sm:grid"
      >
        <Lock className="size-4" />
        {/* Negative right margin cancels the trailing tracking gap after the
            last letter so the postmark text sits optically centered in the
            ring */}
        <span className="-mr-[0.22em] font-mono text-[8px] leading-none tracking-[0.22em]">SEALED</span>
      </div>

      <div className="paper-note px-7 pb-10 pt-12 sm:px-10">
        <p className={EYEBROW}>{t("lock.eyebrow")}</p>
        <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-ink">{t("lock.title")}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">{t("lock.desc")}</p>

        <form className="mt-7 max-w-sm" onSubmit={handleSubmit}>
          <label className={cn(EYEBROW, "block")} htmlFor="lock-password">
            {t("lock.label")}
          </label>
          <input
            aria-describedby={failed ? "lock-error" : undefined}
            aria-invalid={failed || undefined}
            autoComplete="off"
            className={cn(
              "mt-2 h-10 w-full border-b bg-transparent font-mono text-sm tracking-[0.2em] text-ink outline-none transition-colors placeholder:text-ink-3",
              failed ? "border-danger" : "border-line focus-visible:border-accent",
            )}
            disabled={pending}
            id="lock-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setFailed(false);
            }}
            placeholder={t("lock.placeholder")}
            ref={inputRef}
            type="password"
            value={password}
          />
          <button
            className={cn(
              PAPER_STRIP,
              "-rotate-1 mt-6 px-6 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
            disabled={pending || password === ""}
            type="submit"
          >
            {pending ? t("lock.pending") : t("lock.submit")}
          </button>
          {failed && (
            <p className="mt-4 text-sm text-danger" id="lock-error" role="alert">
              {t("lock.wrong")}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

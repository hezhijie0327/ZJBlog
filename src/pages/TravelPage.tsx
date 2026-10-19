// Travel detail: header (date range · place · companion) + build-time story body + giscus.
// Locked trips (trip.locked set) replace the body with a lock screen: story and photos live in
// the envelope; the unlock cache uses the travel:<slug> namespace (no collision with blog slugs).

import { Heart, MapPin, User } from "lucide-react";
import { useState } from "react";
import { BackLink } from "@/components/BackLink.tsx";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton.tsx";
import { LockScreen } from "@/components/LockScreen.tsx";
import { PrintButton } from "@/components/PrintButton.tsx";
import { GiscusComments } from "@/features/comments/GiscusComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { getCachedUnlock, type UnlockedBundle } from "@/lib/locked.ts";
import { CHIP, SECTION_DETAIL } from "@/lib/styles.ts";
import type { TravelData } from "@/lib/types.ts";

export function TravelPage({ data }: { data: TravelData }) {
  const t = useT();
  const { trip } = data;
  // Initialize unlocked state from the session cache (always empty on first load = consistent
  // with SSR, hydration-safe)
  const [unlocked, setUnlocked] = useState<UnlockedBundle | null>(() =>
    trip.locked ? (getCachedUnlock(`travel:${trip.slug}`) ?? null) : null,
  );
  const html = unlocked?.html ?? trip.contentHtml ?? "";

  return (
    <div className={SECTION_DETAIL}>
      {/* Header sits directly under the container: site-wide titles share one left edge
          (DESIGN.md §6) */}
      <BackLink href="/travels/" label={t("travel.back")} />

      <header className="mb-10 mt-8 border-b border-line pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {trip.title}
          </h1>
          {/* Export action group; locked trips offer no exports */}
          {!trip.locked && (
            <div className="flex shrink-0 items-center gap-1 pt-1 print-hide">
              <CopyMarkdownButton href={`/travels/${encodeURIComponent(trip.slug)}/index.md`} />
              <PrintButton titleBase={trip.title} />
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
          {trip.date && (
            <time dateTime={trip.date}>
              {formatDateISO(trip.date)}
              {trip.endDate && ` – ${formatDateISO(trip.endDate)}`}
            </time>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-3" />
            {trip.place}
          </span>
          <span className={CHIP}>
            {trip.companion === "solo" ? (
              <>
                <User aria-hidden="true" className="mr-1 inline size-3" />
                {t("travel.solo")}
              </>
            ) : (
              <>
                <Heart aria-hidden="true" className="mr-1 inline size-3 fill-accent-strong text-accent-strong" />
                {t("travel.couple")}
              </>
            )}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        {trip.locked && !unlocked ? (
          /* Locked trip: the lock screen takes the body slot (story/photos are encrypted
             content) */
          <LockScreen locked={trip.locked} onUnlock={setUnlocked} slug={trip.slug} unlockKey={`travel:${trip.slug}`} />
        ) : (
          <>
            {/* Story body (locked trip = plaintext after unlock) */}
            <Prose html={html} needsKatex={trip.needsKatex} />
            <GiscusComments />
          </>
        )}
      </div>
    </div>
  );
}

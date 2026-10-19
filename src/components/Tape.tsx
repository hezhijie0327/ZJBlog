// Tape (DESIGN.md §7 paper-craft decoration): a translucent rectangle pressed
// over a paper edge. The decoration iron rules (aria-hidden +
// pointer-events-none) are built into the TAPE snippet; width / opacity come
// from the caller. Composition scales with paper width -- full-width wide
// paper gets a single top-center strip (center), medium paper gets two
// corners pressed, narrow sticky notes get a single corner; corners already
// overlapped by another paper piece get no tape. With a `seed` (a content
// string) the placement varies deterministically -- corner side, a few px of
// drift, and a ±4..7° rotation all follow the content, so a page of pinned
// cards no longer looks stamped from one mold, while staying fully stable
// across re-renders and SSR hydration (physics contract: never random, never
// jittering). The algorithm is DESIGN.md §7's "seed physics spec" -- the
// family's single authoritative definition; this implementation must match it
// verbatim.

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn.ts";
import { TAPE } from "@/lib/styles.ts";

type TapeCorner = "start" | "end" | "center";

// DESIGN.md §7 tapePhysics -- do not change the constants; spec changes go
// into DESIGN.md first, then sync both sides. Shifts always use the logical
// right shift `>>>`: about half of djb2 results are >= 2^31, and the
// arithmetic right shift `>>` sign-extends as int32 and produces negative
// offsets, dragging inset / rotate out of the spec's value range (confirmed
// breakage during 2026-10 visual debugging, do not revert). `corner` picks
// the composition: start/end corner press (the two-corner composition assigns
// left/right itself; the two tapes on one paper use different seeds with
// different drifts); center is top-center (wide-paper composition, rotated
// after translateX centering; drift only adds a ±12px hand-tuned offset).
function tapePhysics(seed: string, corner?: TapeCorner): CSSProperties {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  const top = -(6 + (h % 4));
  const rotate = (h % 2 === 0 ? 1 : -1) * (4 + ((h >>> 4) % 4));
  if (corner === "center") {
    const drift = ((h >>> 6) % 5) * 6 - 12;
    return {
      left: `calc(50% + ${drift}px)`,
      top: `${top}px`,
      transform: `translateX(-50%) rotate(${rotate}deg)`,
    };
  }
  const inset = 24 + ((h >>> 2) % 5) * 4;
  const side = corner ?? (h % 2 === 0 ? "start" : "end");
  return side === "start"
    ? { insetInlineStart: `${inset}px`, top: `${top}px`, transform: `rotate(${rotate}deg)` }
    : { insetInlineEnd: `${inset}px`, top: `${top}px`, transform: `rotate(${rotate}deg)` };
}

export function Tape({
  className,
  seed,
  corner,
}: {
  className?: string;
  seed?: string;
  /** Composition: start/end corner press (the two-corner composition assigns
      left/right itself); center is top-center; omit and the corner side
      follows the seed */
  corner?: TapeCorner;
}) {
  return (
    <span aria-hidden="true" className={cn(TAPE, className)} style={seed ? tapePhysics(seed, corner) : undefined} />
  );
}

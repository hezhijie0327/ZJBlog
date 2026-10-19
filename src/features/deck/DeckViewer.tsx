// Slide player: shared by full-deck blog posts (BlogPostPage) and in-post
// embeds (Prose placeholder). The first frame renders all slides stacked
// vertically (= the SSR/no-JS shape: full content in the DOM, hydration-safe);
// after mounting it upgrades to page-by-page playback: keyboard
// (←→/PgUp/PgDn/Home/End), buttons, page counter, #N deep link (full mode
// only), speaker notes, fullscreen show, with a switch back to continuous
// (stacked) browsing.
//
// Scaling is pure CSS: the stage is an inline-size query container and
// --deck-scale uses tan(atan2(100cqw, 1280px)) to get the ratio of container
// width to the 1280px canvas — fullscreen/column changes follow automatically
// with no JS measurement; in stacked mode the canvas total height is unknown
// under scaling, so a ResizeObserver syncs the stage height (transform does
// not participate in layout; the parent must explicitly give it height).
//
// Host CSS (HOST_CSS) holds only the rules utility classes cannot reach:
// they target the inert sections injected via dangerouslySetInnerHTML (mode
// show/hide, shiki dark-theme switching, decoration beyond marpit scoping);
// colors are always tokens. The deck theme CSS (tools/deckTheme.css after
// marpit scoping) arrives with the payload/placeholder structure and is
// injected here alongside.

import { ChevronLeft, ChevronRight, Maximize, Minimize, Printer, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fitVisibleSlides, observeLateContent } from "@/features/deck/deckFit.ts";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { ensureKatexStyles } from "@/lib/katex.ts";
import { startPrintPreview } from "@/lib/print.ts";
import { CHIP, ICON_BTN, META } from "@/lib/styles.ts";

export interface DeckViewerProps {
  /** Slide HTML (build-time artifact; full post = contentHtml backfill,
   *  embed = extracted from the placeholder structure) */
  html: string;
  /** Deck theme CSS (full post = payload post.deck.css; embed = inlined in
   *  the placeholder structure) */
  css?: string;
  /** Embed form: no #N deep link; keyboard works only while the container is
   *  focused */
  embedded?: boolean;
  /** Print filename base (zjblog_<title>); in embeds the caller passes the
   *  host article title */
  titleBase?: string;
  /** Slides contain KaTeX formulas (re-injects /katex.min.css on SPA
   *  navigation, same as Prose) */
  needsKatex?: boolean;
}

interface ParsedSlide {
  /** Slide HTML with speaker notes stripped (for page-by-page rendering) */
  slide: string;
  /** Speaker notes (the build-time-injected .deck-notes, already escaped) */
  notes: string;
}

/** Split into per-slide pages (marpit sections never nest, so non-greedy
 *  matching is safe). */
function splitSlides(html: string): ParsedSlide[] {
  return [...html.matchAll(/<section\b[\s\S]*?<\/section>/g)].map((match) => {
    const raw = match[0] ?? "";
    const notes = /<aside class="deck-notes">([\s\S]*?)<\/aside>/.exec(raw)?.[1] ?? "";
    return { slide: raw.replace(/<aside class="deck-notes">[\s\S]*?<\/aside>/, ""), notes };
  });
}

function parseSlideHash(hash: string): number | null {
  const match = /^#(\d+)$/.exec(hash);
  if (!match?.[1]) {
    return null;
  }
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
}

/** Host styles: only rules JSX utility classes cannot express (see the file
 *  header comment). */
const HOST_CSS = `
.deck-root { --deck-canvas-w: 1280px; }
.deck-stage {
  position: relative;
  container-type: inline-size;
  --deck-scale: calc(tan(atan2(100cqw, var(--deck-canvas-w))));
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--bg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.deck-canvas {
  width: var(--deck-canvas-w);
  transform: scale(var(--deck-scale));
  transform-origin: top left;
}
/* Paged mode: the stage locks 16:9; the canvas is absolutely positioned at
   the origin and scaled */
.deck-root[data-mode="paged"] .deck-stage { aspect-ratio: 16 / 9; }
.deck-root[data-mode="paged"] .deck-canvas { position: absolute; left: 0; top: 0; }
.deck-root[data-mode="paged"] .deck-canvas section { animation: deck-slide-in 0.28s ease; }
@keyframes deck-slide-in {
  from { opacity: 0; transform: translateX(14px); }
  to { opacity: 1; transform: none; }
}
/* Stacked: sections stack vertically (JS syncs the stage height to the
   scaled canvas) */
.deck-root[data-mode="stacked"] .deck-canvas section + section { border-top: 1px solid var(--line); }
/* Speaker notes never enter the canvas (paged mode shows them in the React
   panel) */
.deck-root .marpit section .deck-notes { display: none; }
/* shiki dual theme: light defaults live in the deck theme CSS (marpit scoping
 * cannot write .dark ancestor selectors); dark switching is handled here */
.dark .deck-root .marpit section pre { color: var(--shiki-dark); }
.dark .deck-root .marpit section pre span { color: var(--shiki-dark); }
/* Fullscreen show: styles are driven by React state (data-fullscreen) instead
 * of the :fullscreen pseudo-class — in webview/preview environments the
 * native Fullscreen API is often half-broken (DOM state gets set, the view
 * never expands, fullscreenchange never fires); hanging styles on state
 * guarantees a visible reaction when the button is clicked in any
 * environment. Pseudo-fullscreen = a fixed overlay; it applies equally under
 * real fullscreen. The control bar stays on screen, inset within the safe
 * area (DESIGN §18). */
.deck-root[data-fullscreen] {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--bg);
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
    max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  overflow: auto;
}
.deck-root[data-fullscreen] .deck-stage {
  width: min(100%, calc((100dvh - 48px - 64px) * 16 / 9));
  margin-inline: auto;
}
/* On the stage, horizontal swipes go to JS paging; vertical stays with page
   scrolling */
.deck-stage {
  touch-action: pan-y;
}
/* Non-active pages in paged mode: Tailwind preflight's [hidden] is layered
 * !important (unlayered rules always lose to layered ones in the cascade),
 * so page swaps use a custom attribute + a rule of our own */
.deck-canvas section[data-slide-hidden] {
  display: none !important;
}
/* ── Print / preview paper: **a viewport-independent, uniformly scaled
 * flow**. Desktop Chrome/Edge lays out with marpit's built-in @page 1280×720
 * (landscape), so the scale naturally resolves to 1 and slides fill pages
 * one-to-one; in pipelines that do **not support @page size** (iOS AirPrint
 * and the like), the scale follows the print layout width (cqw adapts),
 * laying out proportionally for the user-selected paper, one slide per page,
 * uncut. So never hardcode width: 1280px — pipelines whose layout width
 * ≠ 1280 (iOS printing is exactly this) would truncate horizontally and
 * produce blank pages. Chrome hidden, hidden pages revealed, blocks kept
 * unsplit; the embed form follows the same rules (zoom's cqw baseline is
 * already the host column width).
 * Keep the @media print and html.print-preview (preview face, see
 * lib/print.ts / print.css) rule lists in sync. ── */
@media print {
  .deck-root [data-deck-chrome] {
    display: none !important;
  }
  /* Print paper is always light: code highlighting is forced back to the
     shiki light variables */
  .dark .deck-root .marpit section pre,
  .dark .deck-root .marpit section pre span {
    color: var(--shiki-light) !important;
  }
  .deck-root .deck-stage {
    aspect-ratio: auto !important;
    overflow: visible !important;
    height: auto !important;
    border: none;
    box-shadow: none;
    border-radius: 0;
    /* Center when the scaled slide is narrower than the paper (non-@page
       layout pipelines) */
    margin-inline: auto !important;
  }
  .deck-root .deck-canvas {
    position: static !important;
    transform: none !important;
    zoom: var(--deck-scale) !important;
  }
  .deck-root .deck-canvas section[data-slide-hidden] {
    display: block !important;
  }
  .deck-root .deck-canvas section {
    break-inside: avoid;
    page-break-inside: avoid;
    /* One slide per page: the section's fixed 720px height shares the @page
       frame, and an explicit break pins the boundary (overflow by even one
       pixel will not merge pages); the last section's auto avoids a trailing
       blank page */
    break-after: page;
  }
  .deck-root .deck-canvas section:last-child {
    break-after: auto;
  }
}
.print-preview .deck-root [data-deck-chrome] {
  display: none !important;
}
.print-preview .deck-root .deck-stage {
  aspect-ratio: auto !important;
  overflow: visible !important;
  height: auto !important;
  border: none;
  box-shadow: none;
  border-radius: 0;
  margin-inline: auto !important;
}
.print-preview .deck-root .deck-canvas {
  position: static !important;
  transform: none !important;
  zoom: var(--deck-scale) !important;
}
.print-preview .deck-root .deck-canvas section[data-slide-hidden] {
  display: block !important;
}
.print-preview .deck-root .deck-canvas section {
  break-inside: avoid;
  break-after: page;
}
.print-preview .deck-root .deck-canvas section:last-child {
  break-after: auto;
}
/* Preview paper is always light: code highlighting is forced back to the
   shiki light variables */
.print-preview.dark .deck-root .marpit section pre,
.print-preview.dark .deck-root .marpit section pre span {
  color: var(--shiki-light) !important;
}
`;

/** No-JS fallback: the default paged form clips later slides outside the
 *  16:9 stage; without JS this expands the canvas into the full stacked view.
 *  Injected into <head> as <noscript><style> conditionally per page by
 *  tools/ssr.tsx (when JS is available, noscript content in head has no
 *  effect). HOST_CSS lives in the body and applies after head, so overrides
 *  need !important; zoom replaces transform with layout scaling (transform
 *  does not participate in layout, so after expansion the parent cannot get
 *  the real height). */
export const DECK_NOSCRIPT_CSS = `
.deck-root .deck-stage { aspect-ratio: auto !important; overflow: visible !important; }
.deck-root .deck-canvas { position: static !important; transform: none !important; zoom: var(--deck-scale); }
.deck-root .deck-canvas section + section { border-top: 1px solid var(--line) !important; }
.deck-root [data-deck-chrome] { display: none !important; }
`;

export function DeckViewer({ html, css, embedded = false, needsKatex = false, titleBase }: DeckViewerProps) {
  const t = useT();
  // Default paged form: SSR renders the 16:9 stage directly (the canvas holds
  // all slides, overflow clipping reveals only the first page), so visuals
  // are identical before/after hydration → zero CLS; without JS, the
  // <noscript> styles in head (DECK_NOSCRIPT_CSS, conditionally injected by
  // ssr.tsx) reveal the stacked view. The canvas is always the full DOM: a
  // slide change only toggles hidden per section (no innerHTML rewrite), so
  // print/preview can reach every page at any moment.
  const [mode, setMode] = useState<"paged" | "stacked">("paged");
  const [active, setActive] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  // Fullscreen dual track: the native Fullscreen API can be half-broken in
  // webview/preview environments (DOM state gets set but the view never
  // expands, events never fire); on promise rejection or unavailability we
  // fall back to pseudo-fullscreen (a fixed overlay with the data-fullscreen
  // styles), so the button gives a visible reaction in every environment
  const [nativeFs, setNativeFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  // Whether the user has changed slides: the hash is written only after
  // interaction, so the initial load never stuffs #1 into the URL
  const interacted = useRef(false);

  const slides = useMemo(() => splitSlides(html), [html]);
  const total = slides.length;

  // Functional update: rapid taps or multiple events in one frame never
  // compute from a stale active index
  const goTo = useCallback(
    (next: number | ((prev: number) => number)) => {
      interacted.current = true;
      setActive((prev) => {
        const target = typeof next === "function" ? next(prev) : next;
        return Math.max(0, Math.min(total - 1, target));
      });
    },
    [total],
  );

  // Slides contain KaTeX formulas: re-inject /katex.min.css on SPA navigation
  // (the head is not swapped on SPA navigation — same as Prose)
  useEffect(() => {
    if (needsKatex) {
      ensureKatexStyles();
    }
  }, [needsKatex]);

  // #N deep link consumption (full mode): the stage size is fixed, so slide
  // changes never shift content
  useEffect(() => {
    if (total === 0 || embedded) {
      return;
    }
    const initial = parseSlideHash(window.location.hash);
    if (initial !== null) {
      setActive(Math.min(initial, total - 1));
    }
  }, [embedded, total]);

  // Slide change = toggling hidden per section on the full DOM (print/preview
  // need every page permanently in the document); display:none ↔ block also
  // replays the CSS slide-change animation automatically. Visible sections
  // get aria semantics patched in place (the canvas is inert DOM from
  // dangerouslySetInnerHTML and cannot be declared via JSX).
  // After switching, run overflow fitting on the newly visible page
  // (display:none pages cannot be measured; measure on arrival).
  // biome-ignore lint/correctness/useExhaustiveDependencies: html is intentional — unlock/navigation injects a new blob and hidden/aria must be reapplied
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.querySelectorAll("section").forEach((section, index) => {
      const isActive = mode === "paged" && index === active;
      section.toggleAttribute("data-slide-hidden", mode === "paged" && index !== active);
      if (isActive) {
        section.setAttribute("role", "group");
        section.setAttribute("aria-roledescription", t("deck.slide"));
        section.setAttribute("aria-label", t("deck.slideN", { m: total, n: index + 1 }));
      } else {
        section.removeAttribute("role");
        section.removeAttribute("aria-roledescription");
        section.removeAttribute("aria-label");
      }
    });
    fitVisibleSlides(canvas);
  }, [mode, active, html, total, t]);

  // Overflow re-fit triggered by late content (mermaid svg replacing the
  // placeholder, image loads) — after a chart renders, its page may go from
  // "fits" to "no longer fits"
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    return observeLateContent(canvas);
  }, []);

  // mermaid placeholder containers (produced by tools/deck.ts): mount a
  // MermaidRenderer on each for lazy rendering — the renderer brings its own
  // useInView (display:none hidden pages never trigger; they render on
  // arrival) and the print light-mode coordination (print-mermaid-light/
  // restore events), matching the behavior of charts inside articles.
  // When html changes (unlock/embed injection) the old roots die with
  // innerHTML, so remount the whole set.
  // biome-ignore lint/correctness/useExhaustiveDependencies: html is intentional — same as above
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const roots: Root[] = [];
    for (const el of canvas.querySelectorAll<HTMLElement>(".mermaid-placeholder")) {
      const root = createRoot(el);
      root.render(<MermaidRenderer chart={el.dataset.chart ?? ""} />);
      roots.push(root);
    }
    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, [html, total]);

  // Sync the hash after a slide change (full mode): a hash-only replaceState
  // does not trigger the router's popstate routing (verified); active values
  // arriving from deep links/hashchange are not written back
  useEffect(() => {
    if (!interacted.current || embedded) {
      return;
    }
    window.history.replaceState(null, "", `#${active + 1}`);
  }, [active, embedded]);

  // Follow browser back/forward or manual hash edits (full mode; the router
  // does not take over hash-only changes)
  useEffect(() => {
    if (embedded) {
      return;
    }
    const onHashChange = () => {
      const n = parseSlideHash(window.location.hash);
      if (n !== null) {
        setActive(Math.min(n, total - 1));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [embedded, total]);

  // Sync native fullscreen state (Esc / system gesture exits must also settle
  // the button state)
  useEffect(() => {
    const onFullscreenChange = () => setNativeFs(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Pseudo-fullscreen exit: Esc (native fullscreen Esc is handled by the
  // browser itself)
  useEffect(() => {
    if (!pseudoFs) {
      return;
    }
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPseudoFs(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [pseudoFs]);

  // Stacked mode: stage height = the canvas's actual post-scale height
  // (transform does not participate in layout)
  useEffect(() => {
    if (mode !== "stacked") {
      return;
    }
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) {
      return;
    }
    const sync = () => {
      stage.style.height = `${canvas.getBoundingClientRect().height}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      stage.style.height = "";
    };
  }, [mode]);

  const onKey = useCallback(
    (event: { key: string; preventDefault: () => void; target: EventTarget | null }) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          goTo((prev) => prev + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          goTo((prev) => prev - 1);
          break;
        case "Home":
          event.preventDefault();
          goTo(0);
          break;
        case "End":
          event.preventDefault();
          goTo(total - 1);
          break;
        default:
          break;
      }
    },
    [goTo, total],
  );

  // Full mode: window-level keyboard paging (embedded mode uses the container
  // onKeyDown so article scrolling is not hijacked)
  useEffect(() => {
    if (embedded || mode !== "paged") {
      return;
    }
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [embedded, mode, onKey]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      // Optimistic set: environments where fullscreenchange never fires must
      // still settle the button state
      setNativeFs(false);
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    const el = rootRef.current;
    if (el?.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen().then(
        () => setNativeFs(true),
        () => setPseudoFs(true),
      );
    } else {
      setPseudoFs(true);
    }
  };

  const fullscreen = nativeFs || pseudoFs;

  const current = slides[active];

  return (
    <div
      className="deck-root"
      data-embedded={embedded || undefined}
      data-fullscreen={fullscreen || undefined}
      data-mode={mode}
      // Embedded form: the container is focusable so keyboard paging does not
      // hijack article scrolling; full mode uses the window listener
      onKeyDown={embedded ? (event) => onKey(event) : undefined}
      ref={rootRef}
      tabIndex={embedded ? 0 : undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: HOST_CSS }} />
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}

      {/* Slide canvas: always the full DOM (SSR-identical; data-deck-content
          lets pageData.ts backfill contentHtml); slide changes toggle hidden
          per section via the effect */}
      <div
        className="deck-stage"
        onTouchEnd={(event) => {
          const start = touchX.current;
          touchX.current = null;
          if (start === null || mode !== "paged") {
            return;
          }
          const dx = (event.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) > 48) {
            goTo((prev) => prev + (dx < 0 ? 1 : -1));
          }
        }}
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        ref={stageRef}
      >
        {/* marpit theme CSS scopes under div.marpit > section, so this
            container class is required */}
        <div
          className="deck-canvas marpit"
          dangerouslySetInnerHTML={{ __html: html }}
          data-deck-content
          ref={canvasRef}
        />
      </div>

      {/* Speaker notes panel: follows the current slide in paged mode
          (escaped at build time) */}
      {showNotes && mode === "paged" && (current?.notes ?? "") !== "" && (
        <div
          className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2 [&_p]:m-0 [&_p+p]:mt-1.5"
          dangerouslySetInnerHTML={{ __html: current?.notes ?? "" }}
          data-deck-chrome
        />
      )}

      {/* Control bar: always rendered (inserting it after mount would push
          the content below down, counting as CLS). Stacked mode keeps only
          the mode toggle and fullscreen; paging controls appear/disappear
          with paged mode — that shift happens within 500ms of a user click
          and does not count as CLS. */}
      {total > 0 && (
        <div className="mt-3 flex items-center gap-1.5" data-deck-chrome>
          {mode === "paged" && (
            <>
              <button
                aria-label={t("deck.prev")}
                className={ICON_BTN}
                disabled={active === 0}
                onClick={() => goTo((prev) => prev - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <span className={cn(META, "min-w-14 text-center tabular-nums")}>
                {active + 1} / {total}
              </span>
              <button
                aria-label={t("deck.next")}
                className={ICON_BTN}
                disabled={active === total - 1}
                onClick={() => goTo((prev) => prev + 1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </>
          )}

          <span className="flex-1" />

          {mode === "paged" && (
            <button
              aria-label={t("deck.notes")}
              aria-pressed={showNotes}
              className={cn(ICON_BTN, showNotes && "bg-surface-2 text-ink")}
              onClick={() => setShowNotes((v) => !v)}
              type="button"
            >
              <StickyNote aria-hidden="true" className="size-4" />
            </button>
          )}
          <button
            className={cn(CHIP, "transition-colors hover:border-accent hover:text-accent")}
            onClick={() => setMode(mode === "paged" ? "stacked" : "paged")}
            type="button"
          >
            {mode === "paged" ? t("deck.modeStacked") : t("deck.modePaged")}
          </button>
          <button
            aria-label={t("deck.print")}
            className={ICON_BTN}
            onClick={() => {
              // Print uses the full paper flow (marpit @page per-slide breaks
              // take over pagination)
              setMode("stacked");
              startPrintPreview({
                closeLabel: t("print.close"),
                hint: t("deck.print.hint"),
                titleBase: titleBase ?? "",
              });
            }}
            title={t("deck.print")}
            type="button"
          >
            <Printer aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label={fullscreen ? t("deck.exitFullscreen") : t("deck.fullscreen")}
            className={ICON_BTN}
            onClick={toggleFullscreen}
            type="button"
          >
            {fullscreen ? (
              <Minimize aria-hidden="true" className="size-4" />
            ) : (
              <Maximize aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Travels: real-world map (build-time SVG, single DOM copy at #travel-map, backfilled through
// the pageData pipeline under the same contract as contentHtml) + per-stop footprint lighting
// animation (pure CSS, --seq choreography, replay button restarts it) + postcard wall
// (deterministic tilt + tape + cover lightbox). Locked trips: postcards keep pins/place/dates
// (the commemorative layer), cover and summary never ship, titles lead to the detail lock screen.

import { Heart, Lock, Maximize, Play, User, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { Lightbox, type LightboxItem } from "@/components/Lightbox.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, CARD_HOVER, CHIP, EYEBROW, ICON_BTN, MONO_CHIP, PAPER_STRIP, SECTION } from "@/lib/styles.ts";
import { TRAVEL_MAP_SIZE, type TravelListItem, type TravelsData } from "@/lib/types.ts";

const MAP_W = TRAVEL_MAP_SIZE.w;
const MAP_H = TRAVEL_MAP_SIZE.h;
const ZOOM_MIN = 1;
const ZOOM_MAX = 660;

/** Map zoom/pan controller: wheel/two-finger pinch zoom (pointer-centered), drag to pan,
 *  double-click to zoom in; reads/writes the initial transform baked into the SVG at build
 *  time (pins auto-fitted to the viewport). The zoom factor is synced to --map-zoom on the
 *  root; pins/labels counter-scale via calc(1/var) to keep a constant on-screen size; lines
 *  use non-scaling-stroke. */
function useMapZoom(rootRef: React.RefObject<HTMLDivElement | null>) {
  // Each map (main + city close-up) keeps its own viewport state; buttons address by container
  const apiMapRef = useRef(new Map<HTMLDivElement, MapApi>());

  useEffect(() => {
    const containers = rootRef.current?.querySelectorAll<HTMLDivElement>(".travel-map");
    const disposers: Array<() => void> = [];
    for (const container of containers ?? []) {
      disposers.push(attachMapController(container, apiMapRef.current));
    }
    return () => {
      for (const off of disposers) {
        off();
      }
      apiMapRef.current.clear();
    };
  }, [rootRef]);

  const zoomBy = (container: HTMLDivElement | null, factor: number) => {
    container && apiMapRef.current.get(container)?.zoomBy(factor);
  };
  const resetWorld = (container: HTMLDivElement | null) => {
    container && apiMapRef.current.get(container)?.resetWorld();
  };
  const flyTo = (
    container: HTMLDivElement | null,
    view: [number, number, number],
    durationMs: number,
  ): Promise<void> => {
    const api = container ? apiMapRef.current.get(container) : undefined;
    return api ? api.flyTo(view, durationMs) : Promise.resolve();
  };
  const light = (container: HTMLDivElement | null, idx: number) => {
    container && apiMapRef.current.get(container)?.light(idx);
  };
  return { zoomBy, resetWorld, flyTo, light };
}

interface MapApi {
  zoomBy: (factor: number) => void;
  resetWorld: () => void;
  /** Camera flies to the given viewport (ease-in-out; respects reduced-motion → instantaneous) */
  flyTo: (view: [number, number, number], durationMs: number) => Promise<void>;
  /** Lights up elements with data-play = idx (used by the replay choreography) */
  light: (idx: number) => void;
}

/** Attaches gestures and the button API to a single map container (independent viewport state). */
function attachMapController(container: HTMLDivElement, apiMap: Map<HTMLDivElement, MapApi>): () => void {
  {
    const svg = container.querySelector("svg");
    const world = container.querySelector(".map-world");
    if (!svg || !(world instanceof SVGGElement)) {
      return () => {};
    }
    // City-level elements: fade in once the zoom factor ≥ data-threshold (cluster pins hide
    // in reverse)
    const cityEls = [...container.querySelectorAll<SVGElement>("[data-threshold]")].map((el) => ({
      el,
      threshold: Number(el.getAttribute("data-threshold")),
      hideWhenOpen: el.classList.contains("cluster-agg"),
    }));
    const updateCityVisibility = () => {
      for (const city of cityEls) {
        const open = state.k >= city.threshold;
        city.el.classList.toggle(city.hideWhenOpen ? "off" : "on", open);
      }
    };
    // Adopt the initial viewport from the build-time transform (no jump)
    const match = /translate\(([-\d.]+)[ ,]([-\d.]+)\)\s*scale\(([-\d.]+)\)/.exec(
      world.getAttribute("transform") ?? "",
    );
    const matchResult = match;
    const state = {
      k: matchResult ? Number(matchResult[3]) : 1,
      tx: matchResult ? Number(matchResult[1]) : 0,
      ty: matchResult ? Number(matchResult[2]) : 0,
    };

    const clampApply = () => {
      state.k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.k));
      state.tx = Math.min(0, Math.max(MAP_W * (1 - state.k), state.tx));
      state.ty = Math.min(0, Math.max(MAP_H * (1 - state.k), state.ty));
      svg.style.setProperty("--map-zoom", state.k.toFixed(3));
      world.setAttribute(
        "transform",
        `translate(${state.tx.toFixed(2)} ${state.ty.toFixed(2)}) scale(${state.k.toFixed(3)})`,
      );
      updateCityVisibility();
    };
    const toUser = (clientX: number, clientY: number): [number, number] => {
      const rect = svg.getBoundingClientRect();
      return [((clientX - rect.left) / rect.width) * MAP_W, ((clientY - rect.top) / rect.height) * MAP_H];
    };
    const zoomAt = (px: number, py: number, next: number) => {
      const k2 = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
      state.tx = px - ((px - state.tx) * k2) / state.k;
      state.ty = py - ((py - state.ty) * k2) / state.k;
      state.k = k2;
      clampApply();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const [px, py] = toUser(event.clientX, event.clientY);
      zoomAt(px, py, state.k * Math.exp(-event.deltaY * 0.0016));
    };

    const pointers = new Map<number, [number, number]>();
    let drag: { id: number; lastX: number; lastY: number } | null = null;
    let moved = false; // suppress the anchor click after a drag (accidental pin jumps)
    let pinchDist: number | null = null;

    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      if (pointers.size === 1) {
        drag = { id: event.pointerId, lastX: event.clientX, lastY: event.clientY };
        moved = false;
        svg.setPointerCapture(event.pointerId);
      } else if (pointers.size === 2) {
        drag = null;
        const pts = [...pointers.values()];
        const a = pts[0];
        const b = pts[1];
        if (a && b) {
          pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        }
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      pointers.set(event.pointerId, [event.clientX, event.clientY]);
      if (pinchDist !== null && pointers.size === 2) {
        const pts = [...pointers.values()];
        const a = pts[0];
        const b = pts[1];
        if (!a || !b) {
          return;
        }
        const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const [px, py] = toUser(event.clientX, event.clientY);
        if (dist > 0) {
          zoomAt(px, py, state.k * (dist / pinchDist));
        }
        pinchDist = dist;
        return;
      }
      if (drag && event.pointerId === drag.id) {
        const rect = svg.getBoundingClientRect();
        const dx = ((event.clientX - drag.lastX) / rect.width) * MAP_W;
        const dy = ((event.clientY - drag.lastY) / rect.height) * MAP_H;
        if (Math.abs(event.clientX - drag.lastX) + Math.abs(event.clientY - drag.lastY) > 4) {
          moved = true;
        }
        state.tx += dx;
        state.ty += dy;
        clampApply();
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (drag && event.pointerId === drag.id) {
        drag = null;
      }
      if (pointers.size < 2) {
        pinchDist = null;
      }
    };
    // Camera fly-through (ease-in-out; instantaneous under reduced-motion).
    // Driven by setTimeout instead of rAF: rAF is paused in background tabs and the
    // animation would stall.
    const flyTo = (view: [number, number, number], durationMs: number): Promise<void> =>
      new Promise((resolve) => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const duration = reduced ? 0 : durationMs;
        const from = { k: state.k, tx: state.tx, ty: state.ty };
        const t0 = performance.now();
        const frame = () => {
          const p = duration === 0 ? 1 : Math.min(1, (performance.now() - t0) / duration);
          const ease = p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
          state.k = from.k + (view[2] - from.k) * ease;
          state.tx = from.tx + (view[0] - from.tx) * ease;
          state.ty = from.ty + (view[1] - from.ty) * ease;
          clampApply();
          if (p < 1) {
            window.setTimeout(frame, 16);
          } else {
            resolve();
          }
        };
        window.setTimeout(frame, 16);
      });

    // Swallow the click immediately following a drag/pinch so pin anchors are not hit by
    // accident; clicking a "city ×N" cluster pin → camera pushes into the city view
    // (details and members fade in)
    const onClickCapture = (event: MouseEvent) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const agg = target?.closest(".cluster-agg");
      if (agg) {
        event.preventDefault();
        event.stopPropagation();
        const k = Number(agg.getAttribute("data-threshold")) || 8;
        const pos = agg.querySelector<HTMLElement>(".trip-pos");
        const x = parseFloat(pos?.style.getPropertyValue("--x") ?? "0");
        const y = parseFloat(pos?.style.getPropertyValue("--y") ?? "0");
        const tx = Math.max(MAP_W * (1 - k), Math.min(0, MAP_W / 2 - k * x));
        const ty = Math.max(MAP_H * (1 - k), Math.min(0, MAP_H / 2 - k * y));
        void flyTo([tx, ty, k], 900);
      }
    };
    const onDoubleClick = (event: MouseEvent) => {
      const [px, py] = toUser(event.clientX, event.clientY);
      zoomAt(px, py, state.k * 1.7);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("click", onClickCapture, true);
    container.addEventListener("dblclick", onDoubleClick);

    // Button entries: zoom around the viewport center / reset to the whole-map view (shares
    // one state with the gestures)
    const api: MapApi = {
      zoomBy: (factor) => {
        zoomAt(MAP_W / 2, MAP_H / 2, state.k * factor);
      },
      resetWorld: () => {
        state.k = 1;
        state.tx = 0;
        state.ty = 0;
        clampApply();
      },
      flyTo,
      light: (idx) => {
        for (const el of container.querySelectorAll(`[data-play="${idx}"]`)) {
          el.classList.add("on");
        }
      },
    };
    apiMap.set(container, api);
    return () => {
      apiMap.delete(container);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("click", onClickCapture, true);
      container.removeEventListener("dblclick", onDoubleClick);
    };
  }
}

export function TravelsPage({ data }: { data: TravelsData }) {
  const t = useT();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapsRootRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const { resetWorld, zoomBy, flyTo, light } = useMapZoom(mapsRootRef);
  const couples = data.trips.filter((trip) => trip.companion === "couple").length;

  // The build-time SVG aria-label is Chinese-baseline (same pattern as the copy button);
  // corrected in place to the current UI language after hydration; re-runs with t on
  // language switches
  useEffect(() => {
    mapRef.current?.querySelector("svg")?.setAttribute("aria-label", t("travel.mapLabel"));
  }, [t]);
  // Lightbox items = postcards that have covers (in display order)
  const covers: LightboxItem[] = data.trips
    .filter((trip) => trip.cover !== undefined)
    .map((trip) => ({ alt: trip.title, kind: "img", src: trip.cover as string }));

  // Replay our footsteps: a camera fly-through — reset to the world viewport, then fly stop
  // by stop (flyTo), lighting pins and tracks on arrival; city cluster stops push into the
  // city/district view, light their members one by one, then continue.
  // Wedding scene = F11 fullscreen + hit replay.
  const [playing, setPlaying] = useState(false);
  async function replay() {
    const map = mapRef.current;
    if (!map || playing) {
      return;
    }
    setPlaying(true);
    try {
      map.classList.remove("lit");
      for (const el of map.querySelectorAll(".on")) {
        el.classList.remove("on");
      }
      resetWorld(map);
      await new Promise((resolve) => setTimeout(resolve, 450));
      let stops: Array<{ v: [number, number, number]; p: number[] }> = [];
      try {
        stops = JSON.parse(map.querySelector("svg")?.getAttribute("data-stops") ?? "[]") as typeof stops;
      } catch {
        stops = [];
      }
      for (const stop of stops) {
        await flyTo(map, stop.v, 1000);
        for (const idx of stop.p) {
          light(map, idx);
        }
        await new Promise((resolve) => setTimeout(resolve, 480));
      }
    } finally {
      setPlaying(false);
    }
  }

  return (
    <div className={SECTION}>
      <SectionHeading
        en={t("page.travels.en")}
        hint={t("travel.stats", { n: data.trips.length, m: couples })}
        level={1}
        title={t("page.travels.title")}
      />
      <div className="mx-auto max-w-6xl">
        {data.trips.length === 0 ? (
          <EmptyState desc={t("travel.empty")} />
        ) : (
          <div ref={mapsRootRef}>
            {/* Map card: build-time real-geography SVG + per-stop lighting (replay: see replay) */}
            <div className={cn(CARD, "p-3 sm:p-5")}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3 pt-1">
                <p className={EYEBROW}>{t("travel.eyebrow")}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* Legend shows only at ≥sm: frees small-screen space so the controls fit on
                      one row (the color semantics are carried by the pin shapes themselves) */}
                  <span className="hidden items-center gap-1.5 font-mono text-xs text-ink-2 sm:inline-flex">
                    <Heart aria-hidden="true" className="size-3 fill-accent-strong text-accent-strong" />
                    {t("travel.couple")}
                  </span>
                  <span className="hidden items-center gap-1.5 font-mono text-xs text-ink-2 sm:inline-flex">
                    <User aria-hidden="true" className="size-3 text-accent-strong" />
                    {t("travel.solo")}
                  </span>
                  <button
                    aria-label={t("travel.replay")}
                    className={cn(ICON_BTN, "size-8")}
                    disabled={playing}
                    onClick={replay}
                    title={t("travel.replay")}
                    type="button"
                  >
                    <Play aria-hidden="true" className="size-4" />
                  </button>
                  <span aria-hidden="true" className="h-4 w-px bg-line" />
                  <button
                    aria-label={t("travel.zoomIn")}
                    className={cn(ICON_BTN, "size-8")}
                    onClick={() => zoomBy(mapRef.current, 1.4)}
                    title={t("travel.zoomIn")}
                    type="button"
                  >
                    <ZoomIn aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    aria-label={t("travel.zoomOut")}
                    className={cn(ICON_BTN, "size-8")}
                    onClick={() => zoomBy(mapRef.current, 1 / 1.4)}
                    title={t("travel.zoomOut")}
                    type="button"
                  >
                    <ZoomOut aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    aria-label={t("travel.zoomWorld")}
                    className={cn(ICON_BTN, "size-8")}
                    onClick={() => resetWorld(mapRef.current)}
                    title={t("travel.zoomWorld")}
                    type="button"
                  >
                    <Maximize aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
              <div
                className="travel-map lit overflow-hidden rounded-xl border border-line"
                dangerouslySetInnerHTML={{ __html: data.mapSvg ?? "" }}
                id="travel-map"
                ref={mapRef}
              />
            </div>

            {/* Postcard wall */}
            <div className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-2 sm:gap-y-14">
              {data.trips.map((trip, index) => (
                <Postcard
                  index={index}
                  key={trip.slug}
                  onPreview={() => {
                    const i = covers.findIndex((cover) => cover.kind === "img" && cover.src === trip.cover);
                    if (i >= 0) {
                      setPreview(i);
                    }
                  }}
                  trip={trip}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {preview !== null && <Lightbox initialIndex={preview} items={covers} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** Postcard card: deterministic tilt; with cover = polaroid (thumbtack + string pinned toward
 *  the map card, after physical travel photo walls), without cover = taped note (postcard-back
 *  ruled strip). Cover click opens the lightbox, title goes to the detail page (locked trip =
 *  lock screen), link points to the related story. */
function Postcard({ index, onPreview, trip }: { index: number; onPreview: () => void; trip: TravelListItem }) {
  const t = useT();
  const tilt = index % 2 === 0 ? "-rotate-[0.35deg]" : "rotate-[0.45deg]";

  return (
    <article className="group relative scroll-mt-24" id={trip.slug}>
      <div className={cn("relative", tilt)}>
        {trip.cover ? (
          // Thumbtack string: pin head + thread rising above the wall (first row points at the
          // map card, later rows pin onto the wall); purely decorative aria-hidden, rises into
          // the row gap without taking layout space
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center"
          >
            <span className="size-2.5 rounded-full bg-accent-strong shadow-card ring-2 ring-accent-soft" />
            <span className="h-8 w-px bg-line" />
          </div>
        ) : (
          <Tape className="h-6 w-24 bg-accent-soft/80" seed={trip.title} />
        )}
        <div className={cn(CARD_HOVER, "overflow-hidden")}>
          {trip.cover ? (
            // Polaroid white frame: image inset with a margin (the card body is the thick
            // photo-paper edge)
            <button
              aria-label={trip.title}
              className="block w-full cursor-zoom-in p-2 pb-0"
              onClick={onPreview}
              type="button"
            >
              <img
                alt={trip.title}
                className="aspect-[2/1] w-full rounded-[4px] object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:aspect-[16/10]"
                height={360}
                loading="lazy"
                src={trip.cover}
                width={640}
              />
            </button>
          ) : (
            // No cover is the norm: the placeholder keeps only a single postcard-back ruled
            // strip (ruled paper texture + dashed corner stamp), no longer filling the whole
            // 2:1 slot
            <div aria-hidden="true" className="project-cover relative h-12 w-full sm:h-14">
              <span className="absolute right-4 top-1/2 size-7 -translate-y-1/2 rotate-3 rounded-[4px] border border-dashed border-line bg-surface/70" />
            </div>
          )}
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-ink-3">
                {trip.date && formatDateISO(trip.date)}
                {trip.endDate && ` – ${formatDateISO(trip.endDate)}`}
              </span>
              <span className="inline-flex items-center gap-2">
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
                {trip.locked && (
                  <span className={MONO_CHIP} title={t("post.locked")}>
                    <Lock aria-hidden="true" className="size-3" />
                    <span className="sr-only">{t("post.locked")}</span>
                  </span>
                )}
              </span>
            </div>
            {/* h2: postcards are top-level sections after the h1 (the heading-order gate
                requires stepwise descent) */}
            <h2 className="mt-2 font-serif text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
              <Link className="block" href={`/travels/${trip.slug}/`}>
                {trip.title}
              </Link>
            </h2>
            {/* Summary clamped to 3 lines on mobile: itinerary-length summaries would push a
                postcard past one screen (desktop two-column keeps the full text) */}
            {trip.summary && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2 sm:line-clamp-none">{trip.summary}</p>
            )}
            {trip.link && (
              <Link
                className={cn(
                  PAPER_STRIP,
                  "-rotate-1 mt-4 h-9 px-4 text-sm [--strip:var(--surface)] hover:text-accent",
                )}
                href={trip.link}
              >
                {t("travel.readStory")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

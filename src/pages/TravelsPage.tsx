// 旅行相册：真实世界地图（构建期 SVG，#travel-map 单份存 DOM，同 contentHtml
// 契约由 pageData 管道回填）+ 足迹逐站点亮动画（纯 CSS，--seq 编排，重放按钮
// 重启动画）+ 明信片墙（确定性歪斜 + 胶带 + 封面灯箱）。锁定旅行：明信片保留
// 针脚/地名/日期（纪念层），封面与摘要不出站，标题进详情锁屏。

import { Heart, Lock, Maximize, Play, User, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { Lightbox, type LightboxImage } from "@/components/Lightbox.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, CARD_HOVER, CHIP, EYEBROW, ICON_BTN, MONO_CHIP, PAPER_STRIP, SECTION } from "@/lib/styles.ts";
import type { TravelListItem, TravelsData } from "@/lib/types.ts";

/** 地图 SVG 的用户坐标尺寸（tools/travelMap.ts 的 W/H） */
const MAP_W = 1280;
const MAP_H = 484;
const ZOOM_MIN = 1;
const ZOOM_MAX = 660;

/** 地图缩放/平移控制器：滚轮/双指捏合缩放（以指针为中心）、拖拽平移、
 *  双击放大；读写构建期嵌进 SVG 的初始 transform（针脚自适应视野）。
 *  缩放倍率同步到根上的 --map-zoom，针脚/标签经 calc(1/var) 反缩放保持
 *  屏幕恒定大小；线条用 non-scaling-stroke。 */
function useMapZoom(rootRef: React.RefObject<HTMLDivElement | null>) {
  // 每张地图（主图 + 城市特写）各自一份视野状态；按钮按容器寻址
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
  /** 镜头飞行到指定视野（ease-in-out；respects reduced-motion → 瞬时） */
  flyTo: (view: [number, number, number], durationMs: number) => Promise<void>;
  /** 点亮 data-play = idx 的元素（重放编排用） */
  light: (idx: number) => void;
}

/** 给单张地图容器挂手势与按钮 API（独立视野状态）。 */
function attachMapController(container: HTMLDivElement, apiMap: Map<HTMLDivElement, MapApi>): () => void {
  {
    const svg = container.querySelector("svg");
    const world = container.querySelector(".map-world");
    if (!svg || !(world instanceof SVGGElement)) {
      return () => {};
    }
    // 市内视角元素：倍率 ≥ data-threshold 时淡入（组合针脚反向隐藏）
    const cityEls = [...container.querySelectorAll<SVGElement>("[data-threshold]")].map((el) => ({
      el,
      threshold: Number(el.getAttribute("data-threshold")),
      hideWhenOpen: el.classList.contains("cluster-agg"),
    }));
    const updateCityVisibility = () => {
      for (const city of cityEls) {
        const open = state.k >= city.threshold;
        el_toggle(city, open);
      }
    };
    const el_toggle = (city: { el: SVGElement; hideWhenOpen: boolean }, open: boolean) => {
      city.el.classList.toggle(city.hideWhenOpen ? "off" : "on", city.hideWhenOpen ? open : open);
    };
    // 从构建期 transform 采纳初始视野（不跳变）
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
    let moved = false; // 拖拽后抑制锚点 click（误触针脚跳转）
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
    // 镜头飞行（ease-in-out；reduced-motion 瞬时到达）。
    // 用 setTimeout 而非 rAF 驱动：后台标签页 rAF 会被暂停，动画会卡死。
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

    // 拖拽/捏合结束时吃掉紧跟的 click，避免误触针脚锚点；
    // 点击「城市 ×N」组合针脚 → 镜头推进到市内视角（细节与成员淡入）
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

    // 按钮入口：以视野中心缩放 / 回到整图视野（与手势共用同一份状态）
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
  // 灯箱素材 = 有封面的明信片（按展示顺序）
  const covers: LightboxImage[] = data.trips
    .filter((trip) => trip.cover !== undefined)
    .map((trip) => ({ src: trip.cover as string, alt: trip.title }));

  // 重放我们的步伐：镜头跟拍编排 —— 复位到世界视野，随后逐站飞行
  // （ flyTo ），到站点亮针脚与轨迹；城市聚合站推进到市/区视角逐个点亮
  // 再继续。婚礼场景 = F11 全屏 + 点重放。
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
            {/* 地图卡：构建期真实地理 SVG + 逐站点亮（重放见 replay） */}
            <div className={cn(CARD, "p-3 sm:p-5")}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3 pt-1">
                <p className={EYEBROW}>{t("travel.eyebrow")}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
                    <Heart aria-hidden="true" className="size-3 fill-accent-strong text-accent-strong" />
                    {t("travel.couple")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
                    <User aria-hidden="true" className="size-3 text-accent-strong" />
                    {t("travel.solo")}
                  </span>
                  <button
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
                    className={cn(ICON_BTN, "size-8")}
                    onClick={() => zoomBy(mapRef.current, 1.4)}
                    title={t("travel.zoomIn")}
                    type="button"
                  >
                    <ZoomIn aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    className={cn(ICON_BTN, "size-8")}
                    onClick={() => zoomBy(mapRef.current, 1 / 1.4)}
                    title={t("travel.zoomOut")}
                    type="button"
                  >
                    <ZoomOut aria-hidden="true" className="size-4" />
                  </button>
                  <button
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

            {/* 明信片墙 */}
            <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2">
              {data.trips.map((trip, index) => (
                <Postcard
                  index={index}
                  key={trip.slug}
                  onPreview={() => {
                    const i = covers.findIndex((image) => image.src === trip.cover);
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

      {preview !== null && <Lightbox images={covers} initialIndex={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** 明信片卡：确定性歪斜 + 胶带（ProjectCard 同语言）。封面点击进灯箱，
 *  标题进详情（锁定旅行 = 锁屏），link 指向相关游记。 */
function Postcard({ index, onPreview, trip }: { index: number; onPreview: () => void; trip: TravelListItem }) {
  const t = useT();
  const tilt = index % 2 === 0 ? "-rotate-[0.35deg]" : "rotate-[0.45deg]";
  const tape =
    index % 3 === 0
      ? "left-1/2 -translate-x-1/2 -rotate-2"
      : index % 3 === 1
        ? "left-10 -rotate-6"
        : "right-10 rotate-[5deg]";

  return (
    <article className="group relative scroll-mt-24" id={trip.slug}>
      <div className={cn("relative", tilt)}>
        <Tape className={cn("-top-3 h-6 w-24 bg-accent-soft/80", tape)} />
        <div className={cn(CARD_HOVER, "overflow-hidden")}>
          {trip.cover ? (
            <button aria-label={trip.title} className="block w-full cursor-zoom-in" onClick={onPreview} type="button">
              <img
                alt={trip.title}
                className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                height={360}
                loading="lazy"
                src={trip.cover}
                width={640}
              />
            </button>
          ) : (
            <div aria-hidden="true" className="project-cover aspect-[16/10] w-full" />
          )}
          <div className="p-6">
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
            <h3 className="mt-2 font-serif text-xl font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
              <Link className="block" href={`/travels/${trip.slug}/`}>
                {trip.title}
              </Link>
            </h3>
            {trip.summary && <p className="mt-2 text-sm leading-relaxed text-ink-2">{trip.summary}</p>}
            {trip.link && (
              <Link
                className={cn(
                  PAPER_STRIP,
                  "-rotate-1 mt-4 h-9 px-4 text-[13px] [--strip:var(--surface)] hover:text-accent",
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

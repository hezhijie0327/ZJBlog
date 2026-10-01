// 真实世界地图 SVG 生成器（构建期，Node 侧）：world-atlas（Natural Earth
// 数据，公有领域）→ topoToGeo → 等距圆柱投影 → token 配色的内联 SVG。
//
// 主图固定世界范围（城际尺度）。市内旅行（彼此 ≤0.7°）聚合为一枚
// 「城市 ×N」组合针脚；点击后客户端镜头推进到市内视角 —— 10m 高精度
// 海岸线细节层与成员针脚随视角按需淡入（构建期按 bbox 裁选烘进主图，
// 体积仅数 KB）。「重放」的镜头编排（每站相机视野 + 逐元素点亮序号）
// 经 data-stops 下发，由 TravelsPage 的控制器执行：有缩放、有聚焦。
//
// 体积控制：去南极洲、投影后整数坐标、微小环剔除、细节层按 bbox 裁选，
// 产物单份存 DOM（不进 page-data）。

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { TRAVEL_MAP_SIZE, type TravelListItem } from "../src/lib/types.ts";
import { topoToGeo } from "./diagrams.ts";

/** 地图画布与经纬范围（收极地防变形，去南极洲）。
 *  H = 136° × (W/360°)：经纬像素密度一致，地图无拉伸。 */
const W = TRAVEL_MAP_SIZE.w;
const H = TRAVEL_MAP_SIZE.h;
const WORLD_EXTENT = { lonMin: -180, lonMax: 180, latMin: -58, latMax: 78 };

/** 城市聚合半径（度）；市内视角最大倍率（10m 数据的表达极限）。 */

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** 投影器：等距圆柱、经纬像素密度一致（extent 决定视野）。 */
interface Projector {
  (lon: number, lat: number): [number, number];
  extent: { lonMin: number; lonMax: number; latMin: number; latMax: number };
}

function makeProjector(extent: { lonMin: number; lonMax: number; latMin: number; latMax: number }): Projector {
  const { lonMin, lonMax, latMin, latMax } = extent;
  const project = (lon: number, lat: number): [number, number] => {
    const x = Math.round(((lon - lonMin) / (lonMax - lonMin)) * W);
    const y = Math.round(((latMax - Math.max(latMin, Math.min(latMax, lat))) / (latMax - latMin)) * H);
    return [Math.max(0, Math.min(W, x)), Math.max(0, Math.min(H, y))];
  };
  project.extent = extent;
  return project;
}

const worldProject = makeProjector(WORLD_EXTENT);

/** 取 geometry 的全部多边形（Polygon/MultiPolygon；其余忽略）：
 *  返回 [多边形][环][点]。 */
function ringsOf(geometry: unknown): [number, number][][][] {
  if (!geometry || typeof geometry !== "object") {
    return [];
  }
  const geo = geometry as { type?: string; coordinates?: unknown };
  if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
    return [geo.coordinates as [number, number][][]];
  }
  if (geo.type === "MultiPolygon" && Array.isArray(geo.coordinates)) {
    return geo.coordinates as [number, number][][][];
  }
  return [];
}

/** 底图只在构建期读取（createRequire 直连 node_modules，不进 bundle）。
 *  110m 画世界，10m 画市内细节（海岸线）；转换结果按精度缓存。 */
const geoCache = new Map<110 | 10, Array<{ properties?: { name?: string }; geometry?: unknown }>>();

function countriesGeo(detail: 110 | 10): Array<{ properties?: { name?: string }; geometry?: unknown }> {
  let features = geoCache.get(detail);
  if (!features) {
    const require = createRequire(import.meta.url);
    const file = require.resolve(`world-atlas/countries-${detail}m.json`);
    const geo = topoToGeo(JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) as {
      features?: typeof features;
    };
    features = geo.features ?? [];
    geoCache.set(detail, features);
  }
  return features;
}

/** 环的经纬 bbox（市内细节按此裁选要素） */
function ringExtentDeg(ring: [number, number][]): { lonMin: number; lonMax: number; latMin: number; latMax: number } {
  let lonMin = 180;
  let lonMax = -180;
  let latMin = 90;
  let latMax = -90;
  for (const [lon, lat] of ring) {
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  }
  return { lonMin, lonMax, latMin, latMax };
}

function intersects(
  a: { lonMin: number; lonMax: number; latMin: number; latMax: number },
  b: { lonMin: number; lonMax: number; latMin: number; latMax: number },
): boolean {
  return a.lonMin <= b.lonMax && a.lonMax >= b.lonMin && a.latMin <= b.latMax && a.latMax >= b.latMin;
}

/** 底图国家路径：projector 决定视野与投影；minAreaPx 剔除不可见微小环；
 *  extent 给定时只保留与之相交的环（市内细节的裁选）。 */
function countryPathData(
  detail: 110 | 10,
  project: Projector,
  minAreaPx: number,
  extent?: { lonMin: number; lonMax: number; latMin: number; latMax: number },
): string[] {
  const paths: string[] = [];
  for (const feature of countriesGeo(detail)) {
    // 南极洲在主图纬度带以下，直接剔除
    if (feature.properties?.name === "Antarctica") {
      continue;
    }
    let d = "";
    for (const polygon of ringsOf(feature.geometry)) {
      for (const ring of polygon) {
        if (extent && !intersects(ringExtentDeg(ring), extent)) {
          continue;
        }
        const projected = ring.map(([lon, lat]) => project(lon, lat));
        // 微小环剔除：投影后面积 < minAreaPx 的岛屿/洞在当前尺度不可见
        let area2 = 0;
        for (let i = 0; i < projected.length - 1; i += 1) {
          const [x1, y1] = projected[i] as [number, number];
          const [x2, y2] = projected[i + 1] as [number, number];
          area2 += x1 * y2 - x2 * y1;
        }
        if (Math.abs(area2) / 2 < minAreaPx) {
          continue;
        }
        d += `M${projected.map(([x, y]) => `${x},${y}`).join("L")}Z`;
      }
    }
    if (d !== "") {
      paths.push(d);
    }
  }
  return paths;
}

/** 经纬网（每 30°，主图海报质感） */
function graticule(project: Projector): string {
  let d = "";
  for (let lon = -150; lon <= 180; lon += 30) {
    const [x] = project(lon, 0);
    d += `M${x},0L${x},${H}`;
  }
  for (let lat = -30; lat <= 60; lat += 30) {
    const [, y] = project(0, lat);
    d += `M0,${y}L${W},${y}`;
  }
  return `<path class="map-graticule" vector-effect="non-scaling-stroke" d="${d}"/>`;
}

/** 按日期升序（点亮序）。 */
function orderedTrips(trips: TravelListItem[]): TravelListItem[] {
  return [...trips].sort((a, b) => {
    if (a.date && b.date) {
      return Date.parse(a.date) - Date.parse(b.date);
    }
    return a.date ? -1 : b.date ? 1 : 0;
  });
}

function pinShape(companion: TravelListItem["companion"]): string {
  if (companion === "solo") {
    // 独行：空心圆环
    return '<circle class="trip-pin-ring" r="5.5" fill="none" stroke-width="3"/>';
  }
  // 情侣：心形（琥珀填充）
  return '<path class="trip-pin-heart" d="M0 4.3C-5.7 -1.1 -5.9 -5.9 -2.4 -6.6C-1.1 -6.9 0 -5.8 0 -4.7C0 -5.8 1.1 -6.9 2.4 -6.6C5.9 -5.9 5.7 -1.1 0 4.3Z" stroke-width="1.3"/>';
}

/** 针脚锚点（data-play = 重放点亮的序号；缺省不参与重放编排）。
 *  点亮 .on 挂在 <a> 上，内部针脚 pop、标签浮现。 */
function anchorMarkup(item: {
  x: number;
  y: number;
  label: string;
  companion: TravelListItem["companion"];
  href: string;
  title: string;
  play: number;
  /** 点亮序（.lit 初始编排的动画 delay 依据） */
  seq: number;
  labelDy: number;
  extraClass?: string;
  extraAttrs?: string;
}): string {
  return (
    `<a class="trip-anchor${item.extraClass ? ` ${item.extraClass}` : ""}" href="${escapeXml(item.href)}" style="--seq:${item.seq}"${item.extraAttrs ?? ""}` +
    `${item.play >= 0 ? ` data-play="${item.play}"` : ""}>` +
    `<g class="trip-pos" style="--x:${item.x}px;--y:${item.y}px">` +
    `<g class="trip-pin">${pinShape(item.companion)}<circle r="12" fill="transparent"/>` +
    `<title>${escapeXml(item.title)}</title></g>` +
    `<text class="trip-label" x="0" y="${item.labelDy}" text-anchor="middle">${escapeXml(item.label)}</text>` +
    `</g></a>`
  );
}

/** 市内细节路径（点级裁选）：只保留落在视野（外扩 5%）内的坐标点 ——
 *  10m 大环（整条大陆海岸）按环引入会把页面撑到 MB 级，按点裁选后仅数 KB。 */
function clippedDetailPaths(
  project: Projector,
  extent: { lonMin: number; lonMax: number; latMin: number; latMax: number },
): string[] {
  const marginLon = (extent.lonMax - extent.lonMin) * 0.05;
  const marginLat = (extent.latMax - extent.latMin) * 0.05;
  const box = {
    lonMin: extent.lonMin - marginLon,
    lonMax: extent.lonMax + marginLon,
    latMin: extent.latMin - marginLat,
    latMax: extent.latMax + marginLat,
  };
  const paths: string[] = [];
  for (const feature of countriesGeo(10)) {
    if (feature.properties?.name === "Antarctica") {
      continue;
    }
    let d = "";
    for (const polygon of ringsOf(feature.geometry)) {
      for (const ring of polygon) {
        if (!intersects(ringExtentDeg(ring), extent)) {
          continue;
        }
        const kept: [number, number][] = [];
        for (const [lon, lat] of ring) {
          if (lon >= box.lonMin && lon <= box.lonMax && lat >= box.latMin && lat <= box.latMax) {
            kept.push([lon, lat]);
          }
        }
        if (kept.length < 3) {
          continue;
        }
        const projected = kept.map(([lon, lat]) => project(lon, lat));
        const deduped: string[] = [];
        for (const [x, y] of projected) {
          const token = `${x},${y}`;
          if (deduped[deduped.length - 1] !== token) {
            deduped.push(token);
          }
        }
        if (deduped.length >= 3) {
          d += `M${deduped.join("L")}Z`;
        }
      }
    }
    if (d !== "") {
      paths.push(d);
    }
  }
  return paths;
}

/** 城市聚合成物：市内视角（相机 fly 目标）、开启阈值、细节层与成员针脚。 */
interface CityCluster {
  id: string;
  place: string;
  view: [number, number, number];
  threshold: number;
  /** 10m 细节层（世界坐标路径，市内视角淡入） */
  detailPaths: string[];
  /** 成员针脚标记（市内视角淡入；data-play 占位待分配） */
  memberAnchors: string[];
}

const CLUSTER_RADIUS_DEG = 0.7;
/** 市内视角最大倍率（10m 数据的表达极限）。 */
const CITY_K_MAX = 640;

/** 聚类标签：成员 place 以「·」分段后的公共首段（如「上海」），
 *  无公共段则退化为首条 place。 */
function clusterLabel(members: TravelListItem[]): string {
  const first = members[0];
  if (!first) {
    return "";
  }
  if (members.length === 1) {
    return first.place;
  }
  const segs = members.map((m) => m.place.split("·")[0]?.trim() ?? "");
  const common = segs.every((seg) => seg !== "" && seg === segs[0]) ? (segs[0] as string) : first.place;
  return `${common} ×${members.length}`;
}

/** 贪心聚类（按日期序）：与既有聚合质心 ≤ CLUSTER_RADIUS_DEG 即归并。 */
function buildClusters(ordered: TravelListItem[]): Array<{ trips: TravelListItem[]; centroid: [number, number] }> {
  const clusters: Array<{ trips: TravelListItem[]; centroid: [number, number] }> = [];
  for (const trip of ordered) {
    let joined = false;
    for (const cluster of clusters) {
      const [cx, cy] = cluster.centroid;
      if (Math.hypot(trip.coords[0] - cx, trip.coords[1] - cy) <= CLUSTER_RADIUS_DEG) {
        cluster.trips.push(trip);
        const n = cluster.trips.length;
        cluster.centroid = [
          (cluster.centroid[0] * (n - 1) + trip.coords[0]) / n,
          (cluster.centroid[1] * (n - 1) + trip.coords[1]) / n,
        ];
        joined = true;
        break;
      }
    }
    if (!joined) {
      clusters.push({ trips: [trip], centroid: [trip.coords[0], trip.coords[1]] });
    }
  }
  return clusters;
}

/** 城市视角：适配成员针脚包围盒（留白约 1/5 画布），倍率上限 CITY_K_MAX。 */
function cityView(members: TravelListItem[]): [number, number, number] {
  const points = members.map((m) => worldProject(m.coords[0], m.coords[1]));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const padX = W * 0.18;
  const padY = H * 0.2;
  const k = Math.min(
    CITY_K_MAX,
    Math.max(
      1,
      Math.min(W / (Math.max(...xs) - Math.min(...xs) + padX * 2), H / (Math.max(...ys) - Math.min(...ys) + padY * 2)),
    ),
  );
  const tx = Math.max(W * (1 - k), Math.min(0, W / 2 - k * ((Math.min(...xs) + Math.max(...xs)) / 2)));
  const ty = Math.max(H * (1 - k), Math.min(0, H / 2 - k * ((Math.min(...ys) + Math.max(...ys)) / 2)));
  return [Number(tx.toFixed(1)), Number(ty.toFixed(1)), Number(k.toFixed(1))];
}

/** 城市聚合成物：10m 细节层（世界坐标，市内视角淡入）+ 成员针脚
 *  （data-play 占位 __PLAY_i__，由主图构建分配全局序号）。 */
function buildCityCluster(id: string, members: TravelListItem[]): CityCluster {
  const view = cityView(members);
  const k = view[2];
  // 成员包围盒（度）外扩约 35% 画布，作为 10m 细节的裁选范围
  const lons = members.map((m) => m.coords[0]);
  const lats = members.map((m) => m.coords[1]);
  const marginLon = (W * 0.35) / k / (W / 360);
  const marginLat = (H * 0.35) / k / (H / 136);
  const extent = {
    lonMin: Math.min(...lons) - marginLon,
    lonMax: Math.max(...lons) + marginLon,
    latMin: Math.max(WORLD_EXTENT.latMin, Math.min(...lats) - marginLat),
    latMax: Math.min(WORLD_EXTENT.latMax, Math.max(...lats) + marginLat),
  };
  const detailPaths = clippedDetailPaths(worldProject, extent);

  const memberAnchors = orderedTrips(members).map((trip, i) => {
    const [x, y] = worldProject(trip.coords[0], trip.coords[1]);
    return anchorMarkup({
      x,
      y,
      label: trip.place,
      companion: trip.companion,
      href: `#${trip.slug}`,
      title: `${trip.place}${trip.date ? ` · ${trip.date}` : ""}`,
      play: -1,
      seq: i,
      labelDy: i % 2 === 0 ? -11 : 19,
      extraClass: "cluster-member",
      extraAttrs: ` data-cluster="${id}" data-threshold="${Math.round(k)}" data-play="__PLAY_${i}__"`,
    });
  });

  return { id, place: clusterLabel(members), view, threshold: Math.round(k), detailPaths, memberAnchors };
}

/** 主图：固定世界范围（城际尺度）+ 城市聚合针脚 + 内嵌市内细节层。 */
export function renderWorldMap(trips: TravelListItem[]): { mapSvg: string } {
  const ordered = orderedTrips(trips);
  const grouped = buildClusters(ordered);

  /** 主图针脚（独立旅行 / 聚合组合针脚） */
  interface MainPin {
    x: number;
    y: number;
    label: string;
    companion: TravelListItem["companion"];
    href: string;
    title: string;
    /** 独立针脚：重放序号（锚点 / 入站线各占一位） */
    playAnchor?: number;
    playLine?: number;
    /** 聚合：市内视角、阈值、细节层、成员标记 */
    city?: {
      id: string;
      view: [number, number, number];
      threshold: number;
      detailPaths: string[];
      memberAnchors: string[];
    };
  }

  const mainPins: MainPin[] = [];
  const cityLayers: string[] = [];
  /** 重放镜头编排：id 仅城市站携带（成员针脚按 id 回查本站的点亮序号） */
  const stops: Array<{ id?: string; v: [number, number, number]; p: number[] }> = [];
  let play = 0;

  for (const group of grouped) {
    const members = orderedTrips(group.trips);
    const first = members[0];
    if (!first) {
      continue;
    }
    const [x, y] = worldProject(group.centroid[0], group.centroid[1]);
    if (members.length === 1) {
      // 独立旅行：本站点亮 = 针脚锚点 + 入站轨迹线（各占一个 play 序号）
      const playAnchor = play;
      const playLine = play + 1;
      stops.push({
        v: (() => {
          // 单站相机：以针脚为中心的适中倍率（城市视角上限对单站过深）
          const k = 6.5;
          const tx = Math.max(W * (1 - k), Math.min(0, W / 2 - k * x));
          const ty = Math.max(H * (1 - k), Math.min(0, H / 2 - k * y));
          return [Number(tx.toFixed(1)), Number(ty.toFixed(1)), k] as [number, number, number];
        })(),
        p: [playAnchor, playLine],
      });
      mainPins.push({
        x,
        y,
        label: first.place,
        companion: first.companion,
        href: `#${first.slug}`,
        title: `${first.place}${first.date ? ` · ${first.date}` : ""}`,
        playAnchor,
        playLine,
      });
      play += 2;
      continue;
    }
    // 城市聚合：组合针脚（点击推进市内视角）+ 进城线描画 + 成员逐个点亮
    const id = `cluster-${cityLayers.length + 1}`;
    const city = buildCityCluster(id, members);
    const playLine = play;
    const memberIdx = members.map((_, i) => play + 1 + i);
    stops.push({ id, v: city.view, p: [playLine, ...memberIdx] });
    mainPins.push({
      x,
      y,
      label: city.place,
      companion: members.filter((m) => m.companion === "couple").length >= members.length / 2 ? "couple" : "solo",
      href: `#${first.slug}`,
      title: `${city.place} · ${members.length} 站（点击放大）`,
      playLine,
      city: {
        id,
        view: city.view,
        threshold: city.threshold,
        detailPaths: city.detailPaths,
        memberAnchors: city.memberAnchors,
      },
    });
    play += 1 + members.length;
  }

  // 主图针脚标记（聚合针脚带 data-cluster/threshold；独立针脚带 data-play）
  const pinMarkupList = mainPins.map((item, i) =>
    anchorMarkup({
      x: item.x,
      y: item.y,
      label: item.label,
      companion: item.companion,
      href: item.href,
      title: item.title,
      play: item.playAnchor ?? -1,
      seq: i,
      labelDy: i % 2 === 0 ? -11 : 19,
      extraClass: item.city ? "cluster-agg" : "",
      extraAttrs: item.city ? ` data-cluster="${item.city.id}" data-threshold="${item.city.threshold}"` : "",
    }),
  );

  // 轨迹段：相邻主图针脚相连；线点亮序号 = 到达站的 playLine
  const segments = mainPins
    .map((item, i) => {
      const prev = mainPins[i - 1];
      if (i === 0 || !prev || (item.x === prev.x && item.y === prev.y)) {
        return "";
      }
      return `<path class="trip-line" data-play="${item.playLine ?? -1}" style="--seq:${i}" pathLength="1" vector-effect="non-scaling-stroke" d="M${prev.x},${prev.y}L${item.x},${item.y}"/>`;
    })
    .join("");

  // 城市细节层与成员针脚（__PLAY_i__ → 该站成员的全局点亮序号）
  const cityPins = mainPins.filter(
    (item): item is MainPin & { city: NonNullable<MainPin["city"]> } => item.city !== undefined,
  );
  const detailLayers = cityPins
    .map(
      (item) =>
        `<g class="map-detail" data-cluster="${item.city.id}" data-threshold="${item.city.threshold}">` +
        item.city.detailPaths.map((d) => `<path class="map-land" fill-rule="evenodd" d="${d}"/>`).join("") +
        `</g>`,
    )
    .join("");
  const memberLayers = cityPins
    .map((item) => {
      const stop = stops.find((stop) => stop.id === item.city.id);
      const replaced = item.city.memberAnchors.map((anchor, i) =>
        anchor.replaceAll(`__PLAY_${i}__`, String(stop?.p[i + 1] ?? -1)),
      );
      return (
        `<g class="cluster-member" data-cluster="${item.city.id}" data-threshold="${item.city.threshold}">` +
        replaced.join("") +
        `</g>`
      );
    })
    .join("");

  // 初始视野：主图针脚自适应
  const view = initialView(mainPins.map((item) => [item.x, item.y]));

  return {
    mapSvg:
      `<svg class="travel-map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="我们的旅行足迹地图" style="--map-zoom:${view.k}"` +
      ` data-stops="${escapeXml(JSON.stringify(stops))}">` +
      `<g class="map-world"${view.transform ? ` transform="${view.transform}"` : ""}>` +
      `<rect class="map-ocean" width="${W}" height="${H}"/>` +
      graticule(worldProject) +
      countryPathData(110, worldProject, 2, WORLD_EXTENT)
        .map((d) => `<path class="map-land" fill-rule="evenodd" vector-effect="non-scaling-stroke" d="${d}"/>`)
        .join("") +
      detailLayers +
      segments +
      pinMarkupList.join("") +
      memberLayers +
      `</g></svg>`,
  };
}

function initialView(points: [number, number][]): { transform: string; k: number } {
  if (points.length === 0) {
    return { transform: "", k: 1 };
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const padX = 90;
  const padY = 48;
  const k = Math.max(
    1,
    Math.min(W / (Math.max(...xs) - Math.min(...xs) + padX * 2), H / (Math.max(...ys) - Math.min(...ys) + padY * 2), 8),
  );
  const tx = Math.max(W * (1 - k), Math.min(0, W / 2 - k * ((Math.min(...xs) + Math.max(...xs)) / 2)));
  const ty = Math.max(H * (1 - k), Math.min(0, H / 2 - k * ((Math.min(...ys) + Math.max(...ys)) / 2)));
  return { transform: `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k.toFixed(2)})`, k: Number(k.toFixed(2)) };
}

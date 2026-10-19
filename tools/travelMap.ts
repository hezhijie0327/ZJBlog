// Real-world map SVG generator (build time, Node side): world-atlas (Natural
// Earth data, public domain) → topoToGeo → equirectangular projection →
// token-colored inline SVG.
//
// The main map keeps a fixed world extent (inter-city scale). In-city trips
// (within 0.7° of each other) aggregate into one "City ×N" composite pin; on
// click the client camera pushes into the city view — the 10m high-accuracy
// coastline detail layer and member pins fade in with the view on demand
// (cropped by bbox and baked into the main map at build time, only a few KB).
// The "replay" camera choreography (per-stop camera view + per-element
// light-up index) is delivered via data-stops and executed by the controller
// in TravelsPage: zoom and focus included.
//
// Size control: Antarctica dropped, integer coordinates after projection,
// tiny-ring culling, detail layer cropped by bbox; the artifact is stored
// once in the DOM (never in page-data).

import { BASELINE_TRAVEL_MAP_LABEL, baselineClusterPinTitle } from "../src/lib/i18n/baseline.ts";
import { TRAVEL_MAP_SIZE, type TravelListItem } from "../src/lib/types.ts";
import { clippedDetailPaths, countryPathData } from "./geoBase.ts";

/** Map canvas and lat/lon extent (poles trimmed to avoid distortion,
 *  Antarctica dropped). H = 136° × (W/360°): equal pixel density for lon and
 *  lat, so the map is not stretched. */
const W = TRAVEL_MAP_SIZE.w;
const H = TRAVEL_MAP_SIZE.h;
const WORLD_EXTENT = { lonMin: -180, lonMax: 180, latMin: -58, latMax: 78 };

/** City cluster radius (degrees); max city-view zoom (expressive limit of
 *  the 10m data). */

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Projector: equirectangular, equal pixel density for lon and lat (extent
 *  determines the viewport). */
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

/** Graticule (every 30°, poster feel for the main map) */
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

/** Ascending by date (light-up order). */
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
    // Solo: hollow ring
    return '<circle class="trip-pin-ring" r="5.5" fill="none" stroke-width="3"/>';
  }
  // Couple: heart shape (amber fill)
  return '<path class="trip-pin-heart" d="M0 4.3C-5.7 -1.1 -5.9 -5.9 -2.4 -6.6C-1.1 -6.9 0 -5.8 0 -4.7C0 -5.8 1.1 -6.9 2.4 -6.6C5.9 -5.9 5.7 -1.1 0 4.3Z" stroke-width="1.3"/>';
}

/** Pin anchor (data-play = the light-up index in replay; absent means the pin
 *  is not part of the replay choreography). The .on light-up class lands on
 *  the <a>: the inner pin pops and the label surfaces. Hit disc r=24 (about a
 *  12px radius on phones after the --map-zoom counter-scaling) — pure
 *  transparent touch-target compensation. */
function anchorMarkup(item: {
  x: number;
  y: number;
  label: string;
  companion: TravelListItem["companion"];
  href: string;
  title: string;
  play: number;
  /** Light-up index (drives the animation delays of the .lit initial choreography) */
  seq: number;
  labelDy: number;
  extraClass?: string;
  extraAttrs?: string;
}): string {
  return (
    `<a class="trip-anchor${item.extraClass ? ` ${item.extraClass}` : ""}" href="${escapeXml(item.href)}" style="--seq:${item.seq}"${item.extraAttrs ?? ""}` +
    `${item.play >= 0 ? ` data-play="${item.play}"` : ""}>` +
    `<g class="trip-pos" style="--x:${item.x}px;--y:${item.y}px">` +
    `<g class="trip-pin">${pinShape(item.companion)}<circle r="24" fill="transparent"/>` +
    `<title>${escapeXml(item.title)}</title></g>` +
    `<text class="trip-label" x="0" y="${item.labelDy}" text-anchor="middle">${escapeXml(item.label)}</text>` +
    `</g></a>`
  );
}

/** City detail paths (point-level crop): keep only coordinate points falling
 *  inside the viewport (padded 5%) — taking whole 10m rings (an entire
 *  continental coastline) would bloat the page to MBs; point-level cropping
 *  keeps it to a few KB. */
/** City cluster artifact: city view (camera fly target), reveal threshold,
 *  detail layer and member pins. */
interface CityCluster {
  id: string;
  place: string;
  view: [number, number, number];
  threshold: number;
  /** 10m detail layer (world-coordinate paths, fades in at city view) */
  detailPaths: string[];
  /** Member pin markup (fades in at city view; data-play placeholders
   *  assigned later) */
  memberAnchors: string[];
}

const CLUSTER_RADIUS_DEG = 0.7;
/** Max city-view zoom (expressive limit of the 10m data). */
const CITY_K_MAX = 640;

/** Cluster label: the common first segment after splitting each member place
 *  on "·" (e.g. "Shanghai"); falls back to the first member's place when no
 *  common segment exists. */
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

/** Greedy clustering (in date order): merge into an existing cluster when
 *  within CLUSTER_RADIUS_DEG of its centroid. */
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

/** City view: fit the member-pin bounding box (about 1/5 canvas padding),
 *  zoom capped at CITY_K_MAX. */
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

/** City cluster artifact: 10m detail layer (world coordinates, fades in at
 *  city view) + member pins (data-play placeholders __PLAY_i__, assigned
 *  global light-up indices by the main-map build). */
function buildCityCluster(id: string, members: TravelListItem[]): CityCluster {
  const view = cityView(members);
  const k = view[2];
  // Expand the member bounding box (degrees) by ~35% of the canvas; that is
  // the crop range for the 10m detail
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

/** Main map: fixed world extent (inter-city scale) + city cluster pins +
 *  embedded city detail layers. */
export function renderWorldMap(trips: TravelListItem[]): { mapSvg: string } {
  const ordered = orderedTrips(trips);
  const grouped = buildClusters(ordered);

  /** Main-map pins (standalone trips / cluster composite pins) */
  interface MainPin {
    x: number;
    y: number;
    label: string;
    companion: TravelListItem["companion"];
    href: string;
    title: string;
    /** Standalone pin: replay indices (the anchor / inbound line each take
     *  one slot) */
    playAnchor?: number;
    playLine?: number;
    /** Cluster: city view, threshold, detail layer, member markup */
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
  /** Replay camera choreography: only city stops carry an id (member pins
   *  look up their light-up index in this stop by id) */
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
      // Standalone trip: this stop lights up = pin anchor + inbound track
      // line (one play index each)
      const playAnchor = play;
      const playLine = play + 1;
      stops.push({
        v: (() => {
          // Single-stop camera: a moderate zoom centered on the pin (the
          // city-view cap is too deep for a single stop)
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
    // City cluster: composite pin (click pushes into the city view) + the
    // inbound line drawing + members lighting up one by one
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
      title: baselineClusterPinTitle(city.place, members.length),
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

  // Main-map pin markup (cluster pins carry data-cluster/threshold;
  // standalone pins carry data-play)
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

  // Track segments: adjacent main-map pins joined; a line's light-up index =
  // the playLine of the arrival stop
  const segments = mainPins
    .map((item, i) => {
      const prev = mainPins[i - 1];
      if (i === 0 || !prev || (item.x === prev.x && item.y === prev.y)) {
        return "";
      }
      return `<path class="trip-line" data-play="${item.playLine ?? -1}" style="--seq:${i}" pathLength="1" vector-effect="non-scaling-stroke" d="M${prev.x},${prev.y}L${item.x},${item.y}"/>`;
    })
    .join("");

  // City detail layers and member pins (__PLAY_i__ → the global light-up
  // index of that stop's member)
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

  // Initial view: fit the main-map pins
  const view = initialView(mainPins.map((item) => [item.x, item.y]));

  return {
    mapSvg:
      `<svg class="travel-map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${BASELINE_TRAVEL_MAP_LABEL}" style="--map-zoom:${view.k}"` +
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

// Diagram/chart extension layer: build-time compatibility for Typora-specific
// fences (sequence/flow/geojson/topojson/plantuml/stl). Except stl, which
// needs lazy client-side rendering with three.js, everything else produces
// static output at build time — mermaid source reuses the existing lazy
// renderer, GeoJSON is projected straight to SVG (zero runtime JS), PlantUML
// goes through the public rendering service as a lazy <img>.

import encoder from "plantuml-encoder";
import { BASELINE_GEO_MAP_LABEL } from "../src/lib/i18n/baseline.ts";
import { clippedDetailPaths, countryPathData } from "./geoBase.ts";

type Json = Record<string, unknown>;
type Coord = [number, number];

/** js-sequence-diagrams syntax → mermaid sequenceDiagram.
 *  Note/participant syntax matches mermaid exactly and passes through
 *  unchanged; Title case is normalized; arrow conversion: -> becomes ->>
 *  (solid line, filled head), --> becomes -->> (dashed line, filled head),
 *  -->> stays as is. */
export function translateSequenceToMermaid(code: string): string {
  const lines = code
    .split("\n")
    .map((raw) => {
      const line = raw.trim();
      if (!line) {
        return "";
      }
      if (/^title\s*:/i.test(line)) {
        return `title:${line.slice(line.indexOf(":") + 1)}`;
      }
      const dashed = line.match(/^(\S+)\s*-->>?\s*(\S+?)\s*:\s*(.+)$/);
      if (dashed) {
        return `${dashed[1]} -->> ${dashed[2]}: ${dashed[3]}`;
      }
      const solid = line.match(/^(\S+)\s*->\s*(\S+?)\s*:\s*(.+)$/);
      if (solid) {
        return `${solid[1]} ->> ${solid[2]}: ${solid[3]}`;
      }
      return line;
    })
    .filter(Boolean);
  return ["sequenceDiagram", ...lines].join("\n");
}

// flowchart.js node types → mermaid node shape wrappers (labels uniformly
// quoted to guard special characters)
const FLOW_SHAPES: Record<string, [string, string]> = {
  start: ["([", "])"],
  end: ["([", "])"],
  operation: ["[", "]"],
  subroutine: ["[[", "]]"],
  condition: ["{", "}"],
  inputoutput: ["[/", "/]"],
};

/** flowchart.js syntax → mermaid flowchart.
 *  Definition lines tag=>type: label become quoted-label nodes one by one;
 *  connection lines a->b->c become mermaid chained edges, (yes)/(no) hints on
 *  condition branches become edge labels, and (right) hints switch the whole
 *  chart to a horizontal layout (mermaid cannot express a per-edge direction
 *  hint; intentionally dropped here). */
export function translateFlowToMermaid(code: string): string {
  const defs = new Map<string, { type: string; label: string }>();
  const edges: { from: string; label?: string; to: string }[] = [];
  let horizontal = false;

  for (const raw of code.split("\n")) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    if (!line.includes("->")) {
      const def = line.match(/^(\w+)=>(\w+)(?::\s*(.*))?$/);
      if (def) {
        const tag = def[1] ?? "";
        const type = (def[2] ?? "operation").toLowerCase();
        // Trailing :>url link annotations have no static equivalent; strip them
        const label = (def[3] ?? "").replace(/\s*:>\s*\S+$/, "").trim();
        defs.set(tag, { type, label });
      }
      continue;
    }
    let prev: { tag: string; hint?: string } | null = null;
    for (const part of line.split("->")) {
      const m = part.trim().match(/^(\w+)(?:\(([^)]*)\))?$/);
      if (!m) {
        continue;
      }
      const tag = m[1] ?? "";
      const hint = m[2]?.split(",")[0]?.trim();
      if (hint === "right") {
        horizontal = true;
      }
      if (prev) {
        edges.push({
          from: prev.tag,
          label: prev.hint === "yes" || prev.hint === "no" ? prev.hint : undefined,
          to: tag,
        });
      }
      prev = { tag, hint };
    }
  }

  const defLines = [...defs.entries()].map(([tag, { type, label }]) => {
    const shape = FLOW_SHAPES[type] ?? (["[", "]"] as [string, string]);
    const quoted = `"${label.replaceAll('"', "'")}"`;
    return `${tag}${shape[0]}${quoted}${shape[1]}`;
  });
  const edgeLines = edges.map(({ from, label, to }) => (label ? `${from} -- ${label} --> ${to}` : `${from} --> ${to}`));
  return [`flowchart ${horizontal ? "LR" : "TD"}`, ...defLines, ...edgeLines].join("\n");
}

// ---- GeoJSON / TopoJSON → static SVG ----

const GEO_W = 640;
const GEO_H = 360;
const GEO_PAD = 28;

/** Deterministic clipPath id sequence (build order is stable) */
let geoClipSeq = 0;

/** Nesting depth of the coordinate array per Geometry type (a coordinate =
 *  an array whose elements are numbers directly) */
const GEO_DEPTH: Record<string, number> = {
  Point: 0,
  MultiPoint: 1,
  LineString: 1,
  MultiLineString: 2,
  Polygon: 2,
  MultiPolygon: 3,
};

function collectGeometries(
  node: Json,
  out: Json[],
  labels: { coords: Coord; name: string; dx: number; dy: number }[],
): void {
  if (node.type === "FeatureCollection") {
    for (const f of (node.features as Json[] | undefined) ?? []) {
      collectGeometries(f, out, labels);
    }
  } else if (node.type === "Feature") {
    const geometry = node.geometry as Json | null;
    const props = node.properties as Record<string, unknown> | null;
    // name only decides whether a point label is generated; the geometry is
    // collected regardless — otherwise a nameless Feature (e.g. {ID: 0})
    // would leave the whole map with no coordinates and throw
    if (geometry?.type === "Point" && typeof props?.name === "string") {
      labels.push({
        coords: geometry.coordinates as Coord,
        name: props.name,
        dx: typeof props["label-dx"] === "number" ? props["label-dx"] : 7,
        dy: typeof props["label-dy"] === "number" ? props["label-dy"] : -7,
      });
    }
    if (geometry) {
      collectGeometries(geometry, out, labels);
    }
  } else if (node.type === "GeometryCollection") {
    for (const g of (node.geometries as Json[] | undefined) ?? []) {
      collectGeometries(g, out, labels);
    }
  } else {
    out.push(node);
  }
}

function forEachCoord(geo: Json, fn: (c: Coord) => void): void {
  const walk = (value: unknown, depth: number): void => {
    if (!Array.isArray(value)) {
      return;
    }
    const first = value[0];
    if (depth === 0 || (typeof first === "number" && typeof value[1] === "number")) {
      if (typeof first === "number" && typeof value[1] === "number") {
        fn([first, value[1] as number]);
      }
      return;
    }
    for (const v of value) {
      walk(v, depth - 1);
    }
  };
  const depth = GEO_DEPTH[String(geo.type)];
  if (depth === undefined) {
    return;
  }
  walk(geo.coordinates, depth);
}

function ringToPath(ring: unknown, depth: number, project: (c: Coord) => Coord, close: boolean): string {
  const pts: Coord[] = [];
  const walk = (value: unknown, d: number): void => {
    if (!Array.isArray(value)) {
      return;
    }
    const first = value[0];
    if (d === 0 || (typeof first === "number" && typeof value[1] === "number")) {
      if (typeof first === "number" && typeof value[1] === "number") {
        pts.push([first, value[1] as number]);
      }
      return;
    }
    for (const v of value) {
      walk(v, d - 1);
    }
  };
  walk(ring, depth);
  if (pts.length === 0) {
    return "";
  }
  const d = pts.map((c, i) => `${i === 0 ? "M" : "L"}${project(c).join(" ")}`);
  return close ? `${d.join(" ")}Z` : d.join(" ");
}

/** GeoJSON → uniformly scaled static SVG (equirectangular projection +
 *  self-fitting bounding box, token colors; properties.name of a Point
 *  Feature renders as a point label). opts.basemap: false skips the
 *  world-atlas underlay (geojson-nobasemap fence) for pure vector
 *  figures. */
export function renderGeoSvg(geo: Json, opts?: { basemap?: boolean }): string {
  const geometries: Json[] = [];
  const labels: { coords: Coord; name: string; dx: number; dy: number }[] = [];
  collectGeometries(geo, geometries, labels);
  const coords: Coord[] = [];
  for (const g of geometries) {
    forEachCoord(g, (c) => coords.push(c));
  }
  if (coords.length === 0) {
    throw new Error("GeoJSON has no coordinates");
  }
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = Math.max(maxX - minX, 1e-9);
  const dy = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((GEO_W - 2 * GEO_PAD) / dx, (GEO_H - 2 * GEO_PAD) / dy);
  const offX = (GEO_W - dx * scale) / 2;
  const offY = (GEO_H - dy * scale) / 2;
  const project = (c: Coord): Coord => [
    Math.round((offX + (c[0] - minX) * scale) * 10) / 10,
    Math.round((offY + (maxY - c[1]) * scale) * 10) / 10,
  ];

  const parts: string[] = [];
  for (const g of geometries) {
    const type = String(g.type);
    const coordsValue = g.coordinates;
    if (type === "Point") {
      const [x, y] = project(coordsValue as Coord);
      parts.push(`<circle class="geo-point" cx="${x}" cy="${y}" r="4"/>`);
    } else if (type === "MultiPoint") {
      for (const c of (coordsValue as Coord[]) ?? []) {
        const [x, y] = project(c);
        parts.push(`<circle class="geo-point" cx="${x}" cy="${y}" r="4"/>`);
      }
    } else if (type === "LineString") {
      // LineString coordinates are ring-shaped ([[x,y],...]); depth must be 1
      parts.push(`<path class="geo-line" d="${ringToPath(coordsValue, 1, project, false)}"/>`);
    } else if (type === "MultiLineString") {
      for (const line of (coordsValue as unknown[]) ?? []) {
        parts.push(`<path class="geo-line" d="${ringToPath(line, 1, project, false)}"/>`);
      }
    } else if (type === "Polygon") {
      const d = ((coordsValue as unknown[]) ?? []).map((ring) => ringToPath(ring, 1, project, true)).join(" ");
      parts.push(`<path class="geo-polygon" fill-rule="evenodd" d="${d}"/>`);
    } else if (type === "MultiPolygon") {
      for (const polygon of (coordsValue as unknown[]) ?? []) {
        const d = ((polygon as unknown[]) ?? []).map((ring) => ringToPath(ring, 1, project, true)).join(" ");
        parts.push(`<path class="geo-polygon" fill-rule="evenodd" d="${d}"/>`);
      }
    }
  }
  const labelEls = labels
    .map(({ coords, name, dx, dy }) => {
      const [px, py] = project(coords);
      // The rightmost point sits at the padded bbox edge by construction, so
      // a default right-side label would overflow the viewBox: flip to
      // text-anchor="end" whenever the estimated width crosses the edge
      // (width estimate: CJK ≈ font-size per char, latin ≈ 0.62em)
      let anchor = "";
      let x = px + dx;
      const width = [...name].reduce((w, ch) => w + ((ch.codePointAt(0) ?? 0) > 0x2e80 ? 13 : 8), 0);
      if (x + width > GEO_W - 2) {
        anchor = ' text-anchor="end"';
        x = px - dx;
      }
      const y = Math.round((py + dy) * 10) / 10;
      const text = name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return `<text class="geo-label"${anchor} x="${Math.round(x * 10) / 10}" y="${y}">${text}</text>`;
    })
    .join("");
  // Real basemap (world-atlas) only when opted in and every coordinate is actual
  // lng/lat — abstract numeric data must not get a world under it. Extent is
  // the data bbox grown to at least 0.5° per axis (at that scale 110m
  // coastlines resolve into visible polylines while the data keeps ~15% of
  // the canvas width) and clamped to the world.
  const geographic =
    opts?.basemap !== false && coords.every((c) => c[0] >= -180 && c[0] <= 180 && c[1] >= -85 && c[1] <= 85);
  let basemap = "";
  if (geographic) {
    const grow = (min: number, max: number, lo: number, hi: number): [number, number] => {
      const half = Math.max(max - min, 0.5) / 2;
      const center = (min + max) / 2;
      return [Math.max(lo, center - half), Math.min(hi, center + half)];
    };
    const [lonMin, lonMax] = grow(minX, maxX, -180, 180);
    const [latMin, latMax] = grow(minY, maxY, -85, 85);
    // Basemap rings extend far beyond the viewBox (country polygons are much
    // larger than the data bbox), so clip to the canvas instead of relying on
    // the outer svg's overflow alone; ids must be unique across the page
    geoClipSeq += 1;
    const clipId = `geo-clip-${geoClipSeq}`;
    // Basemap always gets the 110m land fill (country polygons carry the
    // "you are on land" tint); city-scale windows additionally draw the 10m
    // coastline detail as a stroke polyline — 10m rings clipped point-by-point
    // to the window stay KB-sized, and conversion is cached per resolution,
    // shared with the travel map's build. Regional windows (>2°) skip the
    // 10m layer: its coastline is denser than the view needs.
    const projector = (lon: number, lat: number): [number, number] => project([lon, lat]);
    const extent = { lonMin, lonMax, latMin, latMax };
    const cityScale = lonMax - lonMin <= 2 && latMax - latMin <= 2;
    const land = countryPathData(110, projector, 2, extent)
      .map((d) => `<path class="geo-land" d="${d}"/>`)
      .join("");
    const detail = cityScale
      ? clippedDetailPaths(projector, extent)
          .map((d) => `<path class="geo-detail" d="${d}"/>`)
          .join("")
      : "";
    basemap = `<clipPath id="${clipId}"><rect width="${GEO_W}" height="${GEO_H}"/></clipPath><g class="geo-basemap" aria-hidden="true" clip-path="url(#${clipId})">${land}${detail}</g>`;
  }
  return `<svg class="geo-map" viewBox="0 0 ${GEO_W} ${GEO_H}" role="img" aria-label="${BASELINE_GEO_MAP_LABEL}"><rect class="geo-map-bg" width="${GEO_W}" height="${GEO_H}"/>${basemap}${parts.join("")}${labelEls}</svg>`;
}

/** TopoJSON → GeoJSON conversion lives in geoBase.ts (shared with travelMap). */

/** PlantUML → lazy <img> via the public rendering service (deflate+base64
 *  encoding, not encrypted) */
export function plantumlFigure(code: string): string {
  const body = code
    .trim()
    .replace(/^@startuml[^\n]*\n?/i, "")
    .replace(/@enduml\s*$/i, "")
    .trim();
  const src = `https://www.plantuml.com/plantuml/svg/${encoder.encode(body || code.trim())}`;
  // width/height are placeholder ratios (the server-side SVG carries the real
  // size; CSS width:100% + height:auto finalize it): an unsized lazy <img>
  // fails the Lighthouse unsized-images audit and reserves no layout space at
  // all before loading.
  return `<img alt="PlantUML diagram" class="plantuml-img" decoding="async" height="720" loading="lazy" src="${src}" width="1280"/>`;
}

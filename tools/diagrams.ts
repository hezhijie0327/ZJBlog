// 图表/图示扩展层：Typora 专属 fence 的构建期兼容（sequence/flow/geojson/
// topojson/plantuml/stl）。除 stl 需要客户端 three.js 惰性渲染外，其余全部
// 在构建期产出静态产物 —— mermaid 源码复用既有惰性渲染器、GeoJSON 直接
// 投影成 SVG（运行时零 JS）、PlantUML 走公共渲染服务的 lazy <img>。

import encoder from "plantuml-encoder";
import { feature as topoFeature } from "topojson-client";

type Json = Record<string, unknown>;
type Coord = [number, number];

/** js-sequence-diagrams 语法 → mermaid sequenceDiagram。
 *  Note/participant 两种语法与 mermaid 完全一致直接透传；Title 大小写归一；
 *  箭头换算：-> 变 ->>（实线实心），--> 变 -->>（虚线实心），-->> 原样。 */
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

// flowchart.js 节点类型 → mermaid 节点形状包裹符（标签统一加引号防特殊字符）
const FLOW_SHAPES: Record<string, [string, string]> = {
  start: ["([", "])"],
  end: ["([", "])"],
  operation: ["[", "]"],
  subroutine: ["[[", "]]"],
  condition: ["{", "}"],
  inputoutput: ["[/", "/]"],
};

/** flowchart.js 语法 → mermaid flowchart。
 *  定义行 tag=>type: label 逐个转成带引号标签的节点；连接行 a->b->c 转成
 *  mermaid 链式边，condition 分支的 (yes)/(no) 变边标签，(right) 提示整体
 *  切换为横向布局（mermaid 无法表达单条边的方向提示，此处有意舍弃）。 */
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
        // 尾部 :>url 链接注记在静态图中无对应能力，剥离
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

// ---- GeoJSON / TopoJSON → 静态 SVG ----

const GEO_W = 640;
const GEO_H = 360;
const GEO_PAD = 28;

/** 按 Geometry 类型记录坐标数组的嵌套深度（坐标 = 数组里直接是数字） */
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
    if (geometry && typeof props?.name === "string") {
      if (geometry.type === "Point") {
        labels.push({
          coords: geometry.coordinates as Coord,
          name: props.name,
          dx: typeof props["label-dx"] === "number" ? props["label-dx"] : 7,
          dy: typeof props["label-dy"] === "number" ? props["label-dy"] : -7,
        });
      }
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

/** GeoJSON → 等比投影的静态 SVG（等距圆柱投影 + 自适应包围盒，token 配色；
 *  Point 型 Feature 的 properties.name 会渲染为点位标注） */
export function renderGeoSvg(geo: Json): string {
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
      // LineString 坐标与环同构（[[x,y],...]），深度必须为 1
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
      const x = Math.round((px + dx) * 10) / 10;
      const y = Math.round((py + dy) * 10) / 10;
      const text = name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return `<text class="geo-label" x="${x}" y="${y}">${text}</text>`;
    })
    .join("");
  return `<svg class="geo-map" viewBox="0 0 ${GEO_W} ${GEO_H}" role="img" aria-label="GeoJSON 地图示意"><rect class="geo-map-bg" width="${GEO_W}" height="${GEO_H}"/>${parts.join("")}${labelEls}</svg>`;
}

/** TopoJSON → GeoJSON（多 objects 合并为单个 FeatureCollection） */
export function topoToGeo(topo: Json): Json {
  const objects = (topo.objects ?? {}) as Record<string, unknown>;
  const features: Json[] = [];
  for (const key of Object.keys(objects)) {
    const converted = topoFeature(topo, objects[key]) as Json;
    if (converted.type === "FeatureCollection") {
      features.push(...((converted.features as Json[]) ?? []));
    } else {
      features.push(converted);
    }
  }
  return { type: "FeatureCollection", features };
}

/** PlantUML → 公共渲染服务的 lazy <img>（deflate+base64 编码，非加密） */
export function plantumlFigure(code: string): string {
  const body = code
    .trim()
    .replace(/^@startuml[^\n]*\n?/i, "")
    .replace(/@enduml\s*$/i, "")
    .trim();
  const src = `https://www.plantuml.com/plantuml/svg/${encoder.encode(body || code.trim())}`;
  // width/height 是占位比例（真实尺寸由服务端 SVG 自带，CSS width:100% +
  // height:auto 收口）：无尺寸的 lazy <img> 过不了 Lighthouse unsized-images，
  // 且加载前完全不预留版面。
  return `<img alt="PlantUML diagram" class="plantuml-img" decoding="async" height="720" loading="lazy" src="${src}" width="1280"/>`;
}

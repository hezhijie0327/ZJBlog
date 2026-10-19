// Shared geo machinery for build-time SVG maps: TopoJSON → GeoJSON
// conversion and the world-atlas basemap (Natural Earth data, public domain).
// Consumers: content.ts / diagrams.ts (geojson & topojson diagram fences) and
// travelMap.ts (travel map with city-detail crop). Basemap is read only at
// build time (createRequire hits node_modules directly, never enters the
// bundle); 110m draws the world, 10m draws city detail (coastlines);
// conversion results are cached per resolution.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature as topoFeature } from "topojson-client";

type Json = Record<string, unknown>;

/** TopoJSON → GeoJSON (multiple objects merged into a single
 *  FeatureCollection) */
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

/** Projection callable: equirectangular mapping of (lon, lat) → canvas px. */
export type GeoProject = (lon: number, lat: number) => [number, number];

export interface GeoExtent {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

const geoCache = new Map<110 | 10, Array<{ properties?: { name?: string }; geometry?: unknown }>>();

export function countriesGeo(detail: 110 | 10): Array<{ properties?: { name?: string }; geometry?: unknown }> {
  let features = geoCache.get(detail);
  if (!features) {
    const require = createRequire(import.meta.url);
    const file = require.resolve(`world-atlas/countries-${detail}m.json`);
    const geo = topoToGeo(JSON.parse(readFileSync(file, "utf8")) as Json) as {
      features?: typeof features;
    };
    features = geo.features ?? [];
    geoCache.set(detail, features);
  }
  return features;
}

/** All polygons of a geometry (Polygon/MultiPolygon; others ignored):
 *  returns [polygon][ring][point]. */
export function ringsOf(geometry: unknown): [number, number][][][] {
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

/** Lat/lon bbox of a ring (city-detail features are cropped against it) */
export function ringExtentDeg(ring: [number, number][]): GeoExtent {
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

export function intersects(a: GeoExtent, b: GeoExtent): boolean {
  return a.lonMin <= b.lonMax && a.lonMax >= b.lonMin && a.latMin <= b.latMax && a.latMax >= b.latMin;
}

/** Basemap country paths: the projector decides viewport and projection;
 *  minAreaPx culls rings too small to see; when extent is given only rings
 *  intersecting it are kept (the city-detail / diagram-bbox crop). */
export function countryPathData(
  detail: 110 | 10,
  project: GeoProject,
  minAreaPx: number,
  extent?: GeoExtent,
): string[] {
  const paths: string[] = [];
  for (const feature of countriesGeo(detail)) {
    // Antarctica sits below the travel map's latitude band; drop it outright
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
        // Tiny-ring culling: islands/holes with projected area < minAreaPx
        // are invisible at the current scale
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

/** 10m detail paths clipped point-by-point to extent (+5% margin): keeps
 *  whole-country 10m rings out of the output so a city-scale window stays
 *  KB-sized. Ring edges crossing the margin are drawn straight between the
 *  kept endpoints — accepted approximation, the viewBox clip trims the rest. */
export function clippedDetailPaths(project: GeoProject, extent: GeoExtent): string[] {
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

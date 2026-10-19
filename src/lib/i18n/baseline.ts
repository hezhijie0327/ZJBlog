// Build-time zh-CN baseline literals — the one sanctioned home of Chinese
// literals outside the wordbooks (scripts/audit-cjk.mjs enforces this).
// Prerendered article/map HTML is baked against the zh-CN SSR baseline:
// strings the client can correct get rewritten on hydration from the
// wordbook (post.copyCode / travel.mapLabel), and content-layer labels
// (map cluster pins, geo diagrams) intentionally stay zh like the article
// body itself. Import from here instead of inlining Chinese in tooling.

import { ZH_CN } from "./zh-CN.ts";

/** code-card copy button label; Prose rewrites it via t("post.copyCode"). */
export const BASELINE_COPY_CODE: string = ZH_CN["post.copyCode"];

/** travel map aria-label; TravelsPage rewrites it via t("travel.mapLabel"). */
export const BASELINE_TRAVEL_MAP_LABEL: string = ZH_CN["travel.mapLabel"];

/** content-layer cluster pin `<title>` — stays zh like the article content. */
export function baselineClusterPinTitle(place: string, count: number): string {
  return `${place} · ${count} 站（点击放大）`;
}

/** content-layer geo diagram aria-label — stays zh like the article content. */
export const BASELINE_GEO_MAP_LABEL = "GeoJSON 地图示意";

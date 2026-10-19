// Page payload pipeline: at build time the whole page state is embedded as JSON in
// `<script id="page-data" type="application/json">`; client-side navigation fetches the
// same URL and extracts the payload from the HTML response.
//
// Large fields (body contentHtml / travel map mapSvg) are the exception: having them in
// both the DOM and page-data would double the document size, so page-data excludes them —
// a single copy lives in the DOM, read back from the current document on the first frame
// and parsed from the fetched document on SPA navigation (see attachProseHtml).

import { type AnyPageData, isBlogPostData, isProjectData, isTravelData, isTravelsData } from "@/lib/types.ts";

/** Inject DOM-stored single-copy fields back into the payload in place. Encrypted
 *  posts/travels are skipped: the lock screen has no body DOM, and a locked payload must
 *  never be backfilled. */
function attachProseHtml(doc: Document, data: AnyPageData): AnyPageData {
  if (
    isBlogPostData(data) &&
    data.post.deck !== undefined &&
    data.post.contentHtml === undefined &&
    data.post.locked === undefined
  ) {
    // Full deck: DeckViewer's marker slot (.prose is the regular-post selector; the two are mutually exclusive)
    const html = doc.querySelector("[data-deck-content]")?.innerHTML;
    if (html !== undefined) {
      return { ...data, post: { ...data.post, contentHtml: html } };
    }
  }
  if (isBlogPostData(data) && data.post.contentHtml === undefined && data.post.locked === undefined) {
    const html = doc.querySelector(".prose")?.innerHTML;
    if (html !== undefined) {
      return { ...data, post: { ...data.post, contentHtml: html } };
    }
  }
  if (isTravelData(data) && data.trip.contentHtml === undefined && data.trip.locked === undefined) {
    const html = doc.querySelector(".prose")?.innerHTML;
    if (html !== undefined) {
      return { ...data, trip: { ...data.trip, contentHtml: html } };
    }
  }
  if (isTravelsData(data) && data.mapSvg === undefined) {
    const mapSvg = doc.getElementById("travel-map")?.innerHTML;
    if (mapSvg !== undefined && mapSvg !== "") {
      return { ...data, mapSvg };
    }
  }
  if (isProjectData(data) && data.project.contentHtml === undefined) {
    const html = doc.querySelector(".prose")?.innerHTML;
    if (html !== undefined) {
      return { ...data, project: { ...data.project, contentHtml: html } };
    }
  }
  return data;
}

export function parseEmbeddedPageData(): AnyPageData | null {
  const el = document.getElementById("page-data");
  const text = el?.textContent?.trim();
  if (!text) {
    return null;
  }
  try {
    return attachProseHtml(document, JSON.parse(text) as AnyPageData);
  } catch {
    return null;
  }
}

export function extractPageData(html: string): AnyPageData {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.getElementById("page-data")?.textContent?.trim();
  if (!text) {
    throw new Error("page-data missing in response");
  }
  return attachProseHtml(doc, JSON.parse(text) as AnyPageData);
}

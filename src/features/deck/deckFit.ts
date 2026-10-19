// SPDX-License-Identifier: Apache-2.0 WITH Commons-Clause-1.0

// Automatic overflow fitting for slides (DESIGN.md §5.2 family contract; twin
// of zjsearch features/results/aiSearch/deck/deckFit.ts): on the fixed
// 1280×720 canvas, overly tall body content would originally be cut off by
// overflow — this detects the overflow and applies uniform scaling + width
// compensation to the .deck-body wrapped at compile time, shrinking the whole
// page with its original layout intact into the canvas.
//
// How it works: a section's layout width is always 1280px CSS px (viewport
// scaling happens at the canvas-level transform), so one measurement is
// stable and independent of the window; scale does not participate in layout,
// so scrollHeight always reflects the original content height, making removal
// and re-measuring idempotent. Below the scale floor, prefer keeping the
// clipping — shrinking without bound equals unreadable. display:none pages
// cannot be measured: paged mode measures only visible pages and re-measures
// on slide arrival; late content (mermaid svgs, images) triggers re-measuring
// via the MutationObserver the viewer mounts (fit only touches style/
// attribute, outside childList observation — no feedback loop).

const MIN_SCALE = 0.5;
/** Scale floor: below this the text is unreadable. */

/** Fit one page: on overflow applies scale + width compensation to
 *  .deck-body; returns whether fitting was applied. */
export function fitSlide(section: HTMLElement): boolean {
  const body = section.querySelector<HTMLElement>(":scope > .deck-body");
  if (!body) {
    return false;
  }
  body.style.transform = "";
  body.style.width = "";
  delete section.dataset.deckFit;
  const cs = getComputedStyle(section);
  const padTop = Number.parseFloat(cs.paddingTop) || 0;
  const padBottom = Number.parseFloat(cs.paddingBottom) || 0;
  const contentBox = section.clientHeight - padTop - padBottom;
  // Actual content height = the wrapper's own scrollHeight (unaffected by
  // transform). Do not use section.scrollHeight: it is clamped to
  // clientHeight and counts padding-bottom in — a page without overflow
  // would be misreported as exceeding the limit by exactly one padding.
  const bodyExtent = body.scrollHeight;
  if (contentBox <= 0 || bodyExtent <= contentBox + 1) {
    return false;
  }
  const scale = Math.max(MIN_SCALE, contentBox / bodyExtent);
  body.style.transformOrigin = "top left";
  body.style.transform = `scale(${scale})`;
  // Width compensation: widen the layout by 1/s first, then scale back down;
  // the body's effective line width stays unchanged while the whole page
  // shrinks proportionally
  body.style.width = `${100 / scale}%`;
  section.dataset.deckFit = scale.toFixed(2);
  return true;
}

/** Measure all currently visible pages: in paged mode only the current page
 *  is visible (display:none cannot be measured; the slide-change effect
 *  re-measures on arrival), while stacked/print reveal naturally covers
 *  everything. */
export function fitVisibleSlides(root: HTMLElement): void {
  for (const section of root.querySelectorAll<HTMLElement>("section[data-slide]")) {
    if (section.offsetParent !== null) {
      fitSlide(section);
    }
  }
}

/** Late-content re-fit observer: after DOM changes such as a mermaid
 *  placeholder being replaced by the renderer's svg or an image finishing
 *  loading, debounced re-fit of the visible pages. The viewer attaches it
 *  once when the canvas mounts and cleans up on unmount. */
export function observeLateContent(root: HTMLElement): () => void {
  let timer = 0;
  const observer = new MutationObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      fitVisibleSlides(root);
    }, 180);
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
}

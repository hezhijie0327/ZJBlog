// In-site anchor scrolling (the home Hero CTA and the story strip share the same
// semantics). Does not use native browser anchors: smooth scrolling, the hash recorded
// via replaceState (no instant jump and no new history entry, so the back key keeps
// router semantics); focus follows the target content so keyboard / screen-reader users
// perceive the position change; snaps instantly under reduced motion.

import type { MouseEvent } from "react";
import { isModifiedClick } from "@/lib/link.ts";

/** Smooth-scroll to the #id section; modified clicks (new tab etc.) are left to browser defaults. */
export function jumpToSection(event: MouseEvent<HTMLAnchorElement>, id: string): void {
  if (isModifiedClick(event)) {
    return;
  }
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  event.preventDefault();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}

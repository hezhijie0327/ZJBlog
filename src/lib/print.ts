// Print pipeline (family contract: same mechanism and semantics as
// ZJSearch client/zjsearch/src/lib/print.ts, contract in DESIGN.md §5.3): the preview
// face goes up first (body.print-preview forces paper styles, see styles/print.css),
// then window.print() fires after a double rAF — in real browsers the dialog covers
// the paper; in embedded webviews print is a silent no-op (ZJSearch also measured
// ghost afterprint events at ~1s/~9s), so a visible paper guarantees such environments
// always respond to the button; users print via the browser menu or exit via the
// close chip.
//
// During printing document.title switches to zjblog_<safe> (the source of the default
// "Save as PDF" file name) and teardown restores it; afterprint does not tear down the
// preview (save or cancel both end with the user hitting the close chip / Esc, same
// as ZJSearch).
//
// Dark mermaid: diagram colors are baked into the svg and would look jarring on light
// paper — before the preview we broadcast blog:print-mermaid-light and MermaidRenderer
// re-renders in place with the light theme; on close blog:print-mermaid-restore is
// broadcast to restore per the current theme. External Ctrl+P bypasses this pipeline
// (diagrams keep the current theme; a known degradation).

import { siteConfig } from "@/config/site.ts";

const PREVIEW_CLASS = "print-preview";
const MERMAID_LIGHT = "blog:print-mermaid-light";
const MERMAID_RESTORE = "blog:print-mermaid-restore";

export interface PrintPreviewOptions {
  /** Base name for the default "Save as PDF" file (zjblog_<safe>) */
  titleBase: string;
  /** aria-label for the close chip (i18n copy supplied by the caller) */
  closeLabel: string;
  /** Inject a brand wordmark at the top of the paper (ZJBlog. + divider, same as the
   *  ZJSearch print doc); decks carry their own branding and fixed-height pages cannot
   *  take the insertion — omit to skip */
  wordmark?: boolean;
  /** Muted hint under the close chip (in embedded webviews print is a silent no-op and
   *  the paper is the end state — tell the user to output this content via the browser
   *  menu's "Print") */
  hint?: string;
}

/** Open the print preview face and trigger printing. Returns teardown (call on component unmount to avoid leaving residue). */
export function startPrintPreview({ titleBase, closeLabel, wordmark = false, hint }: PrintPreviewOptions): () => void {
  if (document.documentElement.classList.contains(PREVIEW_CLASS)) {
    return () => {};
  }

  const prevTitle = document.title;
  const prevScroll = window.scrollY;
  const safe =
    titleBase
      .replace(/[/\\:*?"<>|]+/g, "_")
      .trim()
      .slice(0, 64) || "post";
  document.title = `zjblog_${safe}`;
  document.documentElement.classList.add(PREVIEW_CLASS);
  window.scrollTo(0, 0);
  document.dispatchEvent(new CustomEvent(MERMAID_LIGHT));

  // Brand wordmark (post printing): serif brand name + gold dot pinned to the paper's
  // top-left (same wordmark as the ZJSearch print doc); the brand string comes from the
  // site config, is not user input, and is inlined directly
  let wordmarkEl: HTMLDivElement | null = null;
  if (wordmark) {
    wordmarkEl = document.createElement("div");
    wordmarkEl.className = "print-wordmark";
    wordmarkEl.innerHTML = `${siteConfig.title}<span class="print-wordmark-dot">.</span>`;
    document.querySelector("main .container")?.prepend(wordmarkEl);
  }

  // The close chip and hint only carry semantic classes: paper exclusion is handled by
  // the matching @media print rules below (print-hide would also be hidden by the preview
  // face's .print-preview .print-hide — the chip would never be visible on screen;
  // ZJSearch does not have this problem)
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "print-close";
  chip.setAttribute("aria-label", closeLabel);
  chip.textContent = "✕";

  const timers: number[] = [];
  const teardown = (): void => {
    timers.forEach((id) => {
      // The handle pool mixes rAF and timeout ids: both clears consume their own kind; a mismatch is a harmless no-op
      window.cancelAnimationFrame(id);
      window.clearTimeout(id);
    });
    window.removeEventListener("keydown", onKey);
    document.dispatchEvent(new CustomEvent(MERMAID_RESTORE));
    chip.remove();
    document.querySelectorAll(".print-hint").forEach((el) => {
      el.remove();
    });
    wordmarkEl?.remove();
    document.documentElement.classList.remove(PREVIEW_CLASS);
    document.title = prevTitle;
    window.scrollTo(0, prevScroll);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      teardown();
    }
  };
  chip.addEventListener("click", teardown);
  window.addEventListener("keydown", onKey);
  document.body.append(chip);
  if (hint) {
    const hintEl = document.createElement("p");
    hintEl.className = "print-hint";
    hintEl.textContent = hint;
    chip.after(hintEl);
  }

  // Give the paper two frames of layout before invoking the print dialog; rAF gets
  // starved when occluded or backgrounded, so a 400ms timer races it as a fallback and
  // a once guard prevents double opening
  let opened = false;
  const openDialog = (): void => {
    if (opened) {
      return;
    }
    opened = true;
    window.print();
  };
  timers.push(
    window.requestAnimationFrame(() => {
      timers.push(
        window.requestAnimationFrame(() => {
          openDialog();
        }),
      );
    }),
  );
  timers.push(window.setTimeout(openDialog, 400));

  return teardown;
}

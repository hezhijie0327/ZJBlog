// Article body rendering: the build-time-compiled HTML is injected directly
// (dangerouslySetInnerHTML); after mount, mermaid placeholder containers are
// replaced one by one with lazy renderers; code-block copy buttons use event
// delegation (the buttons are static build-time output, no per-button React).
// The old content-visibility:auto + contain-intrinsic-size optimization has
// been removed: on Chromium 146+/Edge 153 the "relevance" heuristic no longer
// triggers expansion, so long articles were cut off at the placeholder height
// (92% of the body unreachable; reproduced on both Electron 41 and Edge 153).
// Correctness first — offscreen rendering only ever saved a one-time layout,
// far smaller a cost than unreachable content.

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Lightbox, type LightboxItem } from "@/components/Lightbox.tsx";
import { DeckViewer } from "@/features/deck/DeckViewer.tsx";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";
import { StlViewer } from "@/features/markdown/StlViewer.tsx";
import { useT } from "@/lib/i18n.ts";
import { ensureKatexStyles } from "@/lib/katex.ts";

export function Prose({ html, needsKatex }: { html: string; needsKatex?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  // Return focus to the trigger element after the lightbox closes (keyboard /
  // screen reader users land back where they started)
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const t = useT();

  // html is a semantic dependency: once the body updates, the placeholder
  // containers in the DOM are replaced and the renderers must remount
  // biome-ignore lint/correctness/useExhaustiveDependencies: html is intentional so the renderers remount
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    if (needsKatex) {
      ensureKatexStyles();
    }
    const roots: Root[] = [];
    for (const el of container.querySelectorAll<HTMLElement>(".mermaid-placeholder")) {
      const root = createRoot(el);
      root.render(<MermaidRenderer chart={el.dataset.chart ?? ""} lightbox />);
      roots.push(root);
    }
    // Embedded slides from ```marp fences (tools/deck.ts placeholder
    // structure): extract the build-time CSS and slide HTML from the DOM and
    // hand them to DeckViewer to re-render the enhanced version (without JS,
    // the placeholder structure itself is the full stacked view). Plaintext
    // injected after unlocking a locked post goes through here too (html
    // change remounts).
    for (const el of container.querySelectorAll<HTMLElement>(".deck-embed")) {
      const css = el.querySelector("style[data-deck-css]")?.textContent ?? "";
      const body = el.querySelector("[data-deck-content]")?.innerHTML ?? "";
      if (body === "") {
        continue;
      }
      const root = createRoot(el);
      root.render(<DeckViewer css={css} embedded html={body} />);
      roots.push(root);
    }
    for (const el of container.querySelectorAll<HTMLElement>(".stl-placeholder")) {
      const root = createRoot(el);
      root.render(<StlViewer stl={el.dataset.stl ?? ""} />);
      roots.push(root);
    }
    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, [html, needsKatex]);

  // Copy-code buttons: the build output is static HTML (initial label in the
  // build baseline language); one delegated handler takes over all code
  // blocks. At hydration, first correct every button's label to the current
  // UI language. html is a semantic dependency: plaintext injected after
  // unlocking an encrypted post also carries build-time buttons that need the
  // same correction.
  // biome-ignore lint/correctness/useExhaustiveDependencies: html is intentional so button labels re-correct
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    for (const button of container.querySelectorAll<HTMLButtonElement>(".copy-code")) {
      if (!button.dataset.copied) {
        button.textContent = t("post.copyCode");
      }
    }
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest(".copy-code");
      const code = button?.closest(".code-card")?.querySelector("pre code");
      if (!(button instanceof HTMLButtonElement) || !code) {
        return;
      }
      const text = code.textContent ?? "";
      // Baseline 2022: async clipboard is supported everywhere (https and
      // localhost are both secure contexts); on failure (e.g. an embedded
      // WebView denying permission) no "copied" feedback appears — the old
      // execCommand fallback is not kept
      navigator.clipboard.writeText(text).then(
        () => {
          button.textContent = t("post.copied");
          button.dataset.copied = "true";
          window.setTimeout(() => {
            button.textContent = t("post.copyCode");
            delete button.dataset.copied;
          }, 1600);
        },
        () => {},
      );
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, [t, html]);

  // Lightbox: delegated clicks on body images and mermaid figure cards (wide
  // images get squeezed in the body column; open the lightbox to view them
  // fullscreen — SVG vector scaling never blurs; items are serialized at the
  // click instant, consistent with the current theme).
  // Images inside links are intercepted too — view the large image first;
  // preventDefault stops the navigation.
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !container.contains(target)) {
        return;
      }
      // Embedded slides are managed by DeckViewer itself (paging semantics);
      // neither images nor mermaid enter the article-wide lightbox
      if (target.closest(".deck-embed")) {
        return;
      }
      const image = target.closest("img");
      const mermaid = image ? null : target.closest<HTMLElement>("[data-mermaid-figure]");
      if (!image && !mermaid) {
        return;
      }
      // Gallery = all images + already-rendered mermaid figures (those not yet
      // in the viewport are still placeholders; no svg means skip);
      // querySelectorAll returns the interleaved sequence in document order,
      // so prev/next walks every figure in the article
      const items: LightboxItem[] = [];
      let index = -1;
      for (const node of container.querySelectorAll("img, [data-mermaid-figure]")) {
        if (node.closest(".deck-embed")) {
          continue;
        }
        if (node instanceof HTMLImageElement) {
          if (node === image) {
            index = items.length;
          }
          items.push({ alt: node.alt, kind: "img", src: node.currentSrc || node.src });
        } else {
          const svg = node.querySelector("svg");
          if (!svg) {
            continue;
          }
          if (node === mermaid) {
            index = items.length;
          }
          items.push({
            alt: node.querySelector('[role="img"]')?.getAttribute("aria-label") ?? "",
            html: svg.outerHTML,
            kind: "svg",
          });
        }
      }
      if (index === -1) {
        return;
      }
      event.preventDefault();
      lastTriggerRef.current = image ?? mermaid;
      setPreview({ items, index });
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, []);

  // Fired by the dialog's close event (the top layer is already released):
  // return focus to the trigger element first, then unmount the lightbox —
  // reversed, an unmount that carries focus would snap it back to body.
  const closePreview = () => {
    const trigger = lastTriggerRef.current;
    if (trigger) {
      trigger.tabIndex = -1;
      trigger.focus({ preventScroll: true });
    }
    setPreview(null);
  };

  return (
    <>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} ref={ref} />
      {preview && preview.items.length > 0 && (
        <Lightbox initialIndex={preview.index} items={preview.items} onClose={closePreview} />
      )}
    </>
  );
}

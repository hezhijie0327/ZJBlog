// Mermaid chart renderer: the library is large (~2.7MB), so it is loaded
// dynamically only when scrolling nears a chart. Build-time Markdown
// compilation has already replaced mermaid code blocks with
// .mermaid-placeholder containers (data-chart holds the source); Prose mounts
// this component to render each one.
//
// mermaid.initialize is a config merge (very cheap) and runs on every render
// to carry the current theme; after a theme switch (html.dark flip), charts
// that already rendered re-render; at beforeprint, charts not yet rendered
// trigger rendering immediately (best effort).

import type { Mermaid } from "mermaid";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { watchThemeDark } from "@/lib/theme.ts";
import { useInView } from "@/lib/useInView.ts";

interface MermaidRendererProps {
  chart: string;
  /** Whole card clickable into the article-wide lightbox (Prose body use);
   *  deck embeds manage their own paging semantics and omit it */
  lightbox?: boolean;
}

let mermaidPromise: Promise<Mermaid> | null = null;

/** Render id sequence (module-level increment, no randomness — DESIGN.md §7
 *  determinism requirement). */
let mermaidSeq = 0;

/** Lazy-load mermaid (module-level cache; loaded once site-wide). */
function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((mermaid) => mermaid.default);
  return mermaidPromise;
}

export function MermaidRenderer({ chart, lightbox = false }: MermaidRendererProps) {
  const t = useT();
  // Load only on entering the viewport (with a 300px buffer); beforeprint
  // forces rendering as a fallback
  const { ref: containerRef, inView: scrolled } = useInView<HTMLDivElement>({ once: true });
  const [printed, setPrinted] = useState(false);
  const visible = scrolled || printed;
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains("dark"));
  // Print/preview paper is light (styles/print.css family contract):
  // lib/print.ts broadcast events drive in-place re-rendering, restored to
  // the current theme on close
  const [printLight, setPrintLight] = useState(false);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  // Re-render after a theme flip (the theme change triggers the render effect
  // below)
  useEffect(() => watchThemeDark(setTheme), []);

  // Charts never scrolled to are empty placeholders at print time — force one
  // render, best effort
  useEffect(() => {
    const onBeforePrint = () => {
      setPrinted(true);
    };
    const onPrintLight = () => {
      setPrinted(true);
      setPrintLight(true);
    };
    const onPrintRestore = () => {
      setPrintLight(false);
    };
    window.addEventListener("beforeprint", onBeforePrint);
    document.addEventListener("blog:print-mermaid-light", onPrintLight);
    document.addEventListener("blog:print-mermaid-restore", onPrintRestore);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("blog:print-mermaid-light", onPrintLight);
      document.removeEventListener("blog:print-mermaid-restore", onPrintRestore);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let mounted = true;

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          fontFamily: "var(--font-sans)",
          theme: printLight ? "default" : theme ? "dark" : "default",
        });

        const id = `mermaid-${++mermaidSeq}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (mounted) {
          setSvg(renderedSvg);
          setError("");
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visible, chart, theme, printLight]);

  if (error) {
    // Danger copy uses ink/ink-2 to keep AA contrast; danger only carries the
    // border semantics
    return (
      <div className="my-4 rounded-lg border border-danger/60 bg-danger/10 p-4 text-sm" role="alert">
        <p className="font-semibold text-ink">{t("mermaid.failed")}</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-ink-2">{error}</pre>
      </div>
    );
  }

  return (
    // data-mermaid-figure is the entry marker for Prose's lightbox delegation
    // (omitted inside decks); hitting the whole card (border padding
    // included) beats hitting only the svg
    <div
      className={cn(
        "my-6 overflow-x-auto rounded-xl border border-line bg-surface p-4 shadow-card",
        lightbox && "cursor-zoom-in",
      )}
      data-mermaid-figure={lightbox || undefined}
      ref={containerRef}
    >
      {svg ? (
        // mermaid.render output is trusted SVG constrained by
        // securityLevel: "strict"; role="img" + aria-label make screen
        // readers present the whole figure as a single image
        <div aria-label={t("mermaid.figure")} dangerouslySetInnerHTML={{ __html: svg }} role="img" />
      ) : (
        <p className="py-8 text-center text-sm text-ink-3">{t("mermaid.loading")}</p>
      )}
    </div>
  );
}

// Bootstrapping: parse the page's embedded payload → React takes over #app.
// hydrateRoot reuses the prerendered DOM (createRoot would rebuild it — first clearing
// the document, making distant content like the footer briefly collapse into the viewport
// and pop back, producing 0.25 CLS). The first frame must render exactly like SSR: any UI
// that depends on browser state must branch only after mount.

import { hydrateRoot } from "react-dom/client";
import { App } from "@/app.tsx";
import { parseEmbeddedPageData } from "@/lib/pageData.ts";
import { watchSystemTheme } from "@/lib/theme.ts";
import { pageLoaders } from "@/pages/registry.ts";
import "./styles/global.css";

const container = document.getElementById("app");
if (container) {
  watchSystemTheme();
  const data = parseEmbeddedPageData();
  void (async () => {
    if (data) {
      // Fetch the current page's chunk before the first hydration frame: hydration renders
      // real content immediately, matching the prerendered HTML. Without this, Suspense
      // would first knock out the SSR content with a skeleton (CLS + #419 hydration errors).
      const { page } = data.globals;
      if (page !== "not-found") {
        await pageLoaders[page]();
      }
    }
    hydrateRoot(container, <App initialData={data} />);
  })();
}

/* PWA install layer (DESIGN.md §18): a pass-through worker (offline fallback,
   deliberately cache-free) makes the manifest installable. Registered after load — the
   install layer never blocks startup; failures are silent (incognito-mode-like
   environments without a worker work just the same); not registered in dev to avoid a
   leftover worker interfering with later dev sessions. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

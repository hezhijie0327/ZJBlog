/* ZJBlog service worker — pass-through + offline fallback (PWA install layer,
 * DESIGN.md §18).
 *
 * Deliberately cache-free: static assets already carry hashed filenames +
 * long immutable caches, and prerendered HTML has a CDN-side max-age — one
 * more caching layer in the worker would only resurrect stale bundles after
 * a deploy. Its sole purpose is making the manifest installable: GET
 * navigations go straight to the network, and when the network is
 * unreachable a 503 offline fallback page is served instead. Any real
 * caching strategy is a future, explicit opt-in.
 */

// The standalone document injected by the SW cannot see the site's CSS
// variables — the DESIGN.md §3 token values (--bg / --ink / --ink-3) are
// inlined here, in both light and dark, following the system scheme. The
// fallback copy is English-only on purpose: the worker ships verbatim from
// public/ and cannot reach the i18n wordbook (scripts/audit-cjk.mjs).
const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100dvh;margin:0;background:#faf9f6;color:#201d17}
main{text-align:center;padding:2rem}h1{font-size:1.1rem;font-weight:600}p{color:#716c61;font-size:.85rem}
button{margin-top:1.25rem;font:inherit;font-size:.85rem;padding:.5rem 1.25rem;border:1px solid #e6e2d7;border-radius:999px;background:#f5c84c;color:#241d06;cursor:pointer}
@media (prefers-color-scheme: dark){body{background:#1b1a18;color:#eceae4}p{color:#9b958a}button{background:#fec843;border-color:#38342f}}
</style></head>
<body><main><h1>Offline</h1><p>The network is unavailable — reconnect and try again.</p><button onclick="location.reload()">Retry</button></main></body></html>`;

/* Known WebKit flake on iOS standalone-shell cold starts: the device is
 * online but the network stack is not ready yet, so the first navigation
 * fetch rejects immediately. Retry twice with short delays before falling
 * back — in practice these failures recover within one retry; on a healthy
 * network the first fetch succeeds and the retries are just a blank-screen
 * fuse. */
const NAV_RETRY_DELAYS_MS = [300, 900];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

async function navigateWithRetry(request) {
  let lastError;
  for (let attempt = 0; attempt <= NAV_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, NAV_RETRY_DELAYS_MS[attempt - 1]));
    }
    try {
      return await fetch(request);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") {
    return;
  }
  event.respondWith(
    navigateWithRetry(request).catch(
      () =>
        new Response(OFFLINE_HTML, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    ),
  );
});

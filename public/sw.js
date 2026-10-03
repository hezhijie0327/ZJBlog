/* ZJBlog service worker —— 直通 + 离线兜底（PWA 安装层，DESIGN.md §18）。
 *
 * 刻意免缓存：静态资产已是哈希文件名 + immutable 长缓存，预渲染 HTML 有
 * CDN 侧 max-age —— worker 再缓存一层只会在部署后复活陈旧 bundle。它存在
 * 的意义是让 manifest 可安装：GET 导航请求网络直通，网络不可达时回 503
 * 离线兜底页。缓存策略是后续的显式 opt-in。
 */

const OFFLINE_HTML = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
/* SW 注入的独立文档拿不到站点 CSS 变量 —— 此处直接落 DESIGN.md §3 的
   token 现值（--bg / --ink / --ink-3），明暗双档跟随系统。 */
body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100dvh;margin:0;background:#faf9f6;color:#201d17}
main{text-align:center;padding:2rem}h1{font-size:1.1rem;font-weight:600}p{color:#716c61;font-size:.85rem}
@media (prefers-color-scheme: dark){body{background:#1b1a18;color:#eceae4}p{color:#9b958a}}
</style></head>
<body><main><h1>离线</h1><p>网络不可用 —— 请重新连接后再试。</p></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") {
    return;
  }
  event.respondWith(
    fetch(request).catch(
      () =>
        new Response(OFFLINE_HTML, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    ),
  );
});

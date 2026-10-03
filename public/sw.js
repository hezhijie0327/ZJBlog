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
button{margin-top:1.25rem;font:inherit;font-size:.85rem;padding:.5rem 1.25rem;border:1px solid #e6e2d7;border-radius:999px;background:#f5c84c;color:#241d06;cursor:pointer}
@media (prefers-color-scheme: dark){body{background:#1b1a18;color:#eceae4}p{color:#9b958a}button{background:#fec843;border-color:#38342f}}
</style></head>
<body><main><h1>离线</h1><p>网络不可用 —— 请重新连接后再试。</p><button onclick="location.reload()">重试</button></main></body></html>`;

/* iOS 独立壳冷启动的已知 WebKit flake：设备在线但网络栈未就绪，首个导航
 * fetch 会立刻 reject。短延迟重试两轮再落兜底页 —— 实测这类失败一次重试
 * 内恢复；正常网络下首次即达，重试只是白屏保险丝。 */
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

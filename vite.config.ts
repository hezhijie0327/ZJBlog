// 治杰 Online — Vite 构建配置（ZJSearch 同构 SPA）
//
// 两条构建线：
//   vite build              → 客户端 bundle 到 dist/（含 manifest 供预渲染读取资产名）
//   vite build --ssr tools/ssr.tsx → SSR 渲染入口到 .vite-ssr/（scripts/prerender.mjs 消费）
// 预渲染把每条路由写成完整 HTML（dist/<route>/index.html），站内导航由
// fetch-and-swap 路由接管（见 src/lib/router.tsx）。

import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import manifest from "./package.json" with { type: "json" };

/** 构建期生成的静态文件：生产由预渲染落盘 dist/，dev 缺了会导致命令面板
 *  索引 404、RSS 入口失效 —— dev 中间件按同一路径同构地产出。 */
const GENERATED_FILES: Record<string, { fn: string; type: string }> = {
  "/rss.xml": { fn: "generateRss", type: "application/rss+xml; charset=utf-8" },
  "/sitemap.xml": { fn: "generateSitemap", type: "application/xml; charset=utf-8" },
  "/robots.txt": { fn: "generateRobots", type: "text/plain; charset=utf-8" },
  "/search-index.json": { fn: "generateSearchIndex", type: "application/json; charset=utf-8" },
  "/llms.txt": { fn: "generateLlms", type: "text/plain; charset=utf-8" },
  "/llms-full.txt": { fn: "generateLlmsFull", type: "text/plain; charset=utf-8" },
};

/** Dev 中间件：页面请求走与生产一致的 SSR 渲染（ssrLoadModule 复用 tools/ssr.tsx），
 *  生成文件同构地产出（GENERATED_FILES），资源 / 模块请求放行给 Vite。
 *  content/ 下的 md 变更触发整页刷新。 */
function plgDevServer(): Plugin {
  return {
    name: "blog-dev-server",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.watcher.add("content");
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url ?? "/";
        const path = raw.split("?")[0] ?? "/";
        const generated = GENERATED_FILES[path];
        if (generated) {
          try {
            const mod = (await server.ssrLoadModule("/tools/generators.ts")) as Record<string, () => string>;
            res.statusCode = 200;
            res.setHeader("Content-Type", generated.type);
            res.end(mod[generated.fn]?.() ?? "");
          } catch (error) {
            next(error);
          }
          return;
        }
        const accept = req.headers.accept ?? "";
        const wantsDocument =
          (accept.includes("text/html") || accept === "*/*") &&
          !path.startsWith("/@") &&
          !path.substring(path.lastIndexOf("/")).includes(".");
        if (!wantsDocument) {
          next();
          return;
        }
        try {
          const mod = (await server.ssrLoadModule("/tools/ssr.tsx")) as {
            renderRoute: (pathname: string) => Promise<string>;
          };
          const html = await mod.renderRoute(path);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [tailwindcss(), plgDevServer()],
  publicDir: "public/",
  server: {
    port: 5175,
  },
  build: {
    target: browserslistToEsbuild(manifest.browserslist),
    outDir: isSsrBuild ? ".vite-ssr" : "dist",
    emptyOutDir: true,
    manifest: !isSsrBuild,
    sourcemap: false,
    // 客户端入口直接指 src/main.tsx：项目没有手写 HTML 模板（所有路由的
    // HTML 由 ssr.tsx 生成、预渲染落盘），Vite 默认的 index.html 输入是死重。
    // dev 侧同理 —— dev 中间件在 Vite 内置中间件之前拦截全部文档请求。
    rollupOptions: isSsrBuild
      ? { output: { entryFileNames: "ssr.mjs" } }
      : { input: fileURLToPath(new URL("./src/main.tsx", import.meta.url)) },
  },
}));

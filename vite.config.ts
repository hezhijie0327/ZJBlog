// ZJBlog — Vite build config
//
// Two build lines:
//   vite build              → client bundle into dist/ (with a manifest for
//                             prerender to read asset names)
//   vite build --ssr tools/ssr.tsx → SSR render entry into .vite-ssr/
//                             (consumed by scripts/prerender.mjs)
// Prerender writes every route as full HTML (dist/<route>/index.html);
// in-site navigation is taken over by the fetch-and-swap router (see
// src/lib/router.tsx).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import manifest from "./package.json" with { type: "json" };

/** Static files generated at build time: in production, prerender writes them
 *  into dist/; missing in dev, the command palette index 404s and the RSS
 *  entry breaks — the dev middleware serves them isomorphically at the same
 *  paths. */
const GENERATED_FILES: Record<string, { fn: string; type: string }> = {
  "/rss.xml": { fn: "generateRss", type: "application/rss+xml; charset=utf-8" },
  "/sitemap.xml": { fn: "generateSitemap", type: "application/xml; charset=utf-8" },
  "/robots.txt": { fn: "generateRobots", type: "text/plain; charset=utf-8" },
  "/search-index.json": { fn: "generateSearchIndex", type: "application/json; charset=utf-8" },
  "/llms.txt": { fn: "generateLlms", type: "text/plain; charset=utf-8" },
  "/llms-full.txt": { fn: "generateLlmsFull", type: "text/plain; charset=utf-8" },
  "/manifest.json": { fn: "generateManifest", type: "application/manifest+json; charset=utf-8" },
};

/** Dev middleware: page requests go through the same SSR rendering as
 *  production (ssrLoadModule reuses tools/ssr.tsx), generated files are
 *  produced isomorphically (GENERATED_FILES), and asset/module requests pass
 *  through to Vite. md changes under content/ trigger a full page reload. */
function plgDevServer(): Plugin {
  return {
    name: "blog-dev-server",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.watcher.add("content");
      // Content file changes must invalidate the SSR modules: loadContent's
      // index cache lives in module scope, so without invalidation,
      // adding/moving/deleting md files has no effect in dev.
      // Vite 6+ splits the module graph per environment — server.moduleGraph
      // only covers the client, while ssrLoadModule's cache hangs off the ssr
      // environment; both must be invalidated (calling only the former means
      // content edits keep serving stale compilation in dev forever).
      const invalidateContent = (file: string) => {
        // Watcher events on Windows are "relative path + backslashes"
        // (observed as content\blogs\x.md); normalize, then anchor-match on
        // path segments to avoid false positives on directory names such as
        // mycontent/
        if (!/(^|\/)content\//.test(file.replaceAll("\\", "/"))) {
          return;
        }
        server.moduleGraph.invalidateAll();
        server.environments.ssr.moduleGraph.invalidateAll();
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", invalidateContent);
      server.watcher.on("change", invalidateContent);
      server.watcher.on("unlink", invalidateContent);
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url ?? "/";
        const path = raw.split("?")[0] ?? "/";
        // Locked-post-exclusive images mirror the production dist semantics:
        // plaintext always 404s (Vite would serve the original straight from
        // public/, so intercept first); .bin ciphertext is computed on the
        // fly by the build pipeline
        if (path.startsWith("/images/")) {
          try {
            const mod = (await server.ssrLoadModule("/tools/lockedImages.ts")) as {
              imageBinBytes: (rel: string) => Promise<Uint8Array> | undefined;
              isLockedImageSrc: (src: string) => boolean;
            };
            let decoded = path;
            try {
              decoded = decodeURIComponent(path);
            } catch {
              // Malformed encoding: fall back to the raw value
            }
            if (decoded.endsWith(".bin")) {
              const bytes = mod.imageBinBytes(decoded.replace(/^\/images\//, ""));
              if (bytes) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/octet-stream");
                res.end(await bytes);
                return;
              }
            } else if (mod.isLockedImageSrc(decoded)) {
              res.statusCode = 404;
              res.end();
              return;
            }
          } catch (error) {
            next(error);
            return;
          }
        }
        // Exported raw Markdown (same source and semantics as the production
        // index.md): dev serves the content/ original directly; locked posts
        // 404 (fail-closed, consistent with prerender not writing them to disk)
        const mdMatch = /\/(blogs|projects|travels)\/(.+)\/index\.md$/.exec(path);
        if (mdMatch) {
          try {
            const mod = (await server.ssrLoadModule("/tools/content.ts")) as {
              loadContent: () => {
                blogs: Array<{ slug: string; locked?: unknown }>;
                projects: Array<{ slug: string; locked?: unknown }>;
                travels: Array<{ slug: string; locked?: unknown }>;
              };
            };
            const kind = mdMatch[1] as "blogs" | "projects" | "travels";
            let slug = mdMatch[2] ?? "";
            try {
              slug = decodeURIComponent(slug);
            } catch {
              // Malformed encoding: fall back to the raw value
            }
            const entry = mod.loadContent()[kind].find((item) => item.slug === slug);
            if (!entry || entry.locked !== undefined) {
              res.statusCode = 404;
              res.end();
              return;
            }
            const markdown = readFileSync(`content/${kind}/${slug}.md`, "utf8");
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.end(markdown);
            return;
          } catch (error) {
            next(error);
            return;
          }
        }
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
    // The giscus iframe loads the self-hosted themes public/giscus-*.css via
    // <link crossorigin="anonymous">; the cross-origin request (giscus.app)
    // must get ACAO back, otherwise the browser blocks the theme stylesheet
    // and the comments section degrades to currentColor black boxes (the
    // production side provides the same header via public/_headers). Vite's
    // default origin whitelist only contains localhost.
    cors: {
      origin: [/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, "https://giscus.app"],
    },
  },
  build: {
    target: browserslistToEsbuild(manifest.browserslist),
    outDir: isSsrBuild ? ".vite-ssr" : "dist",
    emptyOutDir: true,
    manifest: !isSsrBuild,
    sourcemap: false,
    // The client entry points directly at src/main.tsx: the project has no
    // handwritten HTML template (every route's HTML is generated by ssr.tsx
    // and written to disk by prerender), so Vite's default index.html input
    // is dead weight. Same on the dev side — the dev middleware intercepts
    // all document requests ahead of Vite's built-in middlewares.
    rollupOptions: isSsrBuild
      ? { output: { entryFileNames: "ssr.mjs" } }
      : { input: fileURLToPath(new URL("./src/main.tsx", import.meta.url)) },
  },
}));

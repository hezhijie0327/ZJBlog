/**
 * 治杰 Online Lighthouse 门禁 — `npm run audit`
 *
 * 构建产物 out/ 由内置零依赖静态服务器托管（trailingSlash 语义与
 * Cloudflare Workers Static Assets 一致：/blogs/foo/ → /blogs/foo/index.html），
 * 审计页面列表直接从 out/sitemap.xml 解析 —— sitemap 有多少页面就审多少，
 * 每个页面要求 Performance / Accessibility / Best Practices / SEO /
 * Agentic Browsing 全部 100 分。
 *
 * LHR 原始报告归档在 .lighthouse-archive/<run>/（含 scores.json），
 * 需要本机 Chromium：chrome-launcher 会自动探测，或用 CHROME_PATH 指定。
 * LH_FORM_FACTOR=mobile 可切换到更严格的移动端 throttling 档位。
 */

import { existsSync, readFileSync, statSync as fsStatSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT_DIR = join(ROOT, "out");
const PORT = 8907;
const BASE = `http://127.0.0.1:${PORT}`;
const ARCHIVE_ROOT = process.env.LH_ARCHIVE_DIR ?? join(ROOT, ".lighthouse-archive");
const MOBILE = process.env.LH_FORM_FACTOR === "mobile";

/** 门禁阈值：所有已审计页面、所有类别必须满分 */
const THRESHOLDS = {
  performance: 100,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
  "agentic-browsing": 100,
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
};

/** 零依赖静态服务器：先按精确文件解析，再按 trailingSlash 目录解析 */
function serveStatic(dir, port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", BASE);
    // 生产环境由 Cloudflare 边缘提供 /cdn-cgi/trace（页脚彩蛋用）；
    // 审计环境镜像该行为，避免 404 控制台错误拉低 best-practices
    if (url.pathname === "/cdn-cgi/trace") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("ip=203.0.113.1\nkex=X25519MLKEM768\nwarp=on\nloc=CN\n");
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    // Next 16 静态导出的 RSC 预取：客户端请求点分扁平名
    // （/blogs/hello-world/__next.blogs.$d$slug.__PAGE__.txt），磁盘是斜杠目录
    // （out/blogs/hello-world/__next.blogs/$d$slug/__PAGE__.txt）
    // —— 在同目录下做点段到目录段的映射
    const candidates = [join(dir, pathname)];
    const lastSlash = pathname.lastIndexOf("/");
    const dirPart = pathname.slice(0, lastSlash + 1);
    const seg = pathname.slice(lastSlash + 1);
    const rsc = seg.match(/^(__next\.[^.]+)\.(.+\.txt)$/);
    if (rsc) {
      const nested = `${rsc[1]}/${rsc[2].replaceAll(".", "/")}`;
      candidates.push(join(dir, dirPart, nested));
    }
    // 防目录穿越 + 依次尝试：精确文件 → RSC 映射 → trailingSlash 目录
    candidates.push(join(dir, dirPart, "index.html"));
    const safe = candidates
      .map((p) => resolve(p))
      .filter((p) => p.startsWith(resolve(dir)));
    const filePath = safe.find((p) => existsSync(p) && !fsStatSync(p).isDirectory());
    if (!filePath) {
      // 与 Cloudflare Workers 行为一致的 404 页
      const notFound = join(dir, "404.html");
      res.writeHead(404, { "Content-Type": MIME[".html"] });
      res.end(existsSync(notFound) ? readFileSync(notFound) : "Not Found");
      return;
    }
    const body = readFileSync(filePath);
    // 与生产边缘一致的长缓存（/_next/static 内容寻址，immutable）
    const cacheControl = pathname.startsWith("/_next/static/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=300";
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    // 生产 CDN 会对文本类资源做压缩，审计环境保持一致
    const compressible =
      /^(text\/|application\/(json|xml|javascript))/.test(type) &&
      body.length > 1024 &&
      (req.headers["accept-encoding"] ?? "").includes("gzip");
    const out = compressible ? gzipSync(body) : body;
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": cacheControl,
      ...(compressible ? { "Content-Encoding": "gzip", Vary: "Accept-Encoding" } : {}),
    });
    res.end(out);
  });
  return new Promise((resolvePromise) => {
    server.listen(port, "127.0.0.1", () => resolvePromise(server));
  });
}

/** 从 sitemap.xml 提取本站路径（忽略外站 URL） */
function pagesFromSitemap() {
  const xml = readFileSync(join(OUT_DIR, "sitemap.xml"), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = locs
    .map((loc) => {
      try {
        return new URL(loc).pathname;
      } catch {
        return null;
      }
    })
    .filter((p) => p && p.endsWith("/"));
  if (paths.length === 0) throw new Error("sitemap.xml 中没有解析到任何页面");
  return paths;
}

async function waitFor(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url);
      if (resp.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`audit server did not come up at ${url}`);
}

// Lighthouse 内部偶发的未处理 rejection 不应打断整个门禁
process.on("unhandledRejection", (reason) => {
  console.log(`  … ignored internal rejection: ${String(reason?.message ?? reason).slice(0, 120)}`);
});

// chrome-launcher 找不到浏览器时，回退到常见的 Edge 安装位置
// （Windows 机器普遍没有 Chrome；Edge 同为 Chromium，Lighthouse 可直接驱动）
function resolveBrowserPath() {
  if (process.env.CHROME_PATH) return;
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
        : ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"];
  const edge = candidates.find((p) => existsSync(p));
  if (edge) {
    process.env.CHROME_PATH = edge;
    console.log(`using browser: ${edge}`);
  }
}

async function main() {
  if (!existsSync(join(OUT_DIR, "index.html"))) {
    throw new Error("out/ 不存在或未构建 —— 先运行 npm run build");
  }
  resolveBrowserPath();

  // LH_ONLY="/blogs/,/donation" 可只审计路径前缀匹配的页面（快速迭代用）
  const only = process.env.LH_ONLY;
  const allPaths = pagesFromSitemap();
  const paths = only
    ? allPaths.filter((p) => only.split(",").some((prefix) => p.startsWith(prefix.trim())))
    : allPaths;
  if (paths.length === 0) throw new Error(`LH_ONLY 过滤后没有页面: ${only}`);

  const server = await serveStatic(OUT_DIR, PORT);
  let chrome;
  let failed = false;
  const runDir = join(
    ARCHIVE_ROOT,
    `${new Date().toISOString().replace(/[:.]/g, "-")}${MOBILE ? "-mobile" : "-desktop"}`,
  );
  const scores = { form_factor: MOBILE ? "mobile" : "desktop", pages: {} };

  try {
    await waitFor(`${BASE}/`);
    const { launch } = await import("chrome-launcher");
    chrome = await launch({ chromeFlags: ["--headless=new"] });
    const lighthouse = (await import("lighthouse")).default;
    const config = MOBILE
      ? undefined
      : (await import("lighthouse/core/config/desktop-config.js")).default;

    /** 单页审计；headless Chrome 偶发 trace 中止（全 0 分）时重试一次 */
    async function runPage(url) {
      let lastError;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await lighthouse(url, { port: chrome.port, output: "json" }, config);
          const lhr = result.lhr;
          const allZero = Object.values(lhr.categories).every((c) => (c.score ?? 0) === 0);
          if (!allZero) return lhr;
          lastError = new Error(lhr.runtimeError?.message ?? "all categories scored 0 (load error)");
        } catch (error) {
          lastError = error;
        }
        if (attempt === 1) {
          console.log("  … lighthouse trace failed, retrying once");
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      throw lastError;
    }

    for (const path of paths) {
      console.log(`\n${path}${MOBILE ? "  (mobile)" : ""}`);
      let lhr;
      try {
        lhr = await runPage(`${BASE}${path}`);
      } catch (error) {
        failed = true;
        console.log(`  ERROR: ${String(error.message ?? error).slice(0, 160)}`);
        continue;
      }

      await mkdir(runDir, { recursive: true });
      const slug = path.replace(/^\/+|\/+$/g, "").replaceAll("/", "_") || "home";
      await writeFile(join(runDir, `${slug}.lhr.json`), JSON.stringify(lhr));

      const pageScores = {};
      for (const [cat, threshold] of Object.entries(THRESHOLDS)) {
        const score = Math.round((lhr.categories[cat]?.score ?? 0) * 100);
        const ok = score >= threshold;
        failed = failed || !ok;
        pageScores[cat] = score;
        console.log(`  ${cat.padEnd(18)} ${String(score).padStart(3)}  (min ${threshold})${ok ? "" : "  FAIL"}`);
      }
      scores.pages[path] = pageScores;

      // 列出所有未满分的具体 audit，便于定位修复（informative 级 insights 不参与门禁）
      for (const category of Object.values(lhr.categories)) {
        for (const ref of category.auditRefs) {
          const audit = lhr.audits[ref.id];
          if (
            audit &&
            audit.score !== null &&
            audit.score !== undefined &&
            audit.score < 1 &&
            !["manual", "notApplicable", "informative"].includes(audit.scoreDisplayMode)
          ) {
            console.log(`    ! ${audit.id}${audit.displayValue ? ` (${audit.displayValue})` : ""}`);
          }
        }
      }
    }

    await mkdir(runDir, { recursive: true });
    await writeFile(join(runDir, "scores.json"), JSON.stringify(scores, null, 2));
    console.log(`\narchived: ${runDir}`);
  } finally {
    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        // chrome-launcher 在 Windows 上的清理异常不影响审计结果
      }
    }
    server.close();
  }

  console.log(failed ? "\naudit FAILED" : "\naudit passed");
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

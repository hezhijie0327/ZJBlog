// 死链检查（手动/定期运行，不在构建门禁里）：扫描 dist/ 全部 HTML 中的
// 外部链接，逐个发 GET 验证可达性。内部链接（站内路径 / 锚点）由
// `pnpm run audit` 的 sitemap 覆盖，这里只查 http(s) 外链。
//
//   pnpm run linkcheck            # 全量检查
//   pnpm run linkcheck -- --fast  # 只查每页前 10 个链接（快速抽样）
//
// 429/5xx 视为「无法确认」而非死链（GitHub 匿名限额等），退出码 1 = 存在
// 确认死链（404/410/DNS 失败）。

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve("dist");
const FAST_LIMIT = 10;
const CONCURRENCY = 8;
const fastMode = process.argv.includes("--fast");

/** @param {string} dir */
function collectHtmlFiles(dir) {
  return readdir(dir, { recursive: true, withFileTypes: true }).then((entries) =>
    entries.filter((e) => e.isFile() && e.name.endsWith(".html")).map((e) => path.join(e.parentPath, e.name)),
  );
}

/** @param {string} html */
function extractExternalLinks(html) {
  const links = new Set();
  for (const match of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const raw = match[1];
    if (!raw) {
      continue;
    }
    let url;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    links.add(url.href);
  }
  return [...links];
}

/** @param {string} url */
async function checkLink(url) {
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "blog-linkcheck/1.0 (+site health check)" },
    });
    if (resp.status === 429 || resp.status >= 500) {
      return { url, status: "unconfirmed", detail: `HTTP ${resp.status}` };
    }
    return resp.ok ? { url, status: "ok" } : { url, status: "dead", detail: `HTTP ${resp.status}` };
  } catch (err) {
    const message = err instanceof Error ? String(err.message) : String(err);
    return { url, status: "unconfirmed", detail: message.slice(0, 80) };
  }
}

const files = await collectHtmlFiles(DIST);
const perPage = new Map();
for (const file of files) {
  const html = await readFile(file, "utf8");
  const relative = path.relative(DIST, file);
  let links = extractExternalLinks(html);
  if (fastMode) {
    links = links.slice(0, FAST_LIMIT);
  }
  perPage.set(relative, links);
}

const all = [...new Set([...perPage.values()].flat())];
console.log(`checking ${all.length} unique external links across ${files.length} pages${fastMode ? " (fast)" : ""}…`);

const results = new Map();
for (let i = 0; i < all.length; i += CONCURRENCY) {
  const batch = all.slice(i, i + CONCURRENCY);
  const checked = await Promise.all(batch.map(checkLink));
  for (const result of checked) {
    results.set(result.url, result);
  }
}

let dead = 0;
let unconfirmed = 0;
for (const result of [...results.values()].sort((a, b) => a.status.localeCompare(b.status))) {
  if (result.status === "dead") {
    dead += 1;
    console.log(`  DEAD    ${result.url} (${result.detail})`);
  } else if (result.status === "unconfirmed") {
    unconfirmed += 1;
    console.log(`  SKIP    ${result.url} (${result.detail})`);
  }
}

console.log(`\ndone: ${results.size} links, ${dead} dead, ${unconfirmed} unconfirmed`);
process.exit(dead > 0 ? 1 : 0);

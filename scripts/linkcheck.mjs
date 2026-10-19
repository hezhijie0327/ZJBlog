// Dead link check (run manually/periodically, not part of the build gate):
// scans all external links in every HTML file under dist/ and sends a GET for
// each to verify reachability. Internal links (site paths / anchors) are
// covered by `pnpm run audit`'s sitemap crawl; only http(s) external links
// are checked here.
//
//   pnpm run linkcheck            # full check
//   pnpm run linkcheck -- --fast  # only the first 10 links per page (quick sampling)
//
// 429/5xx count as "unconfirmed" rather than dead (GitHub anonymous rate
// limits etc.); exit code 1 = confirmed dead links exist (404/410/DNS failure).

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

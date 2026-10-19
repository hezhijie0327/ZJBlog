// Build-time image pipeline: the repo's public/images/ stores the original
// PNG/JPG; final artifacts are always webp (aligned with Lab/Web's Astro
// image pipeline). Runs after prerender:
//   1) jpg/png inside dist/images → same-named .webp (max width 1920, q80,
//      never upscale), original file deleted
//   2) dist root-level contact assets (ROOT_ASSETS whitelist, DESIGN.md §2.4
//      keeps them at the public/ root) converted the same way
//   3) scan .html/.xml/.txt under dist and rewrite references to converted
//      files as .webp
// Post bodies always reference the original extension (/images/x.jpg,
// /avatar.jpg); dev serves the originals directly. Originals in the repo are
// never modified — compression only happens on build artifacts.
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";

const dist = process.argv[2] ?? "dist";
const imagesDir = join(dist, "images");
const MAX_WIDTH = 1920; // Shrink proportionally above this; never upscale

/** Whitelist of dist root-level contact assets (originals do not live in
 *  images/; converted to webp here at build time). maxWidth is set per
 *  display slot and originals are never modified; favicon / apple-touch /
 *  og-default must stay png (platform compatibility) and the payment QR code
 *  is already small, so none of them are listed. */
const ROOT_ASSETS = [{ file: "avatar.jpg", maxWidth: 512 }]; // avatar display slot is 176px, 512 ≈ 3x

/** @param {string} dir @param {RegExp} pattern @returns {Generator<string, void, void>} */
function* walk(dir, pattern) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p, pattern);
    else if (entry.isFile() && pattern.test(entry.name)) yield p;
  }
}

const refMap = new Map(); // "/images/a/b.jpg" -> "/images/a/b.webp"
let count = 0;
let srcBytes = 0;
let webpBytes = 0;

/** jpg/png → webp (max width, q80, never upscale); deletes the original from
 *  the artifacts and registers the reference rewrite. */
/** @param {string} p @param {string} relTo @param {string} urlBase @param {number} maxWidth */
async function toWebp(p, relTo, urlBase, maxWidth) {
  const webpPath = p.replace(/\.(jpe?g|png)$/i, ".webp");
  const meta = await sharp(p, { failOn: "none" }).metadata();
  const pipeline = meta.width > maxWidth ? sharp(p).resize({ width: maxWidth }) : sharp(p);
  await pipeline.webp({ quality: 80 }).toFile(webpPath);

  const srcSize = statSync(p).size;
  const webpSize = statSync(webpPath).size;
  srcBytes += srcSize;
  webpBytes += webpSize;
  unlinkSync(p);
  count += 1;

  const rel = relative(relTo, p).replace(/\\/g, "/");
  const from = `${urlBase}/${rel}`;
  const to = `${urlBase}/${rel.replace(/\.(jpe?g|png)$/i, ".webp")}`;
  refMap.set(from, to);
  const shrunk = meta.width > maxWidth ? ` (${meta.width}->${maxWidth}px)` : "";
  console.log(`${from}: ${(srcSize / 1024) | 0}kB -> ${(webpSize / 1024) | 0}kB webp${shrunk}`);
}

// Protection list of shared images referenced by locked posts (written by
// prerender; deleted right after reading, never shipped): these files'
// original extensions are locked inside the AES-GCM ciphertext and out of
// reach of reference rewriting, so converting to webp and deleting the
// originals would 404 the shared images after the locked post is unlocked.
const PROTECTED_LIST = join(dist, ".locked-shared-images.json");
/** @type {Set<string>} dist-relative paths (e.g. "images/markdown-test/favicon.png") */
const protectedFiles = new Set();
try {
  const list = JSON.parse(readFileSync(PROTECTED_LIST, "utf8"));
  for (const src of /** @type {string[]} */ (list)) {
    protectedFiles.add(src.replace(/^\//, ""));
  }
} catch {
  // No locked posts or manifest missing: nothing to protect
}
try {
  unlinkSync(PROTECTED_LIST);
} catch {
  // A missing manifest means no locked posts
}

if (statSync(imagesDir, { throwIfNoEntry: false })) {
  for (const p of walk(imagesDir, /\.(jpe?g|png)$/i)) {
    const rel = relative(imagesDir, p).replace(/\\/g, "/");
    if (protectedFiles.has(join("images", rel).replace(/\\/g, "/"))) {
      console.log(`${p}: kept (referenced by locked post envelope)`);
      continue;
    }
    await toWebp(p, imagesDir, "/images", MAX_WIDTH);
  }
}
for (const { file, maxWidth } of ROOT_ASSETS) {
  const p = join(dist, file);
  if (statSync(p, { throwIfNoEntry: false })) {
    await toWebp(p, dist, "", maxWidth);
  }
}

let files = 0;
// Rewrite surface = .html/.xml/.txt (prerender output and generated files,
// with payload JSON embedded inside)
// + .js (after SPA navigation, components remount from literals in the
//   bundle; without rewriting they would reference the deleted original
//   extension and 404)
// + .json (post-body references inside generated indexes like search-index)
// + .md (exported raw Markdown: image references out of sync with webp make
//   copy/direct fetch dead links).
for (const p of walk(dist, /\.(html|xml|txt|js|json|md)$/i)) {
  let html = readFileSync(p, "utf8");
  let changed = false;
  for (const [from, to] of refMap) {
    if (html.includes(from)) {
      html = html.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(p, html);
    files += 1;
  }
}

console.log(
  `compress-images: ${count} images converted to webp (${(srcBytes / 1024).toFixed(0)}kB -> ${(webpBytes / 1024).toFixed(0)}kB), references rewritten in ${files} files`,
);

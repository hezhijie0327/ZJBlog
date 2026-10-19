// Build-time pipeline for images exclusive to locked posts (Node side only):
// analyzes every image referenced site-wide (compiled HTML of blogs +
// projects); "exclusive images" referenced only by locked posts are encrypted
// along with their post — the ciphertext lands as a `<orig-path>.<slug>.bin`
// asset (production: prerenderAll writes it to dist and deletes the plaintext
// original; dev: the vite middleware computes it on the fly through this
// module, see plgDevServer in vite.config). Encryption reuses the post's
// Argon2id derived key (same password as the body); the IV is independently
// random and written into the post envelope's plaintext (the client only gets
// the IV table after unlocking). Shared images (referenced by any public
// content) physically cannot be encrypted — kept plaintext with a warning;
// docs require private photos to use files exclusive to the locked post.
//
// jpg/png are uniformly sharp→webp at build time (max width 1920 / q80,
// aligned with the public image compression pipeline) before encryption;
// other formats are encrypted as raw bytes.

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { keyFor } from "./crypto";

const MAX_WIDTH = 1920;

/** Site-image references in compiled HTML (rehype-stringify normalizes to
 *  double-quoted attributes) */
const IMG_TAG = /<img[^>]*?src="(\/images\/[^"]+)"/g;

/** `<kind>:<slug>` namespace key → site images referenced by that post's body
 *  (matches the crypto key namespace — blogs and travels may share a slug,
 *  and bare slugs would overwrite each other). */
const refsByKey = new Map<string, Set<string>>();
/** Images referenced by any non-locked content (public surface, cannot be
 *  encrypted) */
const publicRefs = new Set<string>();
/** Shared images referenced by locked posts yet kept plaintext
 *  (compress-images must keep the original extension — the reference inside
 *  the envelope ciphertext cannot be rewritten, and deleting the original
 *  would 404 after unlock) */
const sharedLockedSrcs = new Set<string>();
/** Exclusive-image registry: bin relative path (without the /images/ prefix)
 *  → encryption material */
interface SealedImage {
  /** `<kind>:<slug>` namespace key */
  key: string;
  slug: string;
  src: string;
  iv: Buffer;
  /** MIME of the decrypted blob */
  ct: string;
}
const sealedByRel = new Map<string, SealedImage>();
const bytesCache = new Map<string, Promise<Buffer>>();
const warnedShared = new Set<string>();

/** Register a content item's image refs before sealing (must be called for
 *  every entry before sealing — exclusivity is a site-wide judgment).
 *  locked=false references push the image onto the public surface. key is the
 *  `<kind>:<slug>` namespace key, matching sealImagesForPost / crypto keys. */
export function noteImageRefs(key: string, html: string, locked: boolean): void {
  let refs: Set<string> | undefined;
  for (const match of html.matchAll(IMG_TAG)) {
    const src = match[1];
    if (!src) {
      continue;
    }
    refs ??= new Set();
    refs.add(src);
    if (!locked) {
      publicRefs.add(src);
    }
  }
  if (refs) {
    refsByKey.set(key, refs);
  }
}

/** Seal content: produce the exclusive-image IV table for a locked post
 *  (goes into the envelope ciphertext together with the body).
 *  key = `<kind>:<slug>` namespace key; slug is only for .bin asset naming.
 *  Shared images are warned about and skipped (registered into
 *  sharedLockedSrcs; the compression pipeline keeps the original file);
 *  the return value merges directly into the envelope plaintext JSON. */
export function sealImagesForPost(key: string, slug: string): Record<string, { iv: string; ct: string }> {
  const images: Record<string, { iv: string; ct: string }> = {};
  for (const src of refsByKey.get(key) ?? []) {
    if (publicRefs.has(src)) {
      if (!warnedShared.has(src)) {
        warnedShared.add(src);
        console.warn(
          `[crypto] ${src} is also referenced by public content and cannot be encrypted (kept plaintext) — private photos must use files exclusive to the locked post`,
        );
      }
      sharedLockedSrcs.add(src);
      continue;
    }
    const reencoded = /\.(jpe?g|png)$/i.test(src);
    const iv = randomBytes(12);
    const rel = `${src}.${slug}.bin`.replace(/^\/images\//, "");
    // When locked posts sharing a slug (blogs:foo and travels:foo) both claim
    // the same image, the .bin asset paths collide while the keys differ —
    // last-write-wins would leave one of them forever undecryptable;
    // fail-closed
    const existing = sealedByRel.get(rel);
    if (existing && existing.key !== key) {
      throw new Error(
        `[crypto] ${rel}: exclusive-image asset name collision (${existing.key} and ${key} share a slug) — rename the slug of one of them`,
      );
    }
    sealedByRel.set(rel, { key, slug, src, iv, ct: reencoded ? "image/webp" : mimeForSrc(src) });
    images[src] = { iv: iv.toString("base64"), ct: reencoded ? "image/webp" : mimeForSrc(src) };
  }
  return images;
}

/** Shared images referenced by locked posts yet kept plaintext (prerender
 *  writes the manifest; compress-images skips conversion and keeps the
 *  original file accordingly — the original-extension reference inside the
 *  envelope ciphertext cannot be rewritten). */
export function allLockedSharedSrcs(): string[] {
  return [...sharedLockedSrcs];
}

function mimeForSrc(src: string): string {
  const ext = src.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

/** Exclusive-image ciphertext bytes (shared by prerender disk writes and the
 *  dev middleware; cached within the process). */
export function imageBinBytes(rel: string): Promise<Buffer> | undefined {
  const sealed = sealedByRel.get(rel);
  if (!sealed) {
    return undefined;
  }
  let pending = bytesCache.get(rel);
  if (!pending) {
    pending = encryptImage(sealed);
    bytesCache.set(rel, pending);
  }
  return pending;
}

async function encryptImage(sealed: SealedImage): Promise<Buffer> {
  const abs = path.join(process.cwd(), "public", sealed.src);
  let payload = readFileSync(abs);
  if (sealed.ct === "image/webp") {
    const meta = await sharp(abs, { failOn: "none" }).metadata();
    const pipeline = (meta.width ?? 0) > MAX_WIDTH ? sharp(abs).resize({ width: MAX_WIDTH }) : sharp(abs);
    payload = await pipeline.webp({ quality: 80 }).toBuffer();
  }
  const cipher = createCipheriv("aes-256-gcm", keyFor(sealed.key), sealed.iv);
  return Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]);
}

/** All exclusive images (for prerenderAll disk writes). */
export function allSealedImages(): Array<{ rel: string; src: string; bytes: Promise<Buffer> }> {
  return [...sealedByRel.entries()].map(([rel, sealed]) => ({
    rel,
    src: sealed.src,
    bytes: imageBinBytes(rel) as Promise<Buffer>,
  }));
}

/** Dev middleware: does a plaintext address belong to an encrypted exclusive
 *  image (if so it must 404, isomorphic with the production dist) */
export function isLockedImageSrc(src: string): boolean {
  for (const sealed of sealedByRel.values()) {
    if (sealed.src === src) {
      return true;
    }
  }
  return false;
}

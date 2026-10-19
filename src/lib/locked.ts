// Client-side unlocking of encrypted posts (build-time encryption lives in
// tools/crypto.ts and tools/lockedImages.ts; the two sides communicate through the
// LockedContent envelope in types.ts): Argon2id-derived key + WebCrypto AES-256-GCM
// decryption, with every parameter taken from the envelope.
//
// Security boundary: plaintext and the derived key live only in session memory (a Map;
// CryptoKey is non-extractable) — they survive in-SPA client-side navigation and are
// lost on refresh; only ciphertext is ever persisted. The password is never cached,
// never put in URLs, never placed in any storage. Images are displayed via blob URLs
// (valid within the same-origin session, matching the page lifetime).

import type { LockedContent, TocItem } from "@/lib/types.ts";

/** Decrypted body bundle (isomorphic to the build-time envelope plaintext): images is
 *  the exclusive-image IV table (src → IV + decrypted MIME), with .bin assets fetched by
 *  the `<src>.<slug>.bin` convention. */
export interface UnlockedBundle {
  html: string;
  toc: TocItem[];
  images?: Record<string, { iv: string; ct: string }>;
}

/** Wrong password (GCM authentication failure). Callers render the error state from
 *  this and do not distinguish other decryption failures — corrupted ciphertext and a
 *  wrong password are the same thing to the user: the content is unrecoverable. */
export class UnlockError extends Error {
  constructor() {
    super("unlock failed");
    this.name = "UnlockError";
  }
}

/** Session-level unlock cache: slug → plaintext + derived key (reused to decrypt image
 *  ciphertext). Module-scoped and always empty on first load (including refresh), so the
 *  hydration initial render matches SSR. */
const unlockedBundles = new Map<string, { bundle: UnlockedBundle; key: CryptoKey }>();

/** Blob URL cache for images: re-mounting Prose within a session neither re-decrypts
 *  nor re-creates URLs. */
const objectUrls = new Map<string, string>();

export function getCachedUnlock(slug: string): UnlockedBundle | undefined {
  return unlockedBundles.get(slug)?.bundle;
}

function bytesFromBase64(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

/** Fetch one exclusive image's ciphertext and decrypt it into a blob URL; returns null
 *  on failure (the body keeps the original reference, shown as a broken image with alt —
 *  assets and the envelope ship in the same build, so failure is theoretically unreachable). */
async function resolveImage(
  slug: string,
  src: string,
  meta: { iv: string; ct: string },
  key: CryptoKey,
): Promise<string | null> {
  const cacheKey = `${slug}\n${src}`;
  const cached = objectUrls.get(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(`${encodeURI(src)}.${encodeURI(slug)}.bin`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const sealed = await response.arrayBuffer();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytesFromBase64(meta.iv) }, key, sealed);
    const url = URL.createObjectURL(new Blob([plain], { type: meta.ct }));
    objectUrls.set(cacheKey, url);
    return url;
  } catch (error) {
    console.warn(`[locked] image decryption failed, keeping the original reference: ${src}`, error);
    return null;
  }
}

/** Verify the password and decrypt. On success, exclusive images are resolved in parallel
 *  (src swapped for blob URLs) and the result is written to the session cache; GCM
 *  authentication failure throws UnlockError.
 *  cacheKey is the namespace key of the unlock cache (blogs and travels can share slugs);
 *  assetSlug is the bare slug used to name .bin assets (build-time `${src}.${slug}.bin`
 *  convention — a namespace-prefixed key can never match the on-disk file, and every
 *  image would silently fail to decrypt). */
export async function unlockPost(
  cacheKey: string,
  locked: LockedContent,
  password: string,
  assetSlug: string = cacheKey,
): Promise<UnlockedBundle> {
  const cached = unlockedBundles.get(cacheKey);
  if (cached) {
    return cached.bundle;
  }
  // hash-wasm (wasm inlined) is fetched only when unlocking an encrypted page, never in
  // regular page chunks; the output is copied into an explicitly ArrayBuffer-backed array
  // (BufferSource narrowing for importKey)
  const { argon2id } = await import("hash-wasm");
  const keyBits = new Uint8Array(
    await argon2id({
      password,
      salt: bytesFromBase64(locked.salt),
      iterations: locked.t,
      parallelism: locked.p,
      memorySize: locked.m,
      hashLength: locked.len,
      outputType: "binary",
    }),
  );
  const key = await crypto.subtle.importKey("raw", keyBits, "AES-GCM", false, ["decrypt"]);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytesFromBase64(locked.iv) },
      key,
      bytesFromBase64(locked.ciphertext),
    );
  } catch {
    // Tag verification failure = wrong password (ciphertext comes from build time;
    // corruption could only happen in transit, by which point payload parsing would
    // already have failed); do not leak the specific failure reason outward
    throw new UnlockError();
  }
  const bundle = JSON.parse(new TextDecoder().decode(plain)) as UnlockedBundle;

  // Exclusive images: swap src for decrypted blob URLs before injecting the body
  // (build-time HTML references are normalized to double-quoted attributes, same source
  // as the parsing regex in tools/lockedImages.ts)
  const imageEntries = Object.entries(bundle.images ?? {});
  if (imageEntries.length > 0) {
    const urls = await Promise.all(imageEntries.map(([src, meta]) => resolveImage(assetSlug, src, meta, key)));
    let html = bundle.html;
    for (let i = 0; i < imageEntries.length; i += 1) {
      const src = imageEntries[i]?.[0];
      const url = urls[i];
      if (src && url) {
        html = html.split(`src="${src}"`).join(`src="${url}"`);
      }
    }
    bundle.html = html;
  }

  unlockedBundles.set(cacheKey, { bundle, key });
  return bundle;
}

// 加密博文独占图片的构建期管线（Node 侧专用）：分析全站引用图（blogs +
// projects 的编译后 HTML），只被锁定文引用的「独占图」随文加密 —— 密文以
// `<原路径>.<slug>.bin` 资产落盘（生产由 prerenderAll 写入 dist 并删除明文
// 原图；dev 由 vite 中间件经本模块现算，见 vite.config plgDevServer）。
// 加密复用该文的 Argon2id 派生密钥（口令同正文），IV 独立随机并写进正文
// 信封的明文（客户端解锁后才能拿到 IV 表）。共享图（任何公开内容也引用）
// 物理上无法加密 —— 保持明文并告警，文档要求私密照片独占文件。
//
// jpg/png 构建期统一 sharp→webp（限宽 1920 / q80，与公开图压缩管线对齐）
// 后再加密；其余格式原字节加密。

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { keyFor } from "./crypto";

const MAX_WIDTH = 1920;

/** 编译后 HTML 里的站内图片引用（rehype-stringify 归一化为双引号属性） */
const IMG_TAG = /<img[^>]*?src="(\/images\/[^"]+)"/g;

/** slug → 该文正文引用的站内图片 */
const refsBySlug = new Map<string, Set<string>>();
/** 被任何非锁定内容引用的图片（公开面，无法加密） */
const publicRefs = new Set<string>();
/** 独占图登记：bin 相对路径（不含 /images/ 前缀）→ 加密材料 */
interface SealedImage {
  /** `<kind>:<slug>` 命名空间密钥 */
  key: string;
  slug: string;
  src: string;
  iv: Buffer;
  /** 解密后 blob 的 MIME */
  ct: string;
}
const sealedByRel = new Map<string, SealedImage>();
const bytesCache = new Map<string, Promise<Buffer>>();
const warnedShared = new Set<string>();

/** 密封前登记一条内容的图片引用（必须对全量条目调用后再密封 —— 独占性是
 *  全站判定）。locked=false 的引用使图片进入公开面。 */
export function noteImageRefs(slug: string, html: string, locked: boolean): void {
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
    refsBySlug.set(slug, refs);
  }
}

/** 内容密封：为锁定文生成独占图 IV 表（随正文一起进信封密文）。
 *  key = `<kind>:<slug>` 命名空间密钥，slug 用于 .bin 资产命名。
 *  共享图告警并跳过；返回值直接并入信封明文 JSON。 */
export function sealImagesForPost(key: string, slug: string): Record<string, { iv: string; ct: string }> {
  const images: Record<string, { iv: string; ct: string }> = {};
  for (const src of refsBySlug.get(slug) ?? []) {
    if (publicRefs.has(src)) {
      if (!warnedShared.has(src)) {
        warnedShared.add(src);
        console.warn(`[crypto] ${src} 同时被公开内容引用，无法加密（保持明文）—— 私密照片请使用加密文独占的文件`);
      }
      continue;
    }
    const reencoded = /\.(jpe?g|png)$/i.test(src);
    const iv = randomBytes(12);
    const sealed: SealedImage = {
      key,
      slug,
      src,
      iv,
      ct: reencoded ? "image/webp" : mimeForSrc(src),
    };
    sealedByRel.set(`${src}.${slug}.bin`.replace(/^\/images\//, ""), sealed);
    images[src] = { iv: iv.toString("base64"), ct: sealed.ct };
  }
  return images;
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

/** 独占图密文字节（prerender 落盘与 dev 中间件共用；同进程内缓存）。 */
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

/** 全部独占图（prerenderAll 落盘用）。 */
export function allSealedImages(): Array<{ rel: string; src: string; bytes: Promise<Buffer> }> {
  return [...sealedByRel.entries()].map(([rel, sealed]) => ({
    rel,
    src: sealed.src,
    bytes: imageBinBytes(rel) as Promise<Buffer>,
  }));
}

/** dev 中间件：明文地址是否属于加密独占图（是则必须 404，与生产 dist 同构） */
export function isLockedImageSrc(src: string): boolean {
  for (const sealed of sealedByRel.values()) {
    if (sealed.src === src) {
      return true;
    }
  }
  return false;
}

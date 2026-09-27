// 加密博文的客户端解锁（构建期加密见 tools/crypto.ts 与 tools/lockedImages.ts，
// 两端经 types.ts 的 LockedContent 信封互通）：Argon2id 派生密钥 + WebCrypto
// AES-256-GCM 解密，全部参数以信封为准。
//
// 安全边界：明文与派生密钥只进会话内存（Map，CryptoKey 不可导出），SPA 内
// 换页不丢、刷新即失 —— 落盘的永远只有密文；口令不缓存、不进 URL、不进
// 任何存储。图片经 blob URL 显示（同源会话内有效，与页面生命周期一致）。

import type { LockedContent, TocItem } from "@/lib/types.ts";

/** 解密后的正文包（与构建期信封明文同构）：images 为独占图 IV 表
 *  （src → IV + 解密后 MIME），.bin 资产按 `<src>.<slug>.bin` 约定取。 */
export interface UnlockedBundle {
  html: string;
  toc: TocItem[];
  images?: Record<string, { iv: string; ct: string }>;
}

/** 密码不对（GCM 认证失败）。调用方据此渲染错误态，不区分其他解密异常 ——
 *  密文损坏与密码错误对用户是同一件事：内容拿不回来。 */
export class UnlockError extends Error {
  constructor() {
    super("unlock failed");
    this.name = "UnlockError";
  }
}

/** 会话级解锁缓存：slug → 明文 + 派生密钥（解图片密文复用）。模块作用域，
 *  首次加载（含刷新）时必为空，因此水合初始渲染与 SSR 一致。 */
const unlockedBundles = new Map<string, { bundle: UnlockedBundle; key: CryptoKey }>();

/** 图片 blob URL 缓存：同会话内重复挂载 Prose 不重复解密/创建 URL。 */
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

/** 拉取一张独占图密文并解密为 blob URL；失败返回 null（正文保留原引用，
 *  显示为带 alt 的断图 —— 资产与信封同构建发布，失败理论不可达）。 */
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
    console.warn(`[locked] 图片解密失败，保留原引用: ${src}`, error);
    return null;
  }
}

/** 校验口令并解密。成功后并行解析独占图（src 换成 blob URL），结果写入
 *  会话缓存；GCM 认证失败抛 UnlockError。 */
export async function unlockPost(slug: string, locked: LockedContent, password: string): Promise<UnlockedBundle> {
  const cached = unlockedBundles.get(slug);
  if (cached) {
    return cached.bundle;
  }
  // hash-wasm（wasm 内联）仅加密页解锁时才拉取，不进常规页面 chunk；
  // 输出复制进显式 ArrayBuffer 背书的数组（importKey 的 BufferSource 收窄）
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
    // tag 校验失败 = 密码错误（密文来自构建期，损坏只可能出现在传输层，
    // 那时 payload 解析早已失败）；不向外泄漏具体失败原因
    throw new UnlockError();
  }
  const bundle = JSON.parse(new TextDecoder().decode(plain)) as UnlockedBundle;

  // 独占图：正文注入前把 src 换成解密后的 blob URL（构建期 HTML 引用归一化
  // 为双引号属性，与 tools/lockedImages.ts 的分析正则同源）
  const imageEntries = Object.entries(bundle.images ?? {});
  if (imageEntries.length > 0) {
    const urls = await Promise.all(imageEntries.map(([src, meta]) => resolveImage(slug, src, meta, key)));
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

  unlockedBundles.set(slug, { bundle, key });
  return bundle;
}

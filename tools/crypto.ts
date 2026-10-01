// 构建期加密（Node 侧专用，客户端 bundle 永不引入本文件；对应的浏览器端
// 解密实现见 src/lib/locked.ts，两者经 src/lib/types.ts 的 LockedContent
// 信封契约互通）。
//
// 安全模型：纯静态托管没有服务端，采用构建期真加密 —— 标记了
// `secret: <name>` 的博文，其正文 HTML + TOC 的明文只存在于构建内存，
// 落盘前完成 AES-256-GCM 加密，产物中不存在任何明文。
//
// 口令供给：frontmatter `secret: <name>` → 环境变量 BLOG_SECRET_<NAME>
// （name 大写化）。查找顺序 process.env → 仓库根 .env.local → .env
// （.env* 均已 gitignore）。**缺失即构建失败（fail-closed）**，绝不静默
// 降级为明文。
//
// KDF：Argon2id（OWASP 密码存储当前首选，内存困难，实质性抬高 GPU/ASIC
// 离线爆破成本）。参数取 OWASP 建议档的加强版（64 MiB / t=3 / p=1 /
// 32B 输出）并随信封存档，客户端按信封参数解密 —— 参数可以演进而不破坏
// 旧文。盐每篇每构建独立（16B 随机），同口令多篇互不相关。

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { argon2id } from "hash-wasm";
import type { LockedContent } from "../src/lib/types.ts";

/** Argon2id 参数（OWASP 2023+ 建议档 19MiB/t=2/p=1 的加强版）。
 *  客户端单次派生约 100-300ms，是「输错密码重试」的天然节流阀。 */
const ARGON2ID_PARAMS = { m: 65536, t: 3, p: 1, len: 32 } as const;

/** secret 名 → 环境变量名（仅允许安全字符，防注入意外变量名）。 */
const SECRET_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function envNameForSecret(name: string): string {
  return `BLOG_SECRET_${name.toUpperCase()}`;
}

/** .env 文件解析（十几行覆盖自身用例：KEY=VALUE / # 注释 / 成对引号），
 *  不引入 dotenv 依赖。返回的值不会写回 process.env，仅作查漏兜底。 */
function parseEnvFile(file: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return {};
  }
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key !== "") {
      values[key] = value;
    }
  }
  return values;
}

/** name → 口令。fail-closed：任何一步不满足都直接抛错终止构建。 */
export function loadSecret(name: string, context: string): string {
  if (!SECRET_NAME_PATTERN.test(name)) {
    throw new Error(`[crypto] ${context}: secret 名 "${name}" 不合法（需匹配 ${SECRET_NAME_PATTERN.source}）`);
  }
  const envName = envNameForSecret(name);
  const fromProcess = process.env[envName];
  let password = fromProcess;
  if (password === undefined) {
    for (const file of [".env.local", ".env"]) {
      const value = parseEnvFile(path.resolve(process.cwd(), file))[envName];
      if (value !== undefined) {
        password = value;
        break;
      }
    }
  }
  if (password === undefined || password === "") {
    throw new Error(
      `[crypto] ${context}: 标记了 secret: ${name}，但找不到口令 —— 请设置环境变量 ${envName}` +
        `（或写入仓库根 .env / .env.local，均已 gitignore）。构建拒绝在无口令时产出明文。`,
    );
  }
  if (password.length < 8) {
    throw new Error(`[crypto] ${context}: ${envName} 少于 8 个字符，拒绝构建（密文的唯一防线就是口令强度）`);
  }
  if (password.length < 16) {
    console.warn(`[crypto] ${context}: ${envName} 建议至少 16 个字符（长口令是对离线爆破的唯一防线）`);
  }
  return password;
}

/** 每篇文章的派生材料：盐在预派生阶段生成并冻结，加密阶段同步取用。 */
interface KeyMaterial {
  key: Buffer;
  salt: Buffer;
}

/** slug → 派生材料。由 deriveSecretKeys 在模块加载期填充。 */
const keyMaterials = new Map<string, KeyMaterial>();

export interface SecretRef {
  /** 密钥命名空间：blogs 与 travels 的 slug 可能同名，一律 `<kind>:<slug>` */
  key: string;
  /** 错误信息里的可读位置（如 blogs/xxx.md） */
  context: string;
  secretName: string;
}

/** 预派生密钥（Argon2id 是异步 API，而内容管线全同步 —— 与 shiki 同一
 *  模式：模块加载期 await 完成重活，请求/构建路径保持同步）。每篇独立盐，
 *  同名 secret 的多篇内容密钥互不相同。 */
export async function deriveSecretKeys(refs: SecretRef[]): Promise<void> {
  for (const ref of refs) {
    const password = loadSecret(ref.secretName, ref.context);
    const salt = randomBytes(16);
    const key = Buffer.from(
      await argon2id({
        password,
        salt,
        iterations: ARGON2ID_PARAMS.t,
        parallelism: ARGON2ID_PARAMS.p,
        memorySize: ARGON2ID_PARAMS.m,
        hashLength: ARGON2ID_PARAMS.len,
        outputType: "binary",
      }),
    );
    keyMaterials.set(ref.key, { key, salt });
  }
}

/** 取已预派生的内容密钥（图片等同文衍生资产复用同一把口令密钥）。 */
export function keyFor(key: string): Buffer {
  const material = keyMaterials.get(key);
  if (!material) {
    throw new Error(`[crypto] ${key}: 密钥未预派生（deriveSecretKeys 未覆盖，属管线缺陷）`);
  }
  return material.key;
}

/** 加密内容包（同步；明文 = JSON { html, toc, images? }，由调用方序列化）。
 *  认证 tag 后置拼接，与 WebCrypto AES-GCM 的密文布局一致。 */
export function encryptBundle(key: string, plaintext: string): LockedContent {
  const material = keyMaterials.get(key);
  if (!material) {
    throw new Error(`[crypto] ${key}: 密钥未预派生（deriveSecretKeys 未覆盖，属管线缺陷）`);
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", material.key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return {
    v: 1,
    ...ARGON2ID_PARAMS,
    salt: material.salt.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

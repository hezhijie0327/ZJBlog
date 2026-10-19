// Build-time encryption (Node-side only; the client bundle never imports this
// file. The matching browser-side decryption lives in src/lib/locked.ts; the
// two interoperate through the LockedContent envelope contract in
// src/lib/types.ts).
//
// Security model: purely static hosting has no server, so real encryption
// happens at build time — for a post marked `secret: <name>`, the plaintext
// of its body HTML + TOC exists only in build memory; AES-256-GCM encryption
// completes before anything is written to disk, and the artifact contains no
// plaintext at all.
//
// Password supply: frontmatter `secret: <name>` → env var BLOG_SECRET_<NAME>
// (name uppercased). Lookup order: process.env → repo-root .env.local → .env
// (.env* are all gitignored). **Missing in CI/production = build failure
// (fail-closed)**; never silently degrade to plaintext. When a local build
// lacks configuration, a temporary password is randomly generated per secret
// name and printed in the build output (different on every build, purely for
// local self-testing; multiple posts with the same name share one). Under CI
// (process.env.CI) nothing is generated and a missing config still fails —
// real passwords are pinned in CF Workers Builds build variables / GitHub
// Secrets.
//
// KDF: Argon2id (OWASP's current first choice for password storage;
// memory-hard, substantially raising the cost of GPU/ASIC offline cracking).
// Parameters are the hardened tier of the OWASP recommendation (64 MiB /
// t=3 / p=1 / 32B output) and are archived with the envelope; the client
// decrypts using the envelope's parameters — parameters can evolve without
// breaking old posts. The salt is unique per post per build (16B random);
// multiple posts sharing a password stay mutually uncorrelated.

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { argon2id } from "hash-wasm";
import type { LockedContent } from "../src/lib/types.ts";

/** Argon2id parameters (hardened version of the OWASP 2023+ recommended tier
 *  19MiB/t=2/p=1). A single client-side derivation takes ~100-300ms — a
 *  natural throttle on wrong-password retries. */
const ARGON2ID_PARAMS = { m: 65536, t: 3, p: 1, len: 32 } as const;

/** secret name → env var name (only safe characters allowed, guarding against injecting an unintended variable name). */
const SECRET_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function envNameForSecret(name: string): string {
  return `BLOG_SECRET_${name.toUpperCase()}`;
}

/** Ephemeral passwords generated within this build (one per name, keeping the
 *  key consistent across same-secret posts and their exclusive images; a new
 *  build regenerates them and the ciphertext is updated accordingly). */
const ephemeralPasswords = new Map<string, string>();

/** 24-char URL-safe random password (base64url, 144 bits of entropy). */
function randomPassword(): string {
  return randomBytes(18).toString("base64url");
}

/** .env file parsing (a dozen lines covering this project's own cases:
 *  KEY=VALUE / # comments / matched quotes), without adding a dotenv
 *  dependency. Returned values are never written back to process.env; they
 *  are only a fallback lookup. */
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

/** name → password. fail-closed: any unmet step throws and terminates the build. */
export function loadSecret(name: string, context: string): string {
  if (!SECRET_NAME_PATTERN.test(name)) {
    throw new Error(`[crypto] ${context}: invalid secret name "${name}" (must match ${SECRET_NAME_PATTERN.source})`);
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
    if (!process.env.CI) {
      // Local exemption: the random password exists only in this build
      // process and is printed for unlock self-testing; the ciphertext is
      // re-encrypted on every build — never treat a local random-password
      // artifact as an official deployment.
      const generated = ephemeralPasswords.get(name) ?? randomPassword();
      ephemeralPasswords.set(name, generated);
      console.log(
        `[crypto] ${context}: secret "${name}" has no password configured — a random ephemeral password was generated for this local build (it changes on every build):`,
      );
      console.log(`[crypto] ┃ unlock password >>> ${generated} <<<`);
      console.log(
        `[crypto] ┃ set a fixed password via ${envName} in .env / .env.local; CI/production MUST configure it or the build fails`,
      );
      return generated;
    }
    throw new Error(
      `[crypto] ${context}: secret "${name}" is marked but no password was found — set the env var ${envName}` +
        ` (or put it in the repo-root .env / .env.local, both gitignored). The build refuses to emit plaintext without a password.`,
    );
  }
  if (password.length < 8) {
    throw new Error(
      `[crypto] ${context}: ${envName} is shorter than 8 chars — refusing to build (password strength is the only line of defense for the ciphertext)`,
    );
  }
  if (password.length < 16) {
    console.warn(
      `[crypto] ${context}: ${envName} should be at least 16 chars (a long password is the only defense against offline brute force)`,
    );
  }
  return password;
}

/** Per-post key material: the salt is generated and frozen at pre-derivation time, then consumed synchronously during encryption. */
interface KeyMaterial {
  key: Buffer;
  salt: Buffer;
}

/** slug → key material. Filled by deriveSecretKeys at module load time. */
const keyMaterials = new Map<string, KeyMaterial>();

export interface SecretRef {
  /** Key namespace: blogs and travels slugs can share a name, so always `<kind>:<slug>` */
  key: string;
  /** Readable location for error messages (e.g. blogs/xxx.md) */
  context: string;
  secretName: string;
}

/** Pre-derive keys (Argon2id is an async API while the content pipeline is
 *  fully synchronous — same pattern as shiki: await the heavy lifting at
 *  module load time, keeping request/build paths synchronous). Each post gets
 *  its own salt; posts sharing a secret name still get distinct keys. */
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

/** Fetch the pre-derived content key (derived assets of the same post, such as images, reuse the same password key). */
export function keyFor(key: string): Buffer {
  const material = keyMaterials.get(key);
  if (!material) {
    throw new Error(`[crypto] ${key}: key not pre-derived (deriveSecretKeys does not cover it — pipeline bug)`);
  }
  return material.key;
}

/** Encrypt a content bundle (synchronous; plaintext = JSON { html, toc,
 *  images? }, serialized by the caller). The auth tag is appended after the
 *  ciphertext, matching WebCrypto AES-GCM's ciphertext layout. */
export function encryptBundle(key: string, plaintext: string): LockedContent {
  const material = keyMaterials.get(key);
  if (!material) {
    throw new Error(`[crypto] ${key}: key not pre-derived (deriveSecretKeys does not cover it — pipeline bug)`);
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

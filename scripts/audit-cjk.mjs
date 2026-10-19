// The CJK audit gate: the site's standing rule is that Chinese lives ONLY
// in the i18n material (src/lib/i18n/ — the wordbooks and the zh-CN baseline
// module). Every other shipped source (client src, build tooling, scripts,
// public assets, config comments, workflows) is English-only, so language
// can never leak into code the locale system does not own. This script
// enforces it inside `pnpm run lint` (part of the lint gate, `pnpm run ci`).
//
// Two character classes, two policies:
//   - Han ideographs (\u3400-\u9fff etc.) are ALWAYS a violation outside
//     the allowlist — comments, strings, JSX text, anything.
//   - CJK punctuation (fullwidth forms U+FF01-U+FF5E such as the fullwidth
//     colon and comma, CJK symbols U+3000-U+303F such as corner brackets)
//     is allowed ONLY on regex/code-context lines — pattern data like a
//     regex character class that contains a fullwidth comma is functional,
//     a hardcoded fullwidth colon in a UI label is not.
//
// Allowlist (deliberate, keep in sync with the rule):
//   - src/lib/i18n/**  — the en/zh-CN wordbooks and the zh-CN baseline
//     module (src/lib/i18n/baseline.ts) are the one sanctioned home of
//     Chinese. Build-time strings that must render zh (code-card copy
//     button, travel map labels) import from there instead of inlining.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import process from "node:process";

const ROOT_ROOT = process.cwd();

// Explicit dot-path / extension-less files the ext filter would otherwise skip.
const EXTRA_FILES = [
  join(ROOT_ROOT, ".env.example"),
  join(ROOT_ROOT, ".github", "workflows", "deploy.yml"),
  join(ROOT_ROOT, "public", "_headers"),
];

const ROOTS = [
  join(ROOT_ROOT, "src"),
  join(ROOT_ROOT, "tools"),
  join(ROOT_ROOT, "scripts"),
  join(ROOT_ROOT, "public"),
  join(ROOT_ROOT, "vite.config.ts"),
  join(ROOT_ROOT, "wrangler.jsonc"),
  ...EXTRA_FILES,
  ...process.argv.slice(2),
];

const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".html", ".svg", ".yml", ".jsonc"]);
// Exact filenames scanned regardless of extension (`.env.example`).
const EXTRA_NAMES = new Set(EXTRA_FILES.map((file) => file.replaceAll(sep, "/")));

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const CJK_PUNCT = /[\u3000-\u303f\uff01-\uff5e\uffe0-\uffef]/;
// a CJK-punctuation carrier that reads as pattern data, not display text
const CODE_CONTEXT =
  /(re\.(compile|split|match|sub|search|fullmatch|findall)|\.split\(|\.matchAll\(|\.match\(|\.exec\(|\.test\(|\.replace\(|new RegExp|=\s*\/|===|!==)/;

/** @param {string} relPath @returns {boolean} */
function isAllowlisted(relPath) {
  return relPath.replaceAll(sep, "/").startsWith("src/lib/i18n/");
}

/** @param {string} path @returns {Generator<string>} */
function* walk(path) {
  const stat = statSync(path);
  if (stat.isFile()) {
    yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) {
      continue;
    }
    yield* walk(join(path, entry));
  }
}

const violations = [];
for (const root of ROOTS) {
  let files;
  try {
    files = [...walk(root)];
  } catch {
    console.error(`audit-cjk: cannot walk ${root}`);
    process.exit(2);
  }
  for (const file of files) {
    const rel = relative(ROOT_ROOT, file);
    if (isAllowlisted(rel)) {
      continue;
    }
    if (!EXTS.has(file.slice(file.lastIndexOf("."))) && !EXTRA_NAMES.has(file.replaceAll(sep, "/"))) {
      continue;
    }
    const lines = readFileSync(file, "utf8").split("\n");
    for (const [i, line] of lines.entries()) {
      if (HAN.test(line)) {
        violations.push({ rel, line: i + 1, text: line.trim(), kind: "Han" });
      } else if (CJK_PUNCT.test(line) && !CODE_CONTEXT.test(line)) {
        violations.push({ rel, line: i + 1, text: line.trim(), kind: "CJK punctuation" });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `audit-cjk: ${violations.length} violation(s) — Chinese lives ONLY in src/lib/i18n/ (the wordbooks and the zh baseline module):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.kind}  ${v.rel}:${v.line}\n    ${v.text.slice(0, 140)}`);
  }
  process.exit(1);
}
console.log("audit-cjk: clean — no CJK outside the i18n material");

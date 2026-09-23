// 构建期图片压缩：仓库 public/images/ 存原始 PNG/JPG，
// vite build 把 public 原样拷进 dist 后，这里对 dist/images 就地压缩
// （限宽 resize + 同格式重编码，仅当结果更小才替换，原图不动）。
// 参考实现：Lab/Web/scripts/compress-images.mjs

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.argv[2] ?? "dist/images";
const MAX_WIDTH = 1920; // 超过则等比缩小，永不放大

if (!statSync(root, { throwIfNoEntry: false })) {
  console.log(`compress-images: ${root} 不存在，跳过`);
  process.exit(0);
}

let before = 0;
let after = 0;
let count = 0;

async function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(p);
      continue;
    }
    if (entry.isSymbolicLink() && statSync(p).isDirectory()) {
      await walk(p);
      continue;
    }
    if (!/\.(jpe?g|png)$/i.test(entry.name)) continue;

    const src = statSync(p).size;
    before += src;
    const img = sharp(p, { failOn: "none" });
    const meta = await img.metadata();
    const out = meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;
    const tmp = `${p}.tmp`;
    if (/\.png$/i.test(entry.name)) {
      await out.png({ quality: 82, compressionLevel: 9, palette: true }).toFile(tmp);
    } else {
      await out.jpeg({ quality: 78, mozjpeg: true }).toFile(tmp);
    }
    const dst = statSync(tmp).size;
    if (dst < src) {
      (await import("node:fs")).renameSync(tmp, p);
      after += dst;
      count += 1;
      const shrunk = meta.width > MAX_WIDTH ? ` (${meta.width}->${MAX_WIDTH}px)` : "";
      console.log(`${p.replace(/\\/g, "/")}: ${(src / 1024) | 0}kB -> ${(dst / 1024) | 0}kB${shrunk}`);
    } else {
      (await import("node:fs")).unlinkSync(tmp);
      after += src;
      console.log(`${p.replace(/\\/g, "/")}: keep (${(src / 1024) | 0}kB)`);
    }
  }
}

await walk(root);
console.log(
  `compress-images: 压缩 ${count} 个文件，${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024 / 1024).toFixed(2)}MB（省 ${((before - after) / 1024).toFixed(0)}kB）`,
);

// 构建期图片管线：仓库 public/images/ 存原始 PNG/JPG，
// 最终产物一律为 webp（对齐 Lab/Web 的 Astro 图片管线）。
// 在 prerender 之后执行：
//   1) dist/images 内 jpg/png → 同名 .webp（限宽 1920、q80、永不放大），原文件删除
//   2) dist 根级联系资产（ROOT_ASSETS 白名单，DESIGN.md §2.4 放 public/ 根）同样转换
//   3) 扫描 dist 下 .html/.xml/.txt，把已转换文件的引用改写为 .webp
// 正文里始终引用原始扩展名（/images/x.jpg、/avatar.jpg），dev 直接服务原图；
// 仓库里的原图永不改动，压缩只发生在构建产物上。
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import sharp from "sharp";

const dist = process.argv[2] ?? "dist";
const imagesDir = join(dist, "images");
const MAX_WIDTH = 1920; // 超过则等比缩小，永不放大

/** dist 根级联系资产白名单（原图不进 images/，构建期在此转 webp）。
 *  maxWidth 按显示位设置，原图永不改动；favicon / apple-touch / og-default
 *  必须保持 png（平台兼容），收款二维码体积已小，均不入列。 */
const ROOT_ASSETS = [{ file: "avatar.jpg", maxWidth: 512 }]; // 头像显示位 176px，512 ≈ 3x

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

/** jpg/png → webp（限宽、q80、永不放大），删除产物中的原文件并登记引用改写。 */
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

if (statSync(imagesDir, { throwIfNoEntry: false })) {
  for (const p of walk(imagesDir, /\.(jpe?g|png)$/i)) {
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
for (const p of walk(dist, /\.(html|xml|txt)$/i)) {
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
  `compress-images: ${count} 张图转 webp（${(srcBytes / 1024).toFixed(0)}kB -> ${(webpBytes / 1024).toFixed(0)}kB），引用改写 ${files} 个文件`,
);

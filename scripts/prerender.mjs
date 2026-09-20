// 预渲染入口：vite build --ssr 的产物（.vite-ssr/ssr.mjs）在此被消费，
// 把每条路由写成完整 HTML 并生成静态资源文件。

import { prerenderAll } from "../.vite-ssr/ssr.mjs";

try {
  await prerenderAll();
  console.log("prerender complete");
} catch (error) {
  console.error(error);
  process.exit(1);
}

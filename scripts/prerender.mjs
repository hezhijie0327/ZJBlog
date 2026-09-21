// 预渲染入口：消费 vite build --ssr 的产物（.vite-ssr/ssr.mjs），
// 把每条路由写成完整 HTML 并生成静态资源文件。

// 构建产物不在类型检查范围内：用变量动态导入，TS 不解析该路径
// （.vite-ssr/ 由 vite build --ssr 在本脚本运行前生成）
const ssrModulePath = new URL("../.vite-ssr/ssr.mjs", import.meta.url).href;

try {
  const { prerenderAll } = await import(ssrModulePath);
  await prerenderAll();
  console.log("prerender complete");
} catch (error) {
  console.error(error);
  process.exit(1);
}

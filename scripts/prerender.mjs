// Prerender entry: consumes the output of vite build --ssr (.vite-ssr/ssr.mjs),
// writes every route as full HTML and generates the static asset files.

// Build artifacts are outside type checking: import dynamically via a
// variable so TS does not resolve the path
// (.vite-ssr/ is produced by vite build --ssr before this script runs)
const ssrModulePath = new URL("../.vite-ssr/ssr.mjs", import.meta.url).href;

try {
  const { prerenderAll } = await import(ssrModulePath);
  await prerenderAll();
  console.log("prerender complete");
} catch (error) {
  console.error(error);
  process.exit(1);
}

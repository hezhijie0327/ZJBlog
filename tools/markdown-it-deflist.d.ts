// markdown-it-deflist 无官方类型：最小声明（插件函数，md.use 直挂）
declare module "markdown-it-deflist" {
  const deflist: (md: unknown) => void;
  export default deflist;
}

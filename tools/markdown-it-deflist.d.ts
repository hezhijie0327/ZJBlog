// markdown-it-deflist has no official types: minimal declaration (a plugin
// function, mounted directly via md.use)
declare module "markdown-it-deflist" {
  const deflist: (md: unknown) => void;
  export default deflist;
}

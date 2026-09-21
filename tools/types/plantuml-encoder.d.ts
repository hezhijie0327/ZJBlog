// plantuml-encoder 无内置类型；经 tsconfig paths 重定向（仅类型层）。
declare module "plantuml-encoder" {
  const encoder: {
    encode: (plain: string) => string;
    decode: (encoded: string) => string;
  };
  export default encoder;
}

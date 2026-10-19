// plantuml-encoder has no built-in types; redirected via tsconfig paths
// (types only).
declare module "plantuml-encoder" {
  const encoder: {
    encode: (plain: string) => string;
    decode: (encoded: string) => string;
  };
  export default encoder;
}

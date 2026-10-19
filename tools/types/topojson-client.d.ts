// topojson-client has no built-in types; redirected via tsconfig paths
// (types only).
declare module "topojson-client" {
  export function feature(topology: unknown, object: unknown, filter?: unknown): unknown;
}

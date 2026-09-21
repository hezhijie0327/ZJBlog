// topojson-client 无内置类型；经 tsconfig paths 重定向（仅类型层）。
declare module "topojson-client" {
  export function feature(topology: unknown, object: unknown, filter?: unknown): unknown;
}

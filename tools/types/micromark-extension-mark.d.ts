// micromark-extension-mark@1.0.2 has no type declarations (plain js);
// redirected via tsconfig paths as above. pandocMark is a factory returning a
// micromark Extension (consumed as unknown here: injected into
// data.micromarkExtensions and composed by micromark itself).
declare function pandocMark(options?: unknown): unknown;

export { pandocMark };

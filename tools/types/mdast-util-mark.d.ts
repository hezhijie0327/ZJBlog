// mdast-util-mark@1.0.0 ships uncompiled .ts as its entry point — tsc follows
// the import, typechecks the third-party source and errors under
// verbatimModuleSyntax. tsconfig paths redirects to this shim (types only;
// at runtime vite still resolves the real package).
declare module "mdast-util-mark" {
  type Extension = {
    canContainEols?: string[];
    enter: Record<string, (this: unknown, token: unknown) => unknown>;
    exit: Record<string, (this: unknown, token: unknown) => unknown>;
  };
  export const pandocMarkFromMarkdown: Extension;
}

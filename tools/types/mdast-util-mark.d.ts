// mdast-util-mark@1.0.0 直接以未编译 .ts 为入口发布 —— tsc 顺着 import 会
// 检查第三方源码并因 verbatimModuleSyntax 报错。经 tsconfig paths 重定向到
// 本 shim（仅类型层；运行时 vite 仍解析真实包）。
declare const pandocMarkFromMarkdown: unknown;

export { pandocMarkFromMarkdown };

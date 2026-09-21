// Obsidian 风格 Callouts（超集覆盖 GitHub alerts 的五种类型）：
//   > [!note] 自定义标题（同行文字即标题，可省略，缺省用类型名）
//   > [!success]- 默认折叠 / > [!tip]+ 默认展开（折叠语法）
// 已识别的别名归一到十个配色类别，未识别的 [!x] 保持原引用块不动。
// 输出：div.callout.callout-<category>（fold 时为 details/summary），
// 配色由 prose.css 按 category 类映射到站点 token。

import type { Blockquote } from "mdast";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

type Json = Record<string, unknown>;

/** Obsidian 全部内置别名 → 配色类别 */
const CALLOUT_CATEGORY: Record<string, string> = {
  note: "note",
  info: "info",
  todo: "todo",
  abstract: "success",
  summary: "success",
  tldr: "success",
  tip: "tip",
  hint: "tip",
  important: "tip",
  success: "success",
  check: "success",
  done: "success",
  question: "question",
  help: "question",
  faq: "question",
  warning: "warning",
  caution: "warning",
  attention: "warning",
  failure: "danger",
  fail: "danger",
  missing: "danger",
  danger: "danger",
  error: "danger",
  bug: "danger",
  example: "example",
  quote: "quote",
  cite: "quote",
};

export function remarkCallouts() {
  return (tree: Node) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const mutable = node as unknown as Json;
      const children = (mutable.children as Json[] | undefined) ?? [];
      const first = children[0];
      const firstChild = (first?.children as Json[] | undefined)?.[0] as Json | undefined;
      if (first?.type !== "paragraph" || firstChild?.type !== "text") {
        return;
      }
      const value = typeof firstChild.value === "string" ? firstChild.value : "";
      const match = value.match(/^\[!([\w-]+)\]([+-])?\s*(.*)/);
      if (!match) {
        return;
      }
      const alias = (match[1] ?? "").toLowerCase();
      const category = CALLOUT_CATEGORY[alias];
      if (!category) {
        return;
      }
      const fold = match[2]; // '-' 默认收起，'+' 默认展开，无则不可折叠
      const customTitle = (match[3] ?? "").trim();
      const title = customTitle || alias.charAt(0).toUpperCase() + alias.slice(1);

      const titleNode: Json = {
        type: "paragraph",
        data: {
          hName: fold ? "summary" : "p",
          hProperties: { className: ["callout-title"] },
        },
        children: [{ type: "text", value: title }],
      };

      // 标记被剥掉后，首段若还残留内联子节点（罕见），保留为正文段
      const body: Json[] = [];
      if (first.children && (first.children as Json[]).length > 1) {
        body.push({ type: "paragraph", children: (first.children as Json[]).slice(1) });
      }
      body.push(...children.slice(1));

      mutable.data = {
        hName: fold ? "details" : "div",
        hProperties: {
          className: ["callout", `callout-${category}`],
          ...(fold ? { open: fold === "+" } : {}),
        },
      };
      mutable.children = [titleNode, ...body];
    });
  };
}

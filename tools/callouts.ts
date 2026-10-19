// Obsidian-style Callouts (a superset covering the five GitHub alerts types):
//   > [!note] Custom title (text on the same line is the title; optional,
//   defaults to the type name)
//   > [!success]- collapsed by default / > [!tip]+ expanded by default (fold
//   syntax)
// Recognized aliases normalize into ten color categories; an unrecognized
// [!x] leaves the quote block untouched.
// Output: div.callout.callout-<category> (details/summary when folded);
// colors are mapped to site tokens by prose.css per category class.

import type { Blockquote } from "mdast";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

type Json = Record<string, unknown>;

/** All built-in Obsidian aliases → color category */
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
      const fold = match[2]; // '-' collapsed by default, '+' expanded, none = not foldable
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

      // After the marker is stripped, if the first paragraph still has inline
      // children left (rare), keep them as a body paragraph
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

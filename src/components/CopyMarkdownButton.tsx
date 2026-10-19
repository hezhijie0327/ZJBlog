// "Copy as Markdown" button: fetches the prerendered index.md of the same
// name (written to disk alongside the detail page at build time, original
// frontmatter + body 100% faithful) and writes it to the clipboard. Locked
// posts get no file on disk and this button is not rendered (fail-closed).
// Hidden on the print/preview paper (styles/print.css).

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { ICON_BTN } from "@/lib/styles.ts";

export function CopyMarkdownButton({ href }: { href: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const onClick = () => {
    fetch(href)
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${href} ${resp.status}`);
        }
        return resp.text();
      })
      .then((text) => navigator.clipboard.writeText(text))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };

  return (
    <button
      aria-label={t("post.copyMarkdown")}
      className={cn(ICON_BTN, "print-hide")}
      disabled={copied}
      onClick={onClick}
      title={t("post.copyMarkdown")}
      type="button"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
    </button>
  );
}

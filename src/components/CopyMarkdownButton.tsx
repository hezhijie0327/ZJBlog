// 「复制为 Markdown」按钮：抓取预渲染的同名 index.md（构建期随详情页落
// 盘，原始 frontmatter + 正文 100% 保真）写入剪贴板。锁定文不落盘也不
// 渲染本按钮（fail-closed）。打印/预览纸面上隐藏（styles/print.css）。

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

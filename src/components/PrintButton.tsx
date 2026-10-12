// 「打印 / 存为 PDF」按钮：走 lib/print.ts 的预览管线（纸面先可见，
// webview 里 print no-op 也有反应），文件名 = zjblog_<title>。
// 打印/预览纸面上隐藏（styles/print.css）。

import { Printer } from "lucide-react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { startPrintPreview } from "@/lib/print.ts";
import { ICON_BTN } from "@/lib/styles.ts";

export function PrintButton({ titleBase }: { titleBase: string }) {
  const t = useT();

  return (
    <button
      aria-label={t("post.print")}
      className={cn(ICON_BTN, "print-hide")}
      onClick={() => {
        // hint + 关闭芯片 = ZJSearch 打印预览同款（webview 里 print 静默
        // no-op，纸面即终态，提示用浏览器菜单输出）
        startPrintPreview({
          closeLabel: t("print.close"),
          hint: t("print.hint"),
          titleBase,
          wordmark: true,
        });
      }}
      title={t("post.print")}
      type="button"
    >
      <Printer aria-hidden="true" className="size-4" />
    </button>
  );
}

// "Print / Save as PDF" button: goes through the lib/print.ts preview pipeline
// (the paper becomes visible first, so even a no-op print in a webview gives
// feedback), filename = zjblog_<title>.
// Hidden on the print/preview paper (styles/print.css).

import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { startPrintPreview } from "@/lib/print.ts";
import { ICON_BTN } from "@/lib/styles.ts";

export function PrintButton({
  titleBase,
  wordmark = true,
}: {
  titleBase: string;
  /** Not injected on deck pages (slides carry their own branding and a
      fixed-height page cannot fit an insertion -- same convention as
      print.ts) */
  wordmark?: boolean;
}) {
  const t = useT();
  // Honor the startPrintPreview teardown contract: SPA navigation while the
  // preview face is open would otherwise carry print state to the next page
  const teardownRef = useRef<(() => void) | null>(null);
  useEffect(() => () => teardownRef.current?.(), []);

  return (
    <button
      aria-label={t("post.print")}
      className={cn(ICON_BTN, "print-hide")}
      onClick={() => {
        // hint + close chip = same as the ZJSearch print preview (in a webview
        // print is a silent no-op, the paper is the final state, and the hint
        // tells users to output via the browser menu)
        teardownRef.current?.();
        teardownRef.current = startPrintPreview({
          closeLabel: t("print.close"),
          hint: t("print.hint"),
          titleBase,
          wordmark,
        });
      }}
      title={t("post.print")}
      type="button"
    >
      <Printer aria-hidden="true" className="size-4" />
    </button>
  );
}

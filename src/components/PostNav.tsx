// 上一篇 / 下一篇导航（构建期算好的相邻链接，边界隐藏）。

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD } from "@/lib/styles.ts";
import type { PostNavLink } from "@/lib/types.ts";

export function PostNav({ prev, next }: { prev?: PostNavLink; next?: PostNavLink }) {
  const t = useT();
  if (!prev && !next) {
    return null;
  }

  const cardClass = cn(CARD, "p-4 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-pop");

  return (
    <nav
      aria-label={t("post.storynav")}
      className="mt-12 grid grid-cols-1 gap-3 border-t border-line pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link className={cn(cardClass, "group")} href={`/blogs/${prev.slug}/`}>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
            <ArrowLeft aria-hidden="true" className="size-3" />
            {t("post.prev")}
          </span>
          <span className="mt-1.5 block truncate text-sm font-medium text-ink transition-colors group-hover:text-accent">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className={cn(cardClass, "group text-right")} href={`/blogs/${next.slug}/`}>
          <span className="flex items-center justify-end gap-1.5 font-mono text-[11px] text-ink-3">
            {t("post.next")}
            <ArrowRight aria-hidden="true" className="size-3" />
          </span>
          <span className="mt-1.5 block truncate text-sm font-medium text-ink transition-colors group-hover:text-accent">
            {next.title}
          </span>
        </Link>
      )}
    </nav>
  );
}

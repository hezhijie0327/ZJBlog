// 404 页：预渲染为 /404.html（wrangler not_found_handling），客户端兜底同样渲染。
// 构成与空状态同构（DESIGN.md §9），bare 变体承载整页居中布局。

import { Compass } from "lucide-react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { Link } from "@/components/Shell.tsx";
import { useT } from "@/lib/i18n.ts";

export function NotFoundPage() {
  const t = useT();
  return (
    <EmptyState
      action={
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-[13px] font-medium text-accent-contrast transition-colors hover:bg-accent-strong-hover"
          href="/"
        >
          {t("notFound.back")}
        </Link>
      }
      bare
      className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-24 animate-fade-up"
      desc={t("notFound.blurb")}
      heading="h1"
      icon={<Compass className="size-7" />}
      title="404"
    />
  );
}

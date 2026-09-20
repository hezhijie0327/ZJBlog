// 404 页：预渲染为 /404.html（wrangler not_found_handling），客户端兜底同样渲染。

import { Compass } from "lucide-react";
import { Link } from "@/components/Shell.tsx";
import { useT } from "@/lib/i18n.ts";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-24 text-center animate-fade-up">
      {/* 与空状态同款构成：图标圆盘 + 标题 + 灰字说明 + 一个胶囊动作 */}
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
        <Compass className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">404</h1>
      <p className="mt-1.5 text-sm text-ink-2">{t("notFound.blurb")}</p>
      <Link
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-[13px] font-medium text-accent-contrast transition-colors hover:bg-accent-strong-hover"
        href="/"
      >
        {t("notFound.back")}
      </Link>
    </div>
  );
}

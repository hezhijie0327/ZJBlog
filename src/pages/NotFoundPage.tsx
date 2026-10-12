// 404 页：预渲染为 /404.html（wrangler not_found_handling），客户端兜底同样渲染。
// 告示纸形态（DESIGN.md §7，ZJSearch 线程未找到同款语言）：撕边便签 + 两角
// 胶带 + 撕边纸条动作（PAPER_STRIP 家族契约——空状态唯一动作）；内容构成仍走
// EmptyState（§9「404 与空状态同构」），bare 变体落在 paper-note 纸面上。

import { Compass } from "lucide-react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { Link } from "@/components/Shell.tsx";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { PAPER_STRIP } from "@/lib/styles.ts";

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="mx-auto flex w-full flex-1 flex-col items-center justify-center px-4 pb-24 pt-24 animate-fade-up">
      {/* 微倾斜钉在墙上；胶带挂在不倾斜的外层（§7：胶带必须是被裁剪元素的
          兄弟节点，放进 paper-note 内会被撕边裁掉角） */}
      <div className="relative w-full max-w-xl rotate-[0.6deg]">
        <Tape className="-top-3 left-10 w-24 -rotate-3 bg-accent-soft/80" />
        <Tape className="-top-3 right-10 w-20 rotate-[4deg] bg-accent-soft/60" />
        <EmptyState
          action={
            <Link
              className={cn(
                PAPER_STRIP,
                "-rotate-1 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
              )}
              href="/"
            >
              {t("notFound.back")}
            </Link>
          }
          bare
          className="paper-note px-6 py-14 sm:px-10"
          desc={t("notFound.blurb")}
          heading="h1"
          icon={<Compass className="size-7" />}
          title="404"
        />
      </div>
    </div>
  );
}

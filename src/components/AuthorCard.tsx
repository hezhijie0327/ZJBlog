// 文末署名卡：信件落款语言（DESIGN.md §7，与锁屏封缄信同叙事）——素面撕边
// 纸 + 单胶带压角 + CC 协议小邮戳。戳文与正文内许可链接重复，退为装饰层
// （§7：邮戳是唯一承载真实信息的纸感件，前提是信息没有其他正身）。
// 打印不进纸面：print.ts 注入的 .print-wordmark 是打印件署名，避免双落款。

import { Tape } from "@/components/Tape.tsx";
import { useT } from "@/lib/i18n.ts";

export function AuthorCard() {
  const t = useT();
  const author = t("site.author");
  return (
    <div className="print-hide relative mt-12 rotate-[0.35deg]">
      {/* 单胶带压角（§7：胶带必须是被裁剪元素的兄弟节点，进纸内会被撕边裁掉） */}
      <Tape corner="end" seed={author} className="w-20 bg-accent-soft/60" />
      <div className="paper-note paper-note--blank flex items-center gap-4 p-5">
        <img
          alt={author}
          className="size-12 shrink-0 rounded-full object-cover ring-1 ring-line"
          height={48}
          loading="lazy"
          src="/avatar.jpg"
          width={48}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{t("post.authorBy", { author })}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            <a
              className="transition-colors hover:text-accent"
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
              rel="noopener noreferrer"
              target="_blank"
            >
              CC BY-NC-SA 4.0
            </a>{" "}
            · {t("post.licenseNote")}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="paper-postmark pointer-events-none hidden size-16 shrink-0 rotate-12 text-ink-3 sm:grid"
        >
          <span className="font-mono text-xs font-semibold">CC</span>
          {/* 负右距抵消 tracking 尾隙，戳文光学居中（LockScreen 同手法） */}
          <span className="-mr-[0.18em] font-mono text-[7px] leading-none tracking-[0.18em]">BY-NC-SA</span>
        </div>
      </div>
    </div>
  );
}

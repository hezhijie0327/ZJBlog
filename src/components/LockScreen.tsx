// 锁屏：上了锁的信（DESIGN.md §7 纸感语言）——撕边信笺 .paper-note 微
// 倾斜，胶带两角对压（必须是 clip-path 元素的兄弟节点），右下角一枚
// 「SEALED」圆邮戳。口令表单在 Argon2id 派生（约百毫秒级）期间转 pending
// 态；GCM 认证失败 = 口令错误，就地提示不清空已输入内容。
// 博文与旅行详情页共用；unlockKey 是解锁缓存的命名空间键（blogs 与
// travels 的 slug 可能同名）。

import { Lock } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Tape } from "@/components/Tape.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { UnlockError, type UnlockedBundle, unlockPost } from "@/lib/locked.ts";
import { EYEBROW, PAPER_STRIP } from "@/lib/styles.ts";
import type { LockedContent } from "@/lib/types.ts";

export function LockScreen({
  locked,
  onUnlock,
  slug,
  unlockKey,
}: {
  locked: LockedContent;
  onUnlock: (bundle: UnlockedBundle) => void;
  slug: string;
  /** 解锁缓存命名空间键（如 travel:<slug>）；缺省用 slug */
  unlockKey?: string;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 锁屏页的主操作就是输口令：挂载后聚焦输入框（与 CommandPalette 打开
  // 时聚焦同一模式；不使用 autoFocus 属性，过 a11y noAutofocus 门禁）
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || password === "") {
      return;
    }
    setPending(true);
    setFailed(false);
    let bundle: UnlockedBundle;
    try {
      bundle = await unlockPost(unlockKey ?? slug, locked, password);
    } catch (error) {
      if (!(error instanceof UnlockError)) {
        throw error;
      }
      setFailed(true);
      setPending(false);
      return;
    }
    onUnlock(bundle);
  }

  return (
    <div className="relative mx-auto mt-2 max-w-lg rotate-[0.45deg]">
      {/* 胶带两角对压，压在撕边纸沿上（§7：胶带是被裁元素的兄弟节点） */}
      <Tape className="-top-3 left-8 w-24 -rotate-6 bg-accent-soft/80" />
      <Tape className="-top-2 right-8 w-20 rotate-[5deg] bg-accent-soft/60" />

      {/* 圆形邮戳（纯装饰）：右下角盖在信纸上，窄屏收起避让文字 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 right-6 z-10 hidden size-20 rotate-12 place-items-center rounded-full border border-dashed border-ink-3/60 sm:grid"
      >
        <div className="grid size-[3.75rem] place-items-center gap-0.5 rounded-full border border-ink-3/50">
          <Lock className="size-4 text-ink-3" />
          <span className="font-mono text-[8px] tracking-[0.22em] text-ink-3">SEALED</span>
        </div>
      </div>

      <div className="paper-note px-7 pb-10 pt-12 sm:px-10">
        <p className={EYEBROW}>{t("lock.eyebrow")}</p>
        <h2 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-ink">{t("lock.title")}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">{t("lock.desc")}</p>

        <form className="mt-7 max-w-sm" onSubmit={handleSubmit}>
          <label className={cn(EYEBROW, "block")} htmlFor="lock-password">
            {t("lock.label")}
          </label>
          <input
            aria-describedby={failed ? "lock-error" : undefined}
            aria-invalid={failed || undefined}
            autoComplete="off"
            className={cn(
              "mt-2 h-10 w-full border-b bg-transparent font-mono text-sm tracking-[0.2em] text-ink outline-none transition-colors placeholder:text-ink-3",
              failed ? "border-danger" : "border-line focus-visible:border-accent",
            )}
            disabled={pending}
            id="lock-password"
            onChange={(event) => {
              setPassword(event.target.value);
              setFailed(false);
            }}
            placeholder={t("lock.placeholder")}
            ref={inputRef}
            type="password"
            value={password}
          />
          <button
            className={cn(
              PAPER_STRIP,
              "-rotate-1 mt-6 px-6 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
            disabled={pending || password === ""}
            type="submit"
          >
            {pending ? t("lock.pending") : t("lock.submit")}
          </button>
          {failed && (
            <p className="mt-4 text-sm text-danger" id="lock-error" role="alert">
              {t("lock.wrong")}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

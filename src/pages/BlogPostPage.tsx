// 文章详情页：头部元信息 + 摘要卡 + 构建期编译的正文 + 目录右栏（xl 宽屏）
// + 上下篇导航 + 署名卡 + giscus 评论区。加密博文（post.locked 有值）以锁屏
// 替代正文：正文/目录/摘要/评论都属加密内容，解锁前一律不渲染。

import { Clock, Lock } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthorCard } from "@/components/AuthorCard.tsx";
import { BackLink } from "@/components/BackLink.tsx";
import { PostNav } from "@/components/PostNav.tsx";
import { TableOfContents } from "@/components/TableOfContents.tsx";
import { TagList } from "@/components/TagList.tsx";
import { Tape } from "@/components/Tape.tsx";
import { GiscusComments } from "@/features/comments/GiscusComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { getCachedUnlock, UnlockError, type UnlockedBundle, unlockPost } from "@/lib/locked.ts";
import { CHIP, EYEBROW, PAPER_STRIP, SECTION_DETAIL } from "@/lib/styles.ts";
import type { BlogPostData, LockedContent } from "@/lib/types.ts";

export function BlogPostPage({ data }: { data: BlogPostData }) {
  const t = useT();
  const { post } = data;
  // 解锁态从会话缓存初始化：首载/刷新时缓存必空（与 SSR 渲染一致，水合
  // 安全）；SPA 内从别页跳回时直接还原明文，不重复索要密码
  const [unlocked, setUnlocked] = useState<UnlockedBundle | null>(() =>
    post.locked ? (getCachedUnlock(post.slug) ?? null) : null,
  );
  const html = unlocked?.html ?? post.contentHtml ?? "";
  const toc = unlocked?.toc ?? post.toc;

  return (
    <div className={SECTION_DETAIL}>
      <div className="mx-auto flex max-w-6xl justify-center gap-10">
        <article className="min-w-0 max-w-3xl flex-1">
          {/* 返回链接 */}
          <BackLink href="/blogs/" label={t("blog.back")} />

          {/* 文章头部：日期 · 阅读时长 · 分类一行，tags 与分类去重 */}
          <header className="mb-10 mt-8 border-b border-line pb-8">
            <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
              {post.date && <time dateTime={post.date}>{formatDateISO(post.date)}</time>}
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3" />
                {t("meta.readingTime", { n: post.readingMinutes })}
              </span>
              {post.category && <span className={CHIP}>{post.category}</span>}
            </div>
            <TagList className="mt-4" exclude={post.category} linkTags tags={post.tags} />
          </header>

          {post.locked && !unlocked ? (
            /* 锁定文：锁屏即正文位。摘要/目录/评论同属内容，一并隐去 */
            <LockScreen locked={post.locked} onUnlock={setUnlocked} slug={post.slug} />
          ) : (
            <>
              {/* 手写摘要卡（frontmatter.summary，可选） */}
              {post.summary && (
                <div className="mb-8 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">✨ {t("post.summary")}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{post.summary}</p>
                </div>
              )}

              {/* 正文（加密文 = 解锁后的明文；普通文 = payload 注入） */}
              <Prose html={html} needsKatex={post.needsKatex} />

              {/* 上一篇 / 下一篇 */}
              <PostNav next={post.next} prev={post.prev} />

              {/* 署名卡 */}
              <AuthorCard />

              {/* giscus 评论（GitHub Discussions，按路径映射）；锁定文解锁后再挂载 */}
              <GiscusComments />
            </>
          )}
        </article>

        {/* 目录右栏：宽屏 sticky 跟随；锁定文目录随正文解密后才可用 */}
        {(unlocked || !post.locked) && (
          <aside className="hidden w-60 shrink-0 xl:block">
            <TableOfContents items={toc} />
          </aside>
        )}
      </div>
    </div>
  );
}

/** 锁屏：上了锁的信（DESIGN.md §7 纸感语言）——撕边信笺 .paper-note 微
 *  倾斜，胶带两角对压（必须是 clip-path 元素的兄弟节点），右下角一枚
 *  「SEALED」圆邮戳。口令表单在 Argon2id 派生（约百毫秒级）期间转 pending
 *  态；GCM 认证失败 = 口令错误，就地提示不清空已输入内容。 */
function LockScreen({
  locked,
  onUnlock,
  slug,
}: {
  locked: LockedContent;
  onUnlock: (bundle: UnlockedBundle) => void;
  slug: string;
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
      bundle = await unlockPost(slug, locked, password);
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

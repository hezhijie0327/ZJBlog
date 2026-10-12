// 文章详情页：头部元信息 + 摘要卡 + 构建期编译的正文 + 目录右栏（xl 宽屏）
// + 上下篇导航 + 署名卡 + giscus 评论区。加密博文（post.locked 有值）以锁屏
// 替代正文：正文/目录/摘要/评论都属加密内容，解锁前一律不渲染。

import { Clock } from "lucide-react";
import { useState } from "react";
import { AuthorCard } from "@/components/AuthorCard.tsx";
import { BackLink } from "@/components/BackLink.tsx";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton.tsx";
import { LockScreen } from "@/components/LockScreen.tsx";
import { PostNav } from "@/components/PostNav.tsx";
import { PrintButton } from "@/components/PrintButton.tsx";
import { TableOfContents } from "@/components/TableOfContents.tsx";
import { TagList } from "@/components/TagList.tsx";
import { Tape } from "@/components/Tape.tsx";
import { GiscusComments } from "@/features/comments/GiscusComments.tsx";
import { DeckViewer } from "@/features/deck/DeckViewer.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { getCachedUnlock, type UnlockedBundle } from "@/lib/locked.ts";
import { CHIP, SECTION_DETAIL } from "@/lib/styles.ts";
import type { BlogPostData } from "@/lib/types.ts";

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
      {/* 返回链接 */}
      <BackLink href="/blogs/" label={t("blog.back")} />

      {/* 文章头部：日期 · 阅读时长 · 分类一行，tags 与分类去重。
          页头直接置于 SECTION_DETAIL 容器下：全站标题同一左缘（DESIGN.md §6） */}
      <header className="mb-10 mt-8 border-b border-line pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          {/* 导出动作组（icon-only，DESIGN §5.3）；锁定文不提供任何导出 */}
          {!post.locked && (
            <div className="flex shrink-0 items-center gap-1 pt-1 print-hide">
              <CopyMarkdownButton href={`/blogs/${encodeURIComponent(post.slug)}/index.md`} />
              <PrintButton titleBase={post.title} />
            </div>
          )}
        </div>
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

      <div className="mx-auto flex max-w-6xl justify-center gap-10">
        {/* 幻灯片正文列放宽：16:9 画布在 3xl 里太小 */}
        <article className={cn("min-w-0 flex-1", post.deck ? "max-w-5xl" : "max-w-3xl")}>
          {post.locked && !unlocked ? (
            /* 锁定文：锁屏即正文位。摘要/目录/评论同属内容，一并隐去 */
            <LockScreen locked={post.locked} onUnlock={setUnlocked} slug={post.slug} />
          ) : (
            <>
              {/* 手写摘要卡（frontmatter.summary，可选）：文头便签语言（§7）——
                  撕边纸 + 顶部单胶带 + 确定性微倾，纯阅读面不抢交互位 */}
              {post.summary && (
                <div className="relative mb-8 rotate-[0.35deg]">
                  <Tape className="-top-3 left-8 w-20 -rotate-3 bg-accent-soft/80" />
                  <div className="paper-note px-5 py-4">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-2">✨ {t("post.summary")}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink">{post.summary}</p>
                  </div>
                </div>
              )}

              {/* 正文（加密文 = 解锁后的明文；普通文 = payload 注入）。
                  整篇幻灯片（frontmatter deck: true）由播放器替代 Prose：
                  首帧全量堆叠进 DOM（无 JS 可读），挂载后升级逐页播放 */}
              {post.deck ? (
                <DeckViewer css={post.deck.css} html={html} needsKatex={post.needsKatex} titleBase={post.title} />
              ) : (
                <Prose html={html} needsKatex={post.needsKatex} />
              )}

              {/* 署名卡（信件落款）在翻页导航之前：落款属于本文，PostNav 是
                  走向下一篇的门（nav 自带 mt-12 + 分隔线承接节奏） */}
              <AuthorCard />

              {/* 上一篇 / 下一篇 */}
              <PostNav next={post.next} prev={post.prev} />

              {/* giscus 评论（GitHub Discussions，按路径映射）；锁定文解锁后再挂载 */}
              <GiscusComments />
            </>
          )}
        </article>

        {/* 目录右栏：宽屏 sticky 跟随；锁定文目录随正文解密后才可用。
            整篇幻灯片无目录（toc 恒空），不渲染右栏 */}
        {(unlocked || !post.locked) && !post.deck && (
          <aside className="hidden w-60 shrink-0 xl:block">
            <TableOfContents items={toc} />
          </aside>
        )}
      </div>
    </div>
  );
}

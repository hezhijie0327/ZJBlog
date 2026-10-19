// Blog post detail page: header meta + summary card + build-time-compiled body + TOC right rail
// (xl+ screens) + prev/next navigation + author card + giscus comments. Encrypted posts
// (post.locked set) replace the body with a lock screen: body/TOC/summary/comments are all
// encrypted content, none rendered until unlocked.

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
  // Initialize unlocked state from the session cache: on first load/refresh the cache is always
  // empty (consistent with SSR rendering, hydration-safe); navigating back from another page
  // within the SPA restores the plaintext directly without re-asking for the password
  const [unlocked, setUnlocked] = useState<UnlockedBundle | null>(() =>
    post.locked ? (getCachedUnlock(post.slug) ?? null) : null,
  );
  const html = unlocked?.html ?? post.contentHtml ?? "";
  const toc = unlocked?.toc ?? post.toc;

  return (
    // deck-page: print marker for a full deck (print.css trims page-header/container padding
    // based on it) — cannot key off .deck-root: embedded marp fences also produce .deck-root
    // once mounted, which would wrongly strip regular posts' headers too (title lost in print)
    <div className={cn(SECTION_DETAIL, post.deck && "deck-page")}>
      {/* Back link */}
      <BackLink href="/blogs/" label={t("blog.back")} />

      {/* Post header: date · reading time · category on one line, tags deduped against category.
          The header sits directly under the SECTION_DETAIL container: site-wide titles share one
          left edge (DESIGN.md §6) */}
      <header className="mb-10 mt-8 border-b border-line pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          {/* Export action group (icon-only, DESIGN §5.3); locked posts offer no exports */}
          {!post.locked && (
            <div className="flex shrink-0 items-center gap-1 pt-1 print-hide">
              <CopyMarkdownButton href={`/blogs/${encodeURIComponent(post.slug)}/index.md`} />
              <PrintButton titleBase={post.title} wordmark={!post.deck} />
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

      {/* No shell max-width for decks: slides scale with the container width (in print, under
          @page 1280×720 the container is exactly full-width and zoom=1 fills the page 1:1 —
          a cap would shrink the slides and leave an empty band at the page bottom) */}
      <div className={cn("mx-auto flex justify-center gap-10", !post.deck && "max-w-6xl")}>
        <article className={cn("min-w-0 flex-1", !post.deck && "max-w-3xl")}>
          {post.locked && !unlocked ? (
            /* Locked post: the lock screen takes the body slot. Summary/TOC/comments are content
               too and hidden along with it */
            <LockScreen locked={post.locked} onUnlock={setUnlocked} slug={post.slug} />
          ) : (
            <>
              {/* Handwritten summary card (frontmatter.summary, optional): header note styling
                  (§7) — torn-edge paper + single top tape + deterministic slight tilt, purely
                  for reading, never competing for interaction */}
              {post.summary && (
                <div className="relative mb-8 rotate-[0.35deg]">
                  <Tape className="w-20 bg-accent-soft/80" seed={post.slug} />
                  <div className="paper-note px-5 py-4">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-2">✨ {t("post.summary")}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink">{post.summary}</p>
                  </div>
                </div>
              )}

              {/* Body (encrypted post = plaintext after unlock; regular post = payload injection).
                  Full decks (frontmatter deck: true) swap Prose for the player: the full slide
                  stack renders into the DOM on the first frame (readable without JS), then
                  upgrades to page-by-page playback once mounted */}
              {post.deck ? (
                <DeckViewer css={post.deck.css} html={html} needsKatex={post.needsKatex} titleBase={post.title} />
              ) : (
                <Prose html={html} needsKatex={post.needsKatex} />
              )}

              {/* Author card (letter signature) before the pager navigation: the signature belongs
                  to this post, PostNav is the door to the next one (nav brings its own mt-12 +
                  divider to carry the rhythm) */}
              <AuthorCard />

              {/* Previous / next post */}
              <PostNav next={post.next} prev={post.prev} />

              {/* giscus comments (GitHub Discussions, mapped by path); locked posts mount after
                  unlock. Deck print excludes comments: the printout is the slides themselves —
                  a trailing section would add a blank page */}
              <div className={cn(post.deck && "print-hide")}>
                <GiscusComments />
              </div>
            </>
          )}
        </article>

        {/* TOC right rail: sticky on wide screens; a locked post's TOC becomes available only
            when the body is decrypted. Full decks have no TOC (always empty), so the rail is
            not rendered */}
        {(unlocked || !post.locked) && !post.deck && (
          <aside className="hidden w-60 shrink-0 xl:block">
            <TableOfContents items={toc} />
          </aside>
        )}
      </div>
    </div>
  );
}

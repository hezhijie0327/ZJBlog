// Command palette: Ctrl/⌘+K site-wide search; /search-index.json is only
// fetched the first time it opens.
// Focus semantics: the input points at the listbox's current entry via
// aria-activedescendant (options stay out of the Tab order), focus returns to
// the trigger on close, and background scroll is locked while the modal is
// open.

import { ArrowUpRight, FileText, FolderGit2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { CARD, CHIP, META, MONO_CHIP } from "@/lib/styles.ts";
import type { SearchItem } from "@/lib/types.ts";

const LIST_ID = "command-palette-list";
const OPTION_PREFIX = "command-palette-option";

/** Match location -> relevance rank (title > tags > description); null = no match. */
function matchRank(item: SearchItem, q: string): number | null {
  const needle = q.toLowerCase();
  if (item.title.toLowerCase().includes(needle)) {
    return 0;
  }
  if (item.tags.some((tag) => tag.toLowerCase().includes(needle))) {
    return 1;
  }
  if (item.description?.toLowerCase().includes(needle)) {
    return 2;
  }
  return null;
}

/** Splits text by q (case-insensitive) into hit/miss segments for <mark> highlighting. */
function highlightParts(text: string, q: string): { text: string; hit: boolean }[] {
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let from = 0;
  while (needle && from <= text.length) {
    const at = lower.indexOf(needle, from);
    if (at === -1) {
      break;
    }
    if (at > from) {
      parts.push({ text: text.slice(from, at), hit: false });
    }
    parts.push({ text: text.slice(at, at + needle.length), hit: true });
    from = at + needle.length;
  }
  if (from < text.length) {
    parts.push({ text: text.slice(from), hit: false });
  }
  return parts;
}

/** Excerpt around the hit in the description (48 chars before / 64 after), shown as the result's second line. */
function excerptAround(text: string, q: string): string {
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, at - 48);
  const end = Math.min(text.length, at + q.length + 64);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/** Hit context for the result's second line: prefers a description excerpt; when only tags match, lists the matching tags. */
function buildContext(item: SearchItem, q: string): string | null {
  if (!q) {
    return null;
  }
  if (item.description?.toLowerCase().includes(q.toLowerCase())) {
    return excerptAround(item.description, q);
  }
  const tags = item.tags.filter((tag) => tag.toLowerCase().includes(q.toLowerCase()));
  return tags.length > 0 ? tags.map((tag) => `#${tag}`).join("  ") : null;
}

/** <mark> highlight for hits (bg-highlight is the selection/highlight token). */
function Highlight({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q.trim()).map((part, i) =>
        part.hit ? (
          <mark className="rounded-xs bg-highlight px-0.5 text-ink" key={i}>
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function CommandPalette() {
  const t = useT();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  // Exit-animation window: a close request plays the fade-out first and the
  // component unmounts only after the animation ends (the scroll lock and
  // palette DOM stay put meanwhile, so open/close look visually symmetric)
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Element that triggered the open; focus returns to it on close
  const openerRef = useRef<HTMLElement | null>(null);

  const typeLabel = useMemo(() => ({ blog: t("search.typeBlog"), project: t("search.typeProject") }) as const, [t]);

  /** Actual unmount: clears query state and returns focus (called by onAnimationEnd after the exit animation finishes). */
  const finishClose = useCallback(() => {
    setOpen(false);
    setClosing(false);
    setQuery("");
    setActiveIndex(0);
    openerRef.current?.focus();
  }, []);

  /** Close request: plays the exit animation first, then unmounts (finishClose). */
  const close = useCallback(() => {
    if (!open || closing) {
      return;
    }
    setClosing(true);
    // Safety net: animationend depends on the rendering pipeline (the
    // animation timeline freezes while the page is hidden and the event may
    // be lost), so finish unconditionally after a timeout; finishClose is
    // idempotent, so whichever of it or onAnimationEnd lands first wins
    window.setTimeout(finishClose, 240);
  }, [open, closing, finishClose]);

  // Triggered by Ctrl/⌘+K and by a custom event
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open && !closing) {
          close();
        } else {
          setClosing(false);
          setOpen(true);
        }
      }
      if (e.key === "Escape") {
        close();
      }
    };
    const onOpen = () => {
      setClosing(false);
      setOpen(true);
    };
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, [close, open, closing]);

  // Lazily load the index on first open
  useEffect(() => {
    if (!open || index) {
      return;
    }
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => res.json() as Promise<SearchItem[]>)
      .then((items) => {
        if (!cancelled) {
          setIndex(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIndex([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, index]);

  // Lock background scroll while open; record the trigger and focus the input
  useEffect(() => {
    if (!open) {
      return;
    }
    openerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Wait for the palette to mount, then focus
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const results = useMemo(() => {
    if (!index) {
      return [];
    }
    const q = query.trim();
    if (!q) {
      return index.slice(0, 8);
    }
    // Relevance sort: title hit > tag hit > description hit (ties keep index order)
    return index
      .map((item) => ({ item, rank: matchRank(item, q) }))
      .filter((entry): entry is { item: SearchItem; rank: number } => entry.rank !== null)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 12)
      .map((entry) => entry.item);
  }, [index, query]);

  // Clamp the active index at render time so it never goes out of bounds when results shrink
  const active = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const go = useCallback(
    (item: SearchItem) => {
      close();
      navigate(item.href);
    },
    [close, navigate],
  );

  const onInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active];
      if (item) {
        go(item);
      }
    } else if (e.key === "Tab") {
      // Focus trap: the input is the only Tab stop inside the modal, so Tab loops within the palette
      e.preventDefault();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label={t("search.title")}
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-100 flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-[2px]",
        closing ? "animate-fade-out" : "animate-fade-in",
      )}
      onAnimationEnd={(e) => {
        // Only honor the backdrop's own animation end (ignore bubbled child
        // animations); unmount only after the exit animation finishes
        if (closing && e.target === e.currentTarget) {
          finishClose();
        }
      }}
      onClick={close}
      role="dialog"
    >
      <div
        className={cn("w-full max-w-xl overflow-hidden", CARD, "shadow-pop")}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
          <input
            aria-activedescendant={results.length > 0 ? `${OPTION_PREFIX}-${active}` : undefined}
            aria-autocomplete="list"
            aria-controls={LIST_ID}
            aria-expanded="true"
            aria-label={t("search.inputLabel")}
            autoComplete="off"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeydown}
            placeholder={t("search.placeholder")}
            ref={inputRef}
            role="combobox"
            type="text"
            value={query}
          />
          <kbd className={MONO_CHIP}>ESC</kbd>
        </div>

        {/* Result list: listbox semantics; the active entry is announced via aria-activedescendant */}
        <div aria-label={t("search.results")} className="max-h-80 overflow-y-auto p-2" id={LIST_ID} role="listbox">
          {index === null ? (
            <p className={cn(META, "px-3 py-6 text-center")}>{t("search.loading")}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-3">
              {query.trim() ? t("search.noResults") : t("search.emptyIndex")}
            </p>
          ) : (
            results.map((item, i) => {
              const q = query.trim();
              const context = buildContext(item, q);
              return (
                <button
                  aria-selected={i === active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    i === active ? "bg-surface-2" : "bg-transparent",
                  )}
                  id={`${OPTION_PREFIX}-${i}`}
                  key={item.href}
                  onClick={() => {
                    go(item);
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(i);
                  }}
                  ref={(el) => {
                    // Keep the active entry scrolled into view during keyboard navigation
                    if (i === active && el) {
                      el.scrollIntoView({ block: "nearest" });
                    }
                  }}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  {item.type === "blog" ? (
                    <FileText aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
                  ) : (
                    <FolderGit2 aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      <Highlight q={q} text={item.title} />
                    </span>
                    {context && (
                      <span className="mt-0.5 block truncate text-xs leading-4 text-ink-3">
                        <Highlight q={q} text={context} />
                      </span>
                    )}
                  </span>
                  <span className={cn(CHIP, "shrink-0 font-mono text-xs")}>{typeLabel[item.type]}</span>
                  <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-ink-3" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints: keys rendered as kbd pills (the sans stack draws arrow glyphs more reliably) */}
        <div className={cn(META, "flex items-center gap-4 border-t border-line px-4 py-2.5 text-xs")}>
          <span className="flex items-center gap-1.5">
            <kbd className={cn(MONO_CHIP, "font-sans")}>↑</kbd>
            <kbd className={cn(MONO_CHIP, "font-sans")}>↓</kbd>
            {t("search.hintSelect")}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={cn(MONO_CHIP, "font-sans")}>↵</kbd>
            {t("search.hintOpen")}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={cn(MONO_CHIP, "font-sans")}>ESC</kbd>
            {t("search.hintClose")}
          </span>
        </div>
      </div>
    </div>
  );
}

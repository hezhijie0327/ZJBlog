// 命令面板：Ctrl/⌘+K 全站搜索，首次打开才拉取 /search-index.json。
// 焦点语义：input 以 aria-activedescendant 指向 listbox 当前项（options
// 不进 Tab 序），关闭时焦点归还触发者；modal 期间锁定背景滚动。

import { ArrowUpRight, FileText, FolderGit2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { CHIP, META, MONO_CHIP } from "@/lib/styles.ts";

interface SearchItem {
  title: string;
  description?: string;
  type: "blog" | "project";
  tags: string[];
  href: string;
}

const LIST_ID = "command-palette-list";
const OPTION_PREFIX = "command-palette-option";

/** 命中位置 → 相关度（title > tags > description）；null = 不匹配。 */
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

/** 把 text 按 q（大小写不敏感）切分成命中/未命中片段，供 <mark> 高亮。 */
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

/** 描述里命中词附近的摘录（前 48 / 后 64 字符），供结果第二行展示。 */
function excerptAround(text: string, q: string): string {
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, at - 48);
  const end = Math.min(text.length, at + q.length + 64);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/** 结果第二行的命中上下文：优先描述摘录；仅标签命中时列出命中标签。 */
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

/** 命中词 <mark> 高亮（bg-highlight 即选区/高亮 token）。 */
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
  // 退出动画窗口：关闭请求先播 fade-out，动画结束才真正卸载（期间保持
  // 滚动锁与面板 DOM，视觉上开合对称）
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // 打开时的触发元素，关闭时归还焦点
  const openerRef = useRef<HTMLElement | null>(null);

  const typeLabel = useMemo(() => ({ blog: t("search.typeBlog"), project: t("search.typeProject") }) as const, [t]);

  /** 真正卸载：清空查询状态并归还焦点（退出动画结束后由 onAnimationEnd 调用）。 */
  const finishClose = useCallback(() => {
    setOpen(false);
    setClosing(false);
    setQuery("");
    setActiveIndex(0);
    openerRef.current?.focus();
  }, []);

  /** 关闭请求：先播退出动画，动画结束再卸载（finishClose）。 */
  const close = useCallback(() => {
    if (!open || closing) {
      return;
    }
    setClosing(true);
    // 兜底：animationend 依赖渲染管线（页面隐藏时动画时间线冻结、事件可能
    // 丢失），超时后无条件收尾；finishClose 幂等，与 onAnimationEnd 谁先到一致
    window.setTimeout(finishClose, 240);
  }, [open, closing, finishClose]);

  // Ctrl/⌘+K 与自定义事件触发
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

  // 首次打开时懒加载索引
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

  // 打开期间锁定背景滚动；记录触发者并聚焦输入框
  useEffect(() => {
    if (!open) {
      return;
    }
    openerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // 等待面板挂载后聚焦
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
    // 相关度排序：标题命中 > 标签命中 > 描述命中（同 rank 保持索引顺序）
    return index
      .map((item) => ({ item, rank: matchRank(item, q) }))
      .filter((entry): entry is { item: SearchItem; rank: number } => entry.rank !== null)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 12)
      .map((entry) => entry.item);
  }, [index, query]);

  // 渲染期收敛激活下标，避免结果变短时越界
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
      // 焦点陷阱：modal 内只有输入框一个 Tab 位，Tab 循环留在面板里
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
        // 只认背板自身的动画结束（子元素动画冒泡忽略）；退出动画播完才卸载
        if (closing && e.target === e.currentTarget) {
          finishClose();
        }
      }}
      onClick={close}
      role="dialog"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* 输入框 */}
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

        {/* 结果列表：listbox 语义，激活项经 aria-activedescendant 播报 */}
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
                    // 键盘导航时保证激活项滚动到可见区域
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
                  <span className={cn(CHIP, "shrink-0 font-mono text-[11px]")}>{typeLabel[item.type]}</span>
                  <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-ink-3" />
                </button>
              );
            })
          )}
        </div>

        {/* 底部提示：按键用 kbd 胶囊（sans 栈渲染箭头字形更稳） */}
        <div className={cn(META, "flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px]")}>
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

// 命令面板：Ctrl/⌘+K 全站搜索，首次打开才拉取 /search-index.json。

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

function matches(item: SearchItem, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(needle) ||
    (item.description?.toLowerCase().includes(needle) ?? false) ||
    item.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

export function CommandPalette() {
  const t = useT();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const typeLabel = useMemo(() => ({ blog: t("search.typeBlog"), project: t("search.typeProject") }) as const, [t]);

  // Ctrl/⌘+K 与自定义事件触发
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => {
      setOpen(true);
    };
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

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

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const results = useMemo(() => {
    if (!index) {
      return [];
    }
    const q = query.trim();
    if (!q) {
      return index.slice(0, 8);
    }
    return index.filter((item) => matches(item, q)).slice(0, 12);
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
    }
  };

  useEffect(() => {
    if (open) {
      // 等待面板挂载后聚焦
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label={t("search.title")}
      aria-modal="true"
      className="fixed inset-0 z-100 flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-[2px] animate-fade-in"
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
            aria-label={t("search.inputLabel")}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeydown}
            placeholder={t("search.placeholder")}
            ref={inputRef}
            value={query}
          />
          <kbd className={MONO_CHIP}>ESC</kbd>
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 overflow-y-auto p-2">
          {index === null ? (
            <p className={cn(META, "px-3 py-6 text-center")}>{t("search.loading")}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-3">
              {query.trim() ? t("search.noResults") : t("search.emptyIndex")}
            </p>
          ) : (
            results.map((item, i) => (
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-surface-2" : "bg-transparent",
                )}
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
                type="button"
              >
                {item.type === "blog" ? (
                  <FileText aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
                ) : (
                  <FolderGit2 aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.title}</span>
                <span className={cn(CHIP, "shrink-0 font-mono text-[10px]")}>{typeLabel[item.type]}</span>
                <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-ink-3" />
              </button>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className={cn(META, "flex items-center gap-3 border-t border-line px-4 py-2.5 text-[10px]")}>
          <span>{t("search.hintSelect")}</span>
          <span>{t("search.hintOpen")}</span>
          <span>{t("search.hintClose")}</span>
        </div>
      </div>
    </div>
  );
}

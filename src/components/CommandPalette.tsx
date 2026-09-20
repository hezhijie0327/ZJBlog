"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileText, FolderGit2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  title: string;
  description?: string;
  type: "blog" | "project";
  tags: string[];
  href: string;
}

const TYPE_LABEL: Record<SearchItem["type"], string> = {
  blog: "博客",
  project: "项目",
};

function matches(item: SearchItem, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(needle) ||
    (item.description?.toLowerCase().includes(needle) ?? false) ||
    item.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K 与自定义事件触发
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
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  // 首次打开时懒加载索引
  useEffect(() => {
    if (!open || index) return;
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => res.json() as Promise<SearchItem[]>)
      .then((items) => {
        if (!cancelled) setIndex(items);
      })
      .catch(() => {
        if (!cancelled) setIndex([]);
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
    if (!index) return [];
    const q = query.trim();
    if (!q) return index.slice(0, 8);
    return index.filter((item) => matches(item, q)).slice(0, 12);
  }, [index, query]);

  // 渲染期收敛激活下标，避免结果变短时越界
  const active = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
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
      if (item) go(item.href);
    }
  };

  useEffect(() => {
    if (open) {
      // 等待面板挂载后聚焦
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="站内搜索"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 输入框 */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeydown}
            placeholder="搜索文章与项目…"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            aria-label="搜索关键词"
          />
          <kbd className="shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
            ESC
          </kbd>
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 overflow-y-auto p-2">
          {index === null ? (
            <p className="px-3 py-6 text-center font-mono text-xs text-ink-3">
              加载索引中…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-3">
              {query.trim() ? "没有匹配的结果" : "暂无可搜索的内容"}
            </p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.href}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => go(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-surface-2" : "bg-transparent",
                )}
              >
                {item.type === "blog" ? (
                  <FileText className="size-4 shrink-0 text-ink-3" />
                ) : (
                  <FolderGit2 className="size-4 shrink-0 text-ink-3" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {item.title}
                </span>
                <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-ink-3">
                  {TYPE_LABEL[item.type]}
                </span>
                <ArrowUpRight className="size-3.5 shrink-0 text-ink-3" />
              </button>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-3 border-t border-line px-4 py-2.5 font-mono text-[10px] text-ink-3">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}

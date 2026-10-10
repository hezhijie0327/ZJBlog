// 幻灯片播放器：整篇 deck 博文（BlogPostPage）与正文嵌入（Prose 占位）共用。
// 首帧输出全部幻灯片纵向堆叠（= SSR/无 JS 形态，内容全量进 DOM，水合安全），
// 挂载后升级为逐页播放：键盘（←→/PgUp/PgDn/Home/End）、按钮、页码、#N 深链
// （仅整篇）、演讲者备注、全屏放映，可切回连续浏览。
//
// 缩放纯 CSS：stage 为 inline-size 查询容器，--deck-scale 用
// tan(atan2(100cqw, 1280px)) 求容器宽与 1280px 画布之比 —— 全屏/换栏自动
// 跟随，无需 JS 测量；连续模式下画布总高随缩放未知，由 ResizeObserver 同步
// stage 高度（transform 不参与布局，父级须显式让高）。
//
// 宿主 CSS（HOST_CSS）只收工具类够不到的规则：目标是 dangerouslySetInnerHTML
// 注入的惰性 section（mode 显隐、shiki 暗态切换、marpit scoping 之外的装饰）；
// 颜色一律 token。deck 主题 CSS（tools/deckTheme.css 经 marpit scoping）由
// payload/占位结构带来，在此处一并注入。

import { ChevronLeft, ChevronRight, Maximize, Minimize, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, ICON_BTN, META } from "@/lib/styles.ts";

export interface DeckViewerProps {
  /** 幻灯片 HTML（构建期产物；整篇 = contentHtml 回填，嵌入 = 占位结构提取） */
  html: string;
  /** deck 主题 CSS（整篇 = payload post.deck.css；嵌入 = 占位结构内联） */
  css?: string;
  /** 嵌入形态：无 #N 深链，键盘只在容器聚焦时生效 */
  embedded?: boolean;
}

interface ParsedSlide {
  /** 剥掉备注后的幻灯片 HTML（逐页渲染用） */
  slide: string;
  /** 演讲者备注（构建期注入的 .deck-notes，已转义） */
  notes: string;
}

/** 切分逐页 HTML（marpit 的 section 不嵌套，可安全非贪婪匹配）。 */
function splitSlides(html: string): ParsedSlide[] {
  return [...html.matchAll(/<section\b[\s\S]*?<\/section>/g)].map((match) => {
    const raw = match[0] ?? "";
    const notes = /<aside class="deck-notes">([\s\S]*?)<\/aside>/.exec(raw)?.[1] ?? "";
    return { slide: raw.replace(/<aside class="deck-notes">[\s\S]*?<\/aside>/, ""), notes };
  });
}

function parseSlideHash(hash: string): number | null {
  const match = /^#(\d+)$/.exec(hash);
  if (!match?.[1]) {
    return null;
  }
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
}

/** 宿主样式：仅 JSX 工具类表达不了的规则（见文件头注）。 */
const HOST_CSS = `
.deck-root { --deck-canvas-w: 1280px; }
.deck-stage {
  position: relative;
  container-type: inline-size;
  --deck-scale: calc(tan(atan2(100cqw, var(--deck-canvas-w))));
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--bg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.deck-canvas {
  width: var(--deck-canvas-w);
  transform: scale(var(--deck-scale));
  transform-origin: top left;
}
/* 逐页：stage 锁 16:9，画布绝对定位在原点缩放 */
.deck-root[data-mode="paged"] .deck-stage { aspect-ratio: 16 / 9; }
.deck-root[data-mode="paged"] .deck-canvas { position: absolute; left: 0; top: 0; }
.deck-root[data-mode="paged"] .deck-canvas section { animation: deck-slide-in 0.28s ease; }
@keyframes deck-slide-in {
  from { opacity: 0; transform: translateX(14px); }
  to { opacity: 1; transform: none; }
}
/* 连续：画布依次纵排（高度由 JS 按缩放后实际值同步到 stage） */
.deck-root[data-mode="stacked"] .deck-canvas section + section { border-top: 1px solid var(--line); }
/* 演讲者备注不进画布（逐页模式下由 React 面板展示当前页备注） */
.deck-root .marpit section .deck-notes { display: none; }
/* shiki 双主题：亮态默认值在 deck 主题 CSS（marpit scoping 无法写 .dark
 * 祖先选择器），暗态切换在此收口 */
.dark .deck-root .marpit section pre { color: var(--shiki-dark); }
.dark .deck-root .marpit section pre span { color: var(--shiki-dark); }
/* 全屏放映：画布居中，控制条留屏 */
.deck-root:fullscreen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--bg);
  padding: 24px;
  overflow: auto;
}
.deck-root:fullscreen .deck-stage {
  width: min(100%, calc((100dvh - 48px - 64px) * 16 / 9));
  margin-inline: auto;
}
`;

export function DeckViewer({ html, css, embedded = false }: DeckViewerProps) {
  const t = useT();
  // 初始即堆叠形态（与 SSR 一致 → 零 CLS）；逐页模式由用户手势进入
  // （翻页按钮 / 滑动 / #N 深链）。控制条也始终渲染——挂载后才插入会把
  // 下方内容顶下去，同样计入布局位移。
  const [mode, setMode] = useState<"paged" | "stacked">("stacked");
  const [active, setActive] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  // 是否发生过用户翻页：hash 只在交互后写入，初始加载不往 URL 塞 #1
  const interacted = useRef(false);

  const slides = useMemo(() => splitSlides(html), [html]);
  const total = slides.length;

  // 函数式更新：快速连按/同帧多次事件也不会基于过期 active 计算
  const goTo = useCallback(
    (next: number | ((prev: number) => number)) => {
      interacted.current = true;
      setActive((prev) => {
        const target = typeof next === "function" ? next(prev) : next;
        return Math.max(0, Math.min(total - 1, target));
      });
    },
    [total],
  );

  // 进入逐页模式（用户手势或 #N 深链；深链带来的布局变化是用户显式意图）
  const enterPaged = useCallback(
    (slide?: number | ((prev: number) => number)) => {
      interacted.current = true;
      setMode("paged");
      if (slide !== undefined) {
        setActive((prev) => {
          const target = typeof slide === "function" ? slide(prev) : slide;
          return Math.max(0, Math.min(total - 1, target));
        });
      }
    },
    [total],
  );

  // #N 深链：只在首次挂载消费（整篇模式）
  useEffect(() => {
    if (total === 0 || embedded) {
      return;
    }
    const initial = parseSlideHash(window.location.hash);
    if (initial !== null) {
      setMode("paged");
      setActive(Math.min(initial, total - 1));
    }
  }, [embedded, total]);

  // 翻页后同步 hash（整篇模式）：hash-only replaceState 不触发 router 的
  // popstate 路由（已核实）；深链/hashchange 带来的 active 不回写
  useEffect(() => {
    if (!interacted.current || embedded) {
      return;
    }
    window.history.replaceState(null, "", `#${active + 1}`);
  }, [active, embedded]);

  // 浏览器前进/后退或手动改 hash 时跟随（整篇模式；hash-only 变更 router 不接管）
  useEffect(() => {
    if (embedded) {
      return;
    }
    const onHashChange = () => {
      const n = parseSlideHash(window.location.hash);
      if (n !== null) {
        setActive(Math.min(n, total - 1));
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [embedded, total]);

  // 全屏状态同步（Esc / 系统手势退出也要落回按钮态）
  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // 连续模式：stage 高度 = 缩放后画布实际高度（transform 不参与布局）
  useEffect(() => {
    if (mode !== "stacked") {
      return;
    }
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) {
      return;
    }
    const sync = () => {
      stage.style.height = `${canvas.getBoundingClientRect().height}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      stage.style.height = "";
    };
  }, [mode]);

  const onKey = useCallback(
    (event: { key: string; preventDefault: () => void; target: EventTarget | null }) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          goTo((prev) => prev + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          goTo((prev) => prev - 1);
          break;
        case "Home":
          event.preventDefault();
          goTo(0);
          break;
        case "End":
          event.preventDefault();
          goTo(total - 1);
          break;
        default:
          break;
      }
    },
    [goTo, total],
  );

  // 整篇模式：窗口级键盘翻页（嵌入模式走容器 onKeyDown，不劫持文章滚动）
  useEffect(() => {
    if (embedded || mode !== "paged") {
      return;
    }
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [embedded, mode, onKey]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void rootRef.current?.requestFullscreen();
    }
  };

  const current = slides[active];

  return (
    <div
      className="deck-root"
      data-embedded={embedded || undefined}
      data-mode={mode}
      // 嵌入形态：容器可聚焦，键盘翻页不劫持文章滚动；整篇模式走窗口监听
      onKeyDown={embedded ? (event) => onKey(event) : undefined}
      ref={rootRef}
      tabIndex={embedded ? 0 : undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: HOST_CSS }} />
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}

      {/* 幻灯片画布：初始 = 全量堆叠（SSR/无 JS 形态，零 CLS）；逐页由手势进入 */}
      <div
        className="deck-stage"
        onTouchEnd={(event) => {
          const start = touchX.current;
          touchX.current = null;
          if (start === null || mode !== "paged") {
            return;
          }
          const dx = (event.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) > 48) {
            goTo((prev) => prev + (dx < 0 ? 1 : -1));
          }
        }}
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        ref={stageRef}
      >
        {mode === "paged" ? (
          <div
            aria-label={t("deck.slideN", { m: total, n: active + 1 })}
            aria-roledescription={t("deck.slide")}
            // marpit 主题 CSS scoping 在 div.marpit > section 下，容器类必须挂
            className="deck-canvas marpit"
            dangerouslySetInnerHTML={{ __html: current?.slide ?? "" }}
            key={active}
            ref={canvasRef}
            role="group"
          />
        ) : (
          // 首帧分支带 data-deck-content：pageData.ts 据此回填 contentHtml
          <div
            className="deck-canvas marpit"
            dangerouslySetInnerHTML={{ __html: html }}
            data-deck-content
            ref={canvasRef}
          />
        )}
      </div>

      {/* 演讲者备注面板：逐页模式下跟随当前页（构建期已转义） */}
      {showNotes && mode === "paged" && (current?.notes ?? "") !== "" && (
        <div
          className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2 [&_p]:m-0 [&_p+p]:mt-1.5"
          dangerouslySetInnerHTML={{ __html: current?.notes ?? "" }}
        />
      )}

      {/* 控制条：始终渲染（挂载后插入会把下方内容顶下去，计入 CLS）。
          堆叠模式只留模式切换与全屏；翻页控件随逐页模式出现/消失，
          该位移发生在用户点击 500ms 内，不计入 CLS。 */}
      {total > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {mode === "paged" && (
            <>
              <button
                aria-label={t("deck.prev")}
                className={ICON_BTN}
                disabled={active === 0}
                onClick={() => goTo((prev) => prev - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <span className={cn(META, "min-w-14 text-center tabular-nums")}>
                {active + 1} / {total}
              </span>
              <button
                aria-label={t("deck.next")}
                className={ICON_BTN}
                disabled={active === total - 1}
                onClick={() => goTo((prev) => prev + 1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </>
          )}

          <span className="flex-1" />

          {mode === "paged" && (
            <button
              aria-label={t("deck.notes")}
              aria-pressed={showNotes}
              className={cn(ICON_BTN, showNotes && "bg-surface-2 text-ink")}
              onClick={() => setShowNotes((v) => !v)}
              type="button"
            >
              <StickyNote aria-hidden="true" className="size-4" />
            </button>
          )}
          <button
            className={cn(CHIP, "transition-colors hover:border-accent hover:text-accent")}
            onClick={() => (mode === "paged" ? setMode("stacked") : enterPaged())}
            type="button"
          >
            {mode === "paged" ? t("deck.modeStacked") : t("deck.modePaged")}
          </button>
          <button
            aria-label={fullscreen ? t("deck.exitFullscreen") : t("deck.fullscreen")}
            className={ICON_BTN}
            onClick={toggleFullscreen}
            type="button"
          >
            {fullscreen ? (
              <Minimize aria-hidden="true" className="size-4" />
            ) : (
              <Maximize aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

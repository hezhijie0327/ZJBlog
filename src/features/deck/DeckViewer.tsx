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

import { ChevronLeft, ChevronRight, Maximize, Minimize, Printer, StickyNote } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { startPrintPreview } from "@/lib/print.ts";
import { CHIP, ICON_BTN, META } from "@/lib/styles.ts";

export interface DeckViewerProps {
  /** 幻灯片 HTML（构建期产物；整篇 = contentHtml 回填，嵌入 = 占位结构提取） */
  html: string;
  /** deck 主题 CSS（整篇 = payload post.deck.css；嵌入 = 占位结构内联） */
  css?: string;
  /** 嵌入形态：无 #N 深链，键盘只在容器聚焦时生效 */
  embedded?: boolean;
  /** 打印文件名主体（zjblog_<title>），嵌入场景由调用方给所在文章标题 */
  titleBase?: string;
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
/* 全屏放映：由 React 状态（data-fullscreen）驱动样式而非 :fullscreen 伪类
 * ——webview/预览环境里原生 Fullscreen API 常是「半残」的（DOM 状态进了、
 * 视图不展开、fullscreenchange 不派发），样式挂在状态上保证任何环境点按钮
 * 都有可见反应；伪全屏 = fixed 覆盖层，真全屏下同样适用。控制条留屏，
 * 安全区内收（DESIGN §18）。 */
.deck-root[data-fullscreen] {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--bg);
  padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
    max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  overflow: auto;
}
.deck-root[data-fullscreen] .deck-stage {
  width: min(100%, calc((100dvh - 48px - 64px) * 16 / 9));
  margin-inline: auto;
}
/* 舞台上的横滑交给 JS 翻页，纵滑留给页面滚动 */
.deck-stage {
  touch-action: pan-y;
}
/* 逐页模式的非当前页：Tailwind preflight 的 [hidden] 是 layered !important
 * （unlayered 规则按层反转规则必输），因此换页用自定义属性 + 自带规则 */
.deck-canvas section[data-slide-hidden] {
  display: none !important;
}
/* ── 打印 / 预览纸面：整篇 deck 页的 @page 是 1280×720 横屏（marpit 自带
 * + DECK_PRINT_PAGE_CSS 在 HOST_CSS 之后再声明一次兜底，防 print.css 的
 * @page a4 竖屏意外胜出）——打印时舞台强制撑满纸宽（容器/版心让位），
 * 缩放自然归一为 1，幻灯片一比一满页无白边；chrome 隐藏、隐藏页揭示。
 * 嵌入形态（data-embedded）不走 1280 覆写：它打印时是文章 a4 流的一部分，
 * 保持 zoom 缩放的连续流即可。@media print 与 html.print-preview（预览脸，
 * 见 lib/print.ts / print.css）两份列表保持同步。 ── */
@media print {
  .deck-root [data-deck-chrome] {
    display: none !important;
  }
  /* 打印纸面永远浅色：代码高亮强制回 shiki light 变量 */
  .dark .deck-root .marpit section pre,
  .dark .deck-root .marpit section pre span {
    color: var(--shiki-light) !important;
  }
  .deck-root .deck-stage {
    aspect-ratio: auto !important;
    overflow: visible !important;
    height: auto !important;
    border: none;
    box-shadow: none;
    border-radius: 0;
  }
  .deck-root .deck-canvas {
    position: static !important;
    transform: none !important;
  }
  /* 整篇：zoom 归一，1280px 画布一比一满页（@page 1280×720 横屏） */
  .deck-root:not([data-embedded]) .deck-canvas {
    zoom: 1 !important;
  }
  /* 嵌入：zoom 布局缩放到栏宽，幻灯片作为文章 a4 流的整块连续排印 */
  .deck-root[data-embedded] .deck-canvas {
    zoom: var(--deck-scale) !important;
  }
  .deck-root .deck-canvas section[data-slide-hidden] {
    display: block !important;
  }
  .deck-root .deck-canvas section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
.print-preview .deck-root [data-deck-chrome] {
  display: none !important;
}
.print-preview .deck-root:not([data-embedded]),
.print-preview .deck-root:not([data-embedded]) .deck-stage {
  width: 1280px !important;
  max-width: none !important;
  margin-inline: 0 !important;
}
.print-preview .deck-root:not([data-embedded]) .deck-stage {
  aspect-ratio: auto !important;
  overflow: visible !important;
  height: auto !important;
  border: none;
  box-shadow: none;
  border-radius: 0;
}
.print-preview .deck-root .deck-canvas {
  position: static !important;
  transform: none !important;
}
.print-preview .deck-root:not([data-embedded]) .deck-canvas {
  zoom: 1 !important;
}
.print-preview .deck-root .deck-canvas section[data-slide-hidden] {
  display: block !important;
}
/* 预览纸面永远浅色：代码高亮强制回 shiki light 变量 */
.print-preview.dark .deck-root .marpit section pre,
.print-preview.dark .deck-root .marpit section pre span {
  color: var(--shiki-light) !important;
}
`;

/** 整篇 deck 的横屏纸张声明：仅全页播放器注入（嵌入形态若注入会劫持
 * 文章打印的纸张尺寸——renderDeckEmbed 侧已剥 @page，这里同理）。 */
export const DECK_PRINT_PAGE_CSS = `
@page {
  size: 1280px 720px;
  margin: 0;
}
`;

/** 无 JS 兜底：默认逐页形态把后续页裁剪在 16:9 舞台外，这里在无 JS 时把
 *  画布展开为完整堆叠视图。由 tools/ssr.tsx 逐页条件注入 <head> 的
 *  <noscript><style>（JS 可用时 head 里的 noscript 内容不生效）。
 *  HOST_CSS 在 body 内晚于 head 生效，覆盖需要 !important；zoom 用布局缩放
 *  替代 transform（transform 不参与布局，展开后父级无法获得实际高度）。 */
export const DECK_NOSCRIPT_CSS = `
.deck-root .deck-stage { aspect-ratio: auto !important; overflow: visible !important; }
.deck-root .deck-canvas { position: static !important; transform: none !important; zoom: var(--deck-scale); }
.deck-root .deck-canvas section + section { border-top: 1px solid var(--line) !important; }
.deck-root [data-deck-chrome] { display: none !important; }
`;

export function DeckViewer({ html, css, embedded = false, titleBase }: DeckViewerProps) {
  const t = useT();
  // 默认逐页形态：SSR 直接渲染 16:9 舞台（画布含全部幻灯片、overflow 裁剪
  // 只露第一页），水合前后视觉零变化 → 零 CLS；无 JS 场景由 head 里的
  // <noscript> 样式（DECK_NOSCRIPT_CSS，ssr.tsx 条件注入）揭示堆叠视图。
  // 画布恒为全量 DOM：换页只逐节切换 hidden 属性（不重排 innerHTML），
  // 打印/预览因此任何时刻都拿得到全部页面。
  const [mode, setMode] = useState<"paged" | "stacked">("paged");
  const [active, setActive] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  // 全屏双轨：原生 Fullscreen API 在 webview/预览环境里可能半残（DOM 状态
  // 进了但视图不展开、事件不派发），promise 拒绝或不可用时回落伪全屏
  // （fixed 覆盖层，data-fullscreen 样式），保证按钮在任何环境都有可见反应
  const [nativeFs, setNativeFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);

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

  // #N 深链消费（整篇模式）：舞台尺寸固定，换页内容不产生位移
  useEffect(() => {
    if (total === 0 || embedded) {
      return;
    }
    const initial = parseSlideHash(window.location.hash);
    if (initial !== null) {
      setActive(Math.min(initial, total - 1));
    }
  }, [embedded, total]);

  // 换页 = 对全量 DOM 逐节切换 hidden（打印/预览需要全部页面常驻文档）；
  // display:none ↔ block 会自动重放 CSS 换页动画。可见节就地补 aria 语义
  // （画布是 dangerouslySetInnerHTML 的惰性 DOM，无法走 JSX 声明）。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 显式依赖 html——解锁/换页注入新 blob 后需重放 hidden 与 aria
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.querySelectorAll("section").forEach((section, index) => {
      const isActive = mode === "paged" && index === active;
      section.toggleAttribute("data-slide-hidden", mode === "paged" && index !== active);
      if (isActive) {
        section.setAttribute("role", "group");
        section.setAttribute("aria-roledescription", t("deck.slide"));
        section.setAttribute("aria-label", t("deck.slideN", { m: total, n: index + 1 }));
      } else {
        section.removeAttribute("role");
        section.removeAttribute("aria-roledescription");
        section.removeAttribute("aria-label");
      }
    });
  }, [mode, active, html, total, t]);

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

  // 原生全屏状态同步（Esc / 系统手势退出也要落回按钮态）
  useEffect(() => {
    const onFullscreenChange = () => setNativeFs(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // 伪全屏退出：Esc（原生全屏的 Esc 由浏览器自己处理）
  useEffect(() => {
    if (!pseudoFs) {
      return;
    }
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPseudoFs(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [pseudoFs]);

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
      // 乐观置位：fullscreenchange 不派发的环境也要落回按钮态
      setNativeFs(false);
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    const el = rootRef.current;
    if (el?.requestFullscreen && document.fullscreenEnabled) {
      el.requestFullscreen().then(
        () => setNativeFs(true),
        () => setPseudoFs(true),
      );
    } else {
      setPseudoFs(true);
    }
  };

  const fullscreen = nativeFs || pseudoFs;

  const current = slides[active];

  return (
    <div
      className="deck-root"
      data-embedded={embedded || undefined}
      data-fullscreen={fullscreen || undefined}
      data-mode={mode}
      // 嵌入形态：容器可聚焦，键盘翻页不劫持文章滚动；整篇模式走窗口监听
      onKeyDown={embedded ? (event) => onKey(event) : undefined}
      ref={rootRef}
      tabIndex={embedded ? 0 : undefined}
    >
      <style dangerouslySetInnerHTML={{ __html: HOST_CSS }} />
      {/* 横屏纸张声明仅整篇模式注入（嵌入态注入会劫持文章打印纸张） */}
      {!embedded && <style dangerouslySetInnerHTML={{ __html: DECK_PRINT_PAGE_CSS }} />}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}

      {/* 幻灯片画布：恒为全量 DOM（SSR 同形；data-deck-content 供
          pageData.ts 回填 contentHtml），换页由 effect 逐节 hidden */}
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
        {/* marpit 主题 CSS scoping 在 div.marpit > section 下，容器类必须挂 */}
        <div
          className="deck-canvas marpit"
          dangerouslySetInnerHTML={{ __html: html }}
          data-deck-content
          ref={canvasRef}
        />
      </div>

      {/* 演讲者备注面板：逐页模式下跟随当前页（构建期已转义） */}
      {showNotes && mode === "paged" && (current?.notes ?? "") !== "" && (
        <div
          className="mt-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2 [&_p]:m-0 [&_p+p]:mt-1.5"
          dangerouslySetInnerHTML={{ __html: current?.notes ?? "" }}
          data-deck-chrome
        />
      )}

      {/* 控制条：始终渲染（挂载后插入会把下方内容顶下去，计入 CLS）。
          堆叠模式只留模式切换与全屏；翻页控件随逐页模式出现/消失，
          该位移发生在用户点击 500ms 内，不计入 CLS。 */}
      {total > 0 && (
        <div className="mt-3 flex items-center gap-1.5" data-deck-chrome>
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
            onClick={() => setMode(mode === "paged" ? "stacked" : "paged")}
            type="button"
          >
            {mode === "paged" ? t("deck.modeStacked") : t("deck.modePaged")}
          </button>
          <button
            aria-label={t("deck.print")}
            className={ICON_BTN}
            onClick={() => {
              // 打印走全量纸面（marpit @page 逐页 break 接管分页）
              setMode("stacked");
              startPrintPreview({ closeLabel: t("print.close"), titleBase: titleBase ?? "" });
            }}
            title={t("deck.print")}
            type="button"
          >
            <Printer aria-hidden="true" className="size-4" />
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

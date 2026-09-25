// Mermaid 图表渲染器：库体积大（约 2.7MB），滚动到图表附近才动态加载。
// 构建期 Markdown 编译已把 mermaid 代码块替换为 .mermaid-placeholder 占位
// 容器（data-chart 存原文），由 Prose 挂载本组件逐个渲染。
//
// mermaid.initialize 是配置合并（很轻），随每次渲染执行以携带当前主题；
// 主题切换（html.dark 翻转）后已出图的图表会重渲染；beforeprint 时未渲染
// 的图表立即触发渲染（尽力而为）。

import type { Mermaid } from "mermaid";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n.ts";
import { watchThemeDark } from "@/lib/theme.ts";
import { useInView } from "@/lib/useInView.ts";

interface MermaidRendererProps {
  chart: string;
}

let mermaidPromise: Promise<Mermaid> | null = null;

/** 渲染 id 序列（模块级递增，禁随机 —— DESIGN.md §7 确定性要求）。 */
let mermaidSeq = 0;

/** 懒加载 mermaid（模块级缓存，全站只加载一次）。 */
function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((mermaid) => mermaid.default);
  return mermaidPromise;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const t = useT();
  // 进入视口（含 300px 缓冲）才触发加载；beforeprint 时强制渲染兜底
  const { ref: containerRef, inView: scrolled } = useInView<HTMLDivElement>({ once: true });
  const [printed, setPrinted] = useState(false);
  const visible = scrolled || printed;
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains("dark"));
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  // 主题翻转后重渲染（theme 变化触发下面的渲染 effect）
  useEffect(() => watchThemeDark(setTheme), []);

  // 打印时未滚动到的图表是空占位——尽力触发一次渲染
  useEffect(() => {
    const onBeforePrint = () => {
      setPrinted(true);
    };
    window.addEventListener("beforeprint", onBeforePrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let mounted = true;

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          fontFamily: "var(--font-sans)",
          theme: theme ? "dark" : "default",
        });

        const id = `mermaid-${++mermaidSeq}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (mounted) {
          setSvg(renderedSvg);
          setError("");
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visible, chart, theme]);

  if (error) {
    // 危险文案用 ink/ink-2 保持 AA 对比度，danger 只承担边框语义
    return (
      <div className="my-4 rounded-lg border border-danger/60 bg-danger/10 p-4 text-sm" role="alert">
        <p className="font-semibold text-ink">{t("mermaid.failed")}</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-ink-2">{error}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-line bg-surface p-4 shadow-card" ref={containerRef}>
      {svg ? (
        // mermaid.render 输出受 securityLevel: "strict" 约束的受信 SVG；
        // role="img" + aria-label 让读屏器把整图作为一张图语义呈现
        <div aria-label={t("mermaid.figure")} dangerouslySetInnerHTML={{ __html: svg }} role="img" />
      ) : (
        <p className="py-8 text-center text-sm text-ink-3">{t("mermaid.loading")}</p>
      )}
    </div>
  );
}

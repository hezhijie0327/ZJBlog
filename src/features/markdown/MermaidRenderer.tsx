// Mermaid 图表渲染器：库体积大（约 2.7MB），滚动到图表附近才动态加载。
// 构建期 Markdown 编译已把 mermaid 代码块替换为 .mermaid-placeholder 占位
// 容器（data-chart 存原文），由 Prose 挂载本组件逐个渲染。
//
// mermaid.initialize 是配置合并（很轻），随每次渲染执行以携带当前主题；
// 主题切换（html.dark 翻转）后已出图的图表会重渲染；beforeprint 时未渲染
// 的图表立即触发渲染（尽力而为）。

import type { Mermaid } from "mermaid";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n.ts";

interface MermaidRendererProps {
  chart: string;
}

let mermaidPromise: Promise<Mermaid> | null = null;

/** 懒加载 mermaid（模块级缓存，全站只加载一次）。 */
function loadMermaid(): Promise<Mermaid> {
  mermaidPromise ??= import("mermaid").then((mermaid) => mermaid.default);
  return mermaidPromise;
}

/** 当前是否暗色（html.dark 是唯一事实源，auto 跟随系统也会翻它）。 */
function isDarkTheme(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** 监听 html class 翻转（含 auto 跟随系统），返回退订函数。 */
function watchThemeChange(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => {
    observer.disconnect();
  };
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  // 旧浏览器无 IntersectionObserver 时直接以可见起始，避免在 effect 里同步 setState
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  const [theme, setTheme] = useState(() => isDarkTheme());
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  // 进入视口（含 300px 缓冲）才触发加载
  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  // 主题翻转后重渲染（theme 变化触发下面的渲染 effect）
  useEffect(() => watchThemeChange(() => setTheme(isDarkTheme())), []);

  // 打印时未滚动到的图表是空占位——尽力触发一次渲染
  useEffect(() => {
    const onBeforePrint = () => {
      setVisible(true);
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

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
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

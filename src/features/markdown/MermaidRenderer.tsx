// Mermaid 图表渲染器：库体积大（约 2.7MB），滚动到图表附近才动态加载。
// 构建期 Markdown 编译已把 mermaid 代码块替换为 .mermaid-placeholder 占位
// 容器（data-chart 存原文），由 Prose 挂载本组件逐个渲染。

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n.ts";

interface MermaidRendererProps {
  chart: string;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
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

  useEffect(() => {
    if (!visible) {
      return;
    }
    let mounted = true;

    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        // 优先读取主题类（html.dark），未挂载时回退到系统偏好
        const isDark =
          document.documentElement.classList.contains("dark") ||
          window.matchMedia("(prefers-color-scheme: dark)").matches;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDark ? "dark" : "default",
          fontFamily: "var(--font-sans)",
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
  }, [visible, chart]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        <p className="font-semibold">{t("mermaid.failed")}</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs">{error}</pre>
      </div>
    );
  }

  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-line bg-surface p-4 shadow-card" ref={containerRef}>
      {svg ? (
        // mermaid.render 输出受 securityLevel: "strict" 约束的受信 SVG
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="py-8 text-center text-sm text-ink-3">{t("mermaid.loading")}</p>
      )}
    </div>
  );
}

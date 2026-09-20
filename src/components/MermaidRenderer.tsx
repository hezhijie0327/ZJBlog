"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

interface MermaidRendererProps {
  chart: string;
}

/**
 * Mermaid 图表渲染器：库体积大（约 2.7MB），滚动到图表附近才动态加载，
 * 未进入视口前只渲染占位框 —— 不拖累首屏指标。
 */
export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  // 进入视口（含 300px 缓冲）才触发加载
  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
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
    if (!visible) return;
    let mounted = true;

    const renderChart = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        // 优先读取主题类（next-themes），未挂载时回退到系统偏好
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
          const message = e instanceof Error ? e.message : "Unknown error";
          setError(message);
        }
      }
    };

    void renderChart();

    return () => {
      mounted = false;
    };
  }, [visible, chart]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-300">
        <p className="font-semibold">{t("mermaid.failed")}</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 overflow-x-auto rounded-xl border border-line bg-surface p-4 shadow-card"
    >
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="py-8 text-center text-sm text-ink-3">
          {t("mermaid.loading")}
        </p>
      )}
    </div>
  );
}

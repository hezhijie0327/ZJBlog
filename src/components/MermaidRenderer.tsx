"use client";

import { useEffect, useState } from "react";

interface MermaidRendererProps {
  chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
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
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-300">
        <p className="font-semibold">Mermaid 渲染失败</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs">
          {error}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-xl border border-line bg-surface px-4 py-4 text-sm text-ink-3">
        正在渲染流程图...
      </div>
    );
  }

  return (
    <div
      className="my-6 overflow-x-auto rounded-xl border border-line bg-surface p-4 shadow-card"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

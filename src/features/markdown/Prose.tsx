// 文章正文渲染：构建期编译好的 HTML 直接注入（dangerouslySetInnerHTML），
// mermaid 占位容器在挂载后逐个替换为懒加载渲染器。
// 外层 content-visibility 跳过长文的屏外渲染成本。

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";

export function Prose({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // html 是语义依赖：正文更新后 DOM 里的占位容器换了，需要重新挂载渲染器
  // biome-ignore lint/correctness/useExhaustiveDependencies: 显式依赖 html 以重挂载渲染器
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const roots: Root[] = [];
    for (const el of container.querySelectorAll<HTMLElement>(".mermaid-placeholder")) {
      const root = createRoot(el);
      root.render(<MermaidRenderer chart={el.dataset.chart ?? ""} />);
      roots.push(root);
    }
    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, [html]);

  return (
    <div
      className="prose max-w-none [content-visibility:auto] [contain-intrinsic-size:auto_2000px]"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={ref}
    />
  );
}

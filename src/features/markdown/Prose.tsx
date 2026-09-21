// 文章正文渲染：构建期编译好的 HTML 直接注入（dangerouslySetInnerHTML），
// mermaid 占位容器在挂载后逐个替换为懒加载渲染器；代码块的复制按钮走
// 事件委托（构建期生成的静态按钮，无需逐个挂 React）。
// 外层 content-visibility 跳过长文的屏外渲染成本。

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";
import { useT } from "@/lib/i18n.ts";

export function Prose({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

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

  // 复制代码按钮：构建期生成的是静态 HTML，事件委托一处接管全部代码块
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest(".copy-code");
      const code = button?.closest(".code-card")?.querySelector("pre code");
      if (!(button instanceof HTMLButtonElement) || !code) {
        return;
      }
      const text = code.textContent ?? "";
      const copyText = async (): Promise<boolean> => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // 无权限/非安全上下文：退回选区 + execCommand
          const range = document.createRange();
          range.selectNodeContents(code);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          const ok = document.execCommand("copy");
          selection?.removeAllRanges();
          return ok;
        }
      };
      void copyText().then((ok) => {
        if (!ok) {
          return;
        }
        button.textContent = t("post.copied");
        button.dataset.copied = "true";
        window.setTimeout(() => {
          button.textContent = t("post.copyCode");
          delete button.dataset.copied;
        }, 1600);
      });
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, [t]);

  return (
    <div
      className="prose max-w-none [content-visibility:auto] [contain-intrinsic-size:auto_2000px]"
      dangerouslySetInnerHTML={{ __html: html }}
      ref={ref}
    />
  );
}

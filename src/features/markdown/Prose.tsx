// 文章正文渲染：构建期编译好的 HTML 直接注入（dangerouslySetInnerHTML），
// mermaid 占位容器在挂载后逐个替换为懒加载渲染器；代码块的复制按钮走
// 事件委托（构建期生成的静态按钮，无需逐个挂 React）。
// 曾经的 content-visibility:auto + contain-intrinsic-size 优化已移除：
// Chromium 146+/Edge 153 实测「相关度」不再触发展开，长文在占位高度处被
// 裁断（正文 92% 不可达，复现页在 Electron 41 与 Edge 153 双双确认）。
// 正确性优先 —— 屏外渲染成本本就只省一次性 layout，量级远小于内容不可达。

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Lightbox, type LightboxImage } from "@/components/Lightbox.tsx";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";
import { StlViewer } from "@/features/markdown/StlViewer.tsx";
import { useT } from "@/lib/i18n.ts";

/** KaTeX 样式按需补注：SSR 只对含公式页注入 katex.min.css；客户端从无公式
 *  页 SPA 换页到含公式页时，head 不换 —— 这里检测并补一次 link（幂等）。 */
function ensureKatexStyles() {
  if (document.querySelector("link[data-katex], style[data-katex]")) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/katex.min.css";
  link.dataset.katex = "true";
  document.head.appendChild(link);
}

export function Prose({ html, needsKatex }: { html: string; needsKatex?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ images: LightboxImage[]; index: number } | null>(null);
  // 关闭灯箱后焦点归还给触发图片（键盘/读屏用户回到原位）
  const lastImageRef = useRef<HTMLImageElement | null>(null);
  const t = useT();

  // html 是语义依赖：正文更新后 DOM 里的占位容器换了，需要重新挂载渲染器
  // biome-ignore lint/correctness/useExhaustiveDependencies: 显式依赖 html 以重挂载渲染器
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    if (needsKatex) {
      ensureKatexStyles();
    }
    const roots: Root[] = [];
    for (const el of container.querySelectorAll<HTMLElement>(".mermaid-placeholder")) {
      const root = createRoot(el);
      root.render(<MermaidRenderer chart={el.dataset.chart ?? ""} />);
      roots.push(root);
    }
    for (const el of container.querySelectorAll<HTMLElement>(".stl-placeholder")) {
      const root = createRoot(el);
      root.render(<StlViewer stl={el.dataset.stl ?? ""} />);
      roots.push(root);
    }
    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, [html, needsKatex]);

  // 复制代码按钮：构建期生成的是静态 HTML（初始文案是构建基准语言），
  // 事件委托一处接管全部代码块；水合时先把所有按钮文案校正为当前 UI 语言。
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    for (const button of container.querySelectorAll<HTMLButtonElement>(".copy-code")) {
      if (!button.dataset.copied) {
        button.textContent = t("post.copyCode");
      }
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

  // 图片灯箱：委托点击正文图片（借鉴参考站的全文图片预览）。链接内的
  // 图片也拦截 —— 先看大图，preventDefault 阻止跳转；图片列表点击时收集。
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || !container.contains(target)) {
        return;
      }
      const images = [...container.querySelectorAll("img")];
      const index = images.indexOf(target);
      if (index === -1) {
        return;
      }
      event.preventDefault();
      lastImageRef.current = target;
      setPreview({
        images: images.map((img) => ({ src: img.currentSrc || img.src, alt: img.alt })),
        index,
      });
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, []);

  // dialog 的 close 事件触发（此时顶层已释放）：焦点先归还触发图片，
  // 再卸载灯箱 —— 顺序反了会被带焦点卸载抢回 body。
  const closePreview = () => {
    const image = lastImageRef.current;
    if (image) {
      image.tabIndex = -1;
      image.focus({ preventScroll: true });
    }
    setPreview(null);
  };

  return (
    <>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} ref={ref} />
      {preview && preview.images.length > 0 && (
        <Lightbox images={preview.images} initialIndex={preview.index} onClose={closePreview} />
      )}
    </>
  );
}

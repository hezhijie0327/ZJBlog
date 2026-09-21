// 文章正文渲染：构建期编译好的 HTML 直接注入（dangerouslySetInnerHTML），
// mermaid 占位容器在挂载后逐个替换为懒加载渲染器；代码块的复制按钮走
// 事件委托（构建期生成的静态按钮，无需逐个挂 React）。
// 外层 content-visibility 跳过长文的屏外渲染成本。

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Lightbox, type LightboxImage } from "@/components/Lightbox.tsx";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";
import { useT } from "@/lib/i18n.ts";

export function Prose({ html }: { html: string }) {
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
      <div
        className="prose max-w-none [content-visibility:auto] [contain-intrinsic-size:auto_2000px]"
        dangerouslySetInnerHTML={{ __html: html }}
        ref={ref}
      />
      {preview && preview.images.length > 0 && (
        <Lightbox images={preview.images} initialIndex={preview.index} onClose={closePreview} />
      )}
    </>
  );
}

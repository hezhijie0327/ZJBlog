// 文章正文渲染：构建期编译好的 HTML 直接注入（dangerouslySetInnerHTML），
// mermaid 占位容器在挂载后逐个替换为懒加载渲染器；代码块的复制按钮走
// 事件委托（构建期生成的静态按钮，无需逐个挂 React）。
// 曾经的 content-visibility:auto + contain-intrinsic-size 优化已移除：
// Chromium 146+/Edge 153 实测「相关度」不再触发展开，长文在占位高度处被
// 裁断（正文 92% 不可达，复现页在 Electron 41 与 Edge 153 双双确认）。
// 正确性优先 —— 屏外渲染成本本就只省一次性 layout，量级远小于内容不可达。

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Lightbox, type LightboxItem } from "@/components/Lightbox.tsx";
import { DeckViewer } from "@/features/deck/DeckViewer.tsx";
import { MermaidRenderer } from "@/features/markdown/MermaidRenderer.tsx";
import { StlViewer } from "@/features/markdown/StlViewer.tsx";
import { useT } from "@/lib/i18n.ts";
import { ensureKatexStyles } from "@/lib/katex.ts";

export function Prose({ html, needsKatex }: { html: string; needsKatex?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  // 关闭灯箱后焦点归还给触发元素（键盘/读屏用户回到原位）
  const lastTriggerRef = useRef<HTMLElement | null>(null);
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
      root.render(<MermaidRenderer chart={el.dataset.chart ?? ""} lightbox />);
      roots.push(root);
    }
    // ```marp fence 的嵌入幻灯片（tools/deck.ts 占位结构）：从 DOM 提取构建期
    // 样式与幻灯片 HTML，交给 DeckViewer 重渲染增强版（无 JS 时占位结构本身
    // 就是完整堆叠视图）。锁定文解锁注入的明文同样走这里（html 变化重挂）。
    for (const el of container.querySelectorAll<HTMLElement>(".deck-embed")) {
      const css = el.querySelector("style[data-deck-css]")?.textContent ?? "";
      const body = el.querySelector("[data-deck-content]")?.innerHTML ?? "";
      if (body === "") {
        continue;
      }
      const root = createRoot(el);
      root.render(<DeckViewer css={css} embedded html={body} />);
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
  // html 是语义依赖：加密文解锁后注入的明文里也有构建期按钮，需同样校正。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 显式依赖 html 以重校按钮文案
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
      // baseline 2022 全员支持异步剪贴板（https/localhost 均为安全上下文），
      // 失败（如内嵌 WebView 拒授权）就不出「已复制」反馈 —— 不再保留
      // execCommand 老回退
      navigator.clipboard.writeText(text).then(
        () => {
          button.textContent = t("post.copied");
          button.dataset.copied = "true";
          window.setTimeout(() => {
            button.textContent = t("post.copyCode");
            delete button.dataset.copied;
          }, 1600);
        },
        () => {},
      );
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, [t, html]);

  // 灯箱：委托点击正文图片与 mermaid 图卡（宽图在正文栏受挤，点开灯箱全屏
  // 看 —— SVG 矢量缩放不失真；条目按点击瞬间序列化，与当前主题一致）。
  // 链接内的图片也拦截 —— 先看大图，preventDefault 阻止跳转。
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !container.contains(target)) {
        return;
      }
      // 嵌入幻灯片由 DeckViewer 自管（翻页语义），图片与 mermaid 都不进全文灯箱
      if (target.closest(".deck-embed")) {
        return;
      }
      const image = target.closest("img");
      const mermaid = image ? null : target.closest<HTMLElement>("[data-mermaid-figure]");
      if (!image && !mermaid) {
        return;
      }
      // 画廊 = 全部图片 + 已出图的 mermaid（未进视口的还是占位，无 svg 跳过）；
      // querySelectorAll 按文档序返回混排序列，prev/next 顺一遍全文图元
      const items: LightboxItem[] = [];
      let index = -1;
      for (const node of container.querySelectorAll("img, [data-mermaid-figure]")) {
        if (node.closest(".deck-embed")) {
          continue;
        }
        if (node instanceof HTMLImageElement) {
          if (node === image) {
            index = items.length;
          }
          items.push({ alt: node.alt, kind: "img", src: node.currentSrc || node.src });
        } else {
          const svg = node.querySelector("svg");
          if (!svg) {
            continue;
          }
          if (node === mermaid) {
            index = items.length;
          }
          items.push({
            alt: node.querySelector('[role="img"]')?.getAttribute("aria-label") ?? "",
            html: svg.outerHTML,
            kind: "svg",
          });
        }
      }
      if (index === -1) {
        return;
      }
      event.preventDefault();
      lastTriggerRef.current = image ?? mermaid;
      setPreview({ items, index });
    };
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("click", onClick);
    };
  }, []);

  // dialog 的 close 事件触发（此时顶层已释放）：焦点先归还触发元素，
  // 再卸载灯箱 —— 顺序反了会被带焦点卸载抢回 body。
  const closePreview = () => {
    const trigger = lastTriggerRef.current;
    if (trigger) {
      trigger.tabIndex = -1;
      trigger.focus({ preventScroll: true });
    }
    setPreview(null);
  };

  return (
    <>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} ref={ref} />
      {preview && preview.items.length > 0 && (
        <Lightbox initialIndex={preview.index} items={preview.items} onClose={closePreview} />
      )}
    </>
  );
}

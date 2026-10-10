// 打印管线（家族契约：与 ZJSearch client/zjsearch/src/lib/print.ts 同机制
// 同语义，契约见 DESIGN.md §5.3）：预览脸先上屏（body.print-preview 强制
// 纸面样式，见 styles/print.css），双 rAF 后 window.print() —— 真浏览器里
// 对话框盖在纸面上方；嵌入式 webview 里 print 是静默 no-op（ZJSearch 实测
// 还有 ~1s/~9s 的幽灵 afterprint），纸面可见让这类环境点按钮必有反应，
// 用户自行用浏览器菜单打印或关闭芯片退出。
//
// 打印期间 document.title 换为 zjblog_<safe>（「另存为 PDF」的默认文件名
// 来源），teardown 恢复；afterprint 不拆预览（保存或取消都由用户关闭芯片
// /Esc 收场，同 ZJSearch）。
//
// 深色 mermaid：图表颜色烤进 svg，浅色纸面上会突兀——预览前广播
// blog:print-mermaid-light，MermaidRenderer 以浅色主题就地重渲染；关闭时
// 广播 blog:print-mermaid-restore 按当前主题恢复。外部 Ctrl+P 不走本管线
// （图表保持当前主题，属已知降级）。

const PREVIEW_CLASS = "print-preview";
const MERMAID_LIGHT = "blog:print-mermaid-light";
const MERMAID_RESTORE = "blog:print-mermaid-restore";

export interface PrintPreviewOptions {
  /** 「另存为 PDF」的默认文件名主体（zjblog_<safe>） */
  titleBase: string;
  /** 关闭芯片的 aria-label（调用方携带 i18n 文案） */
  closeLabel: string;
}

/** 打开打印预览脸并触发打印。返回 teardown（组件卸载时调用以防挂残留）。 */
export function startPrintPreview({ titleBase, closeLabel }: PrintPreviewOptions): () => void {
  if (document.documentElement.classList.contains(PREVIEW_CLASS)) {
    return () => {};
  }

  const prevTitle = document.title;
  const prevScroll = window.scrollY;
  const safe =
    titleBase
      .replace(/[/\\:*?"<>|]+/g, "_")
      .trim()
      .slice(0, 64) || "post";
  document.title = `zjblog_${safe}`;
  document.documentElement.classList.add(PREVIEW_CLASS);
  window.scrollTo(0, 0);
  document.dispatchEvent(new CustomEvent(MERMAID_LIGHT));

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "print-close print-hide";
  chip.setAttribute("aria-label", closeLabel);
  chip.textContent = "✕";

  const timers: number[] = [];
  const teardown = (): void => {
    timers.forEach((id) => {
      // 句柄池混装 rAF 与 timeout：两个 clear 各自消化，错配为无害 no-op
      window.cancelAnimationFrame(id);
      window.clearTimeout(id);
    });
    window.removeEventListener("keydown", onKey);
    document.dispatchEvent(new CustomEvent(MERMAID_RESTORE));
    chip.remove();
    document.documentElement.classList.remove(PREVIEW_CLASS);
    document.title = prevTitle;
    window.scrollTo(0, prevScroll);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      teardown();
    }
  };
  chip.addEventListener("click", teardown);
  window.addEventListener("keydown", onKey);
  document.body.append(chip);

  // 给纸面两帧布局再唤起打印对话框；rAF 在遮挡/后台窗格会被饿死，
  // 并联一个 400ms 定时器竞速兜底，once 守卫防双开
  let opened = false;
  const openDialog = (): void => {
    if (opened) {
      return;
    }
    opened = true;
    window.print();
  };
  timers.push(
    window.requestAnimationFrame(() => {
      timers.push(
        window.requestAnimationFrame(() => {
          openDialog();
        }),
      );
    }),
  );
  timers.push(window.setTimeout(openDialog, 400));

  return teardown;
}

// 正文图片灯箱：原生 <dialog> 顶层弹层 —— Esc 原生关闭、模态期焦点困在
// 弹层内；多图时提供上一张/下一张（含 ←/→ 键），点击背板关闭。
// 借鉴 justin3go 的 ImageViewer 交互，零依赖实现（参考站用的 TDesign）。

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, ICON_BTN } from "@/lib/styles.ts";

export interface LightboxImage {
  alt: string;
  src: string;
}

export function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const t = useT();
  const image = images[index];

  // 挂载即模态；所有关闭路径统一走原生 close()（Esc 天然如此），父级经
  // close 事件同步状态 —— 先关弹层（释放顶层、焦点可移出）再卸载组件，
  // 否则带焦点卸载会把焦点抢回 body，无法归还给触发图片。
  // 守卫 open：HMR/重挂载下 effect 重跑时对已打开的 dialog 再 showModal 会抛错。
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  /** 关闭面板（背板/关闭按钮）：交给原生 close()，close 事件驱动父级卸载。 */
  const close = () => dialogRef.current?.close();

  const step = (delta: number) => setIndex((current) => (current + delta + images.length) % images.length);

  // 点击背板关闭：事件坐标落在 dialog 矩形外即背板（面板内点击不受影响）。
  // 键盘触发的 click（Enter/Space）坐标是 (0,0)，永远落在矩形外，先排除，
  // 否则键盘激活按钮会被误判成背板点击而关闭整个灯箱。
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      close();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (images.length < 2) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  };

  if (!image) {
    return null;
  }

  return (
    <dialog
      {...(image.alt ? { "aria-label": image.alt } : {})}
      className={cn(CARD, "lightbox relative mx-auto max-w-[94vw] p-4 sm:p-5")}
      onClick={onDialogClick}
      onKeyDown={onKeyDown}
      ref={dialogRef}
    >
      <div className="flex min-h-9 items-center justify-end gap-2 pb-2">
        {images.length > 1 && (
          <span className="mr-auto font-mono text-xs text-ink-3">
            {index + 1} / {images.length}
          </span>
        )}
        <button aria-label={t("lightbox.close")} className={ICON_BTN} onClick={close} type="button">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <img
        alt={image.alt}
        className="mx-auto max-h-[calc(100dvh-10rem)] max-w-full rounded-lg object-contain"
        src={image.src}
      />
      {images.length > 1 && (
        <>
          <button
            aria-label={t("lightbox.prev")}
            className={cn(ICON_BTN, "absolute left-2 top-1/2 size-10 -translate-y-1/2 bg-bg/90 shadow-card")}
            onClick={() => step(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            aria-label={t("lightbox.next")}
            className={cn(ICON_BTN, "absolute right-2 top-1/2 size-10 -translate-y-1/2 bg-bg/90 shadow-card")}
            onClick={() => step(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </>
      )}
    </dialog>
  );
}

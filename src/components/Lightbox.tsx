// 正文图片灯箱：原生 <dialog> 顶层弹层 —— Esc 原生关闭、模态期焦点困在
// 弹层内；50%–200% 缩放（步进 25%，按钮 / +− 键 / 点击百分比复位），
// 缩放后可在弹层内滚动平移；点击背板关闭。零依赖实现。

import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, ICON_BTN } from "@/lib/styles.ts";

export interface LightboxImage {
  alt: string;
  src: string;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;

const clampZoom = (value: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

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
  const [zoom, setZoom] = useState(1);
  /** 缩放基准：图片按视口约束适配后的尺寸（px），onLoad 时测量。
   *  滚动容器钉死在适配尺寸上 —— 缩放只放大图片、在容器内滚动平移，
   *  否则 dialog 随内容自适应会把整个框一起撑大。 */
  const [fitSize, setFitSize] = useState<{ w: number; h: number } | null>(null);
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

  const step = (delta: number) => {
    setIndex((current) => (current + delta + images.length) % images.length);
    setZoom(1);
  };

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
    if (event.key === "ArrowLeft" || event.key === "-") {
      event.preventDefault();
      if (event.key === "ArrowLeft" && images.length > 1) {
        step(-1);
      } else if (event.key === "-") {
        setZoom((current) => clampZoom(current - ZOOM_STEP));
      }
      return;
    }
    if (event.key === "ArrowRight" || event.key === "+" || event.key === "=") {
      event.preventDefault();
      if (event.key === "ArrowRight" && images.length > 1) {
        step(1);
      } else {
        setZoom((current) => clampZoom(current + ZOOM_STEP));
      }
      return;
    }
    if (event.key === "0") {
      setZoom(1);
    }
  };

  if (!image) {
    return null;
  }

  return (
    <dialog
      {...(image.alt ? { "aria-label": image.alt } : {})}
      className={cn(CARD, "lightbox fixed inset-0 m-auto max-h-[92dvh] max-w-[94vw] p-4 sm:p-5")}
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
        <button
          aria-label={t("lightbox.zoomOut")}
          className={ICON_BTN}
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
          type="button"
        >
          <Minus aria-hidden="true" className="size-4" />
        </button>
        {/* 点击百分比复位 100% */}
        <button
          className="min-w-12 rounded px-1 font-mono text-xs text-ink-2 transition-colors hover:text-ink"
          onClick={() => setZoom(1)}
          type="button"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          aria-label={t("lightbox.zoomIn")}
          className={ICON_BTN}
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
        <button aria-label={t("lightbox.close")} className={ICON_BTN} onClick={close} type="button">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {/* 滚动容器钉死在适配尺寸：缩放后超出部分在容器内滚动平移 */}
      <div
        className="flex max-h-[calc(92dvh-7rem)] justify-center overflow-auto"
        style={fitSize ? { width: fitSize.w, height: fitSize.h } : undefined}
      >
        <img
          alt={image.alt}
          className="m-auto max-w-none shrink-0 rounded-lg"
          onLoad={(event) => {
            const img = event.currentTarget;
            const maxW = dialogRef.current?.clientWidth ?? img.naturalWidth;
            // 与滚动容器的 CSS 上限（92dvh − 7rem 工具条）保持一致
            const maxH = window.innerHeight * 0.92 - 112;
            // 缩放基准 = 图片按弹层约束适配后的尺寸（不超过原尺寸）
            const fit = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
            setFitSize({ w: img.naturalWidth * fit, h: img.naturalHeight * fit });
          }}
          src={image.src}
          style={fitSize ? { width: fitSize.w * zoom } : undefined}
        />
      </div>
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

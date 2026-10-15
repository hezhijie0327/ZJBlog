// 胶带（DESIGN.md §7 纸感装饰）：压在纸边之上的半透明矩形。装饰铁律
// （aria-hidden + pointer-events-none）已内置于 TAPE 片段，宽度 / 透明度
// 由调用方给；构图按纸宽分档——通栏宽纸单条顶中（center），中等纸面双角
// 对压，窄便签单条角压；已被其他纸片叠压的角不再上胶带。传入 `seed`
// （内容字符串）时位置确定性变化——角侧、几 px 漂移、±4..7° 旋转随内容
// 而异，一页钉卡不再像同一个模子刻出来的，同时跨重渲染与 SSR 水合完全
// 稳定（物理契约：永不随机，绝不抖动）。算法是 DESIGN.md §7 的「seed
// 物理规范」——家族唯一权威定义，本实现须与其逐字一致。

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn.ts";
import { TAPE } from "@/lib/styles.ts";

type TapeCorner = "start" | "end" | "center";

// DESIGN.md §7 tapePhysics —— 勿改常量；规范变更先改 DESIGN.md 再两侧同步。
// 位移一律逻辑右移 `>>>`：djb2 结果约半数 ≥ 2³¹，算术右移 `>>` 按 int32
// 符号扩展会算出负偏移，把 inset / rotate 拖出规范值域（2026-10 视觉调试
// 实测翻车，勿回退）。`corner` 指定构图：start/end 角压（双角对压构图由
// 构图指定左右，同一纸条的两条胶带 seed 不同、漂移各异）；center 顶中
// （宽纸构图，translateX 归中后再旋转，drift 只做 ±12px 手感偏移）。
function tapePhysics(seed: string, corner?: TapeCorner): CSSProperties {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  const top = -(6 + (h % 4));
  const rotate = (h % 2 === 0 ? 1 : -1) * (4 + ((h >>> 4) % 4));
  if (corner === "center") {
    const drift = ((h >>> 6) % 5) * 6 - 12;
    return {
      left: `calc(50% + ${drift}px)`,
      top: `${top}px`,
      transform: `translateX(-50%) rotate(${rotate}deg)`,
    };
  }
  const inset = 24 + ((h >>> 2) % 5) * 4;
  const side = corner ?? (h % 2 === 0 ? "start" : "end");
  return side === "start"
    ? { insetInlineStart: `${inset}px`, top: `${top}px`, transform: `rotate(${rotate}deg)` }
    : { insetInlineEnd: `${inset}px`, top: `${top}px`, transform: `rotate(${rotate}deg)` };
}

export function Tape({
  className,
  seed,
  corner,
}: {
  className?: string;
  seed?: string;
  /** 构图：start/end 角压（双角对压由构图指定左右）；center 顶中；省略则角侧随 seed */
  corner?: TapeCorner;
}) {
  return (
    <span aria-hidden="true" className={cn(TAPE, className)} style={seed ? tapePhysics(seed, corner) : undefined} />
  );
}

// 胶带（DESIGN.md §7 纸感装饰）：压在纸边之上的半透明矩形。装饰铁律
// （aria-hidden + pointer-events-none）已内置于 TAPE 片段，宽度 / 透明度
// 由调用方给；两角对压优于单条居中。传入 `seed`（内容字符串）时位置
// 确定性变化——角侧、几 px 漂移、±4..7° 旋转随内容而异，一页钉卡不再
// 像同一个模子刻出来的，同时跨重渲染与 SSR 水合完全稳定（物理契约：
// 永不随机，绝不抖动）。算法是 DESIGN.md §7 的「seed 物理规范」——
// 家族唯一权威定义，本实现须与其逐字一致。

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn.ts";
import { TAPE } from "@/lib/styles.ts";

// DESIGN.md §7 tapePhysics —— 勿改常量；规范变更先改 DESIGN.md 再两侧同步。
// `corner` 强制角侧：双角对压构图（同一纸条的两条胶带 seed 不同、漂移各异）
// 由构图指定左右，seed 只变化该角内的漂移与角度。
function tapePhysics(seed: string, corner?: "start" | "end"): CSSProperties {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  }
  const top = -(6 + (h % 4));
  const inset = 24 + ((h >> 2) % 5) * 4;
  const rotate = (h % 2 === 0 ? 1 : -1) * (4 + ((h >> 4) % 4));
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
  /** 强制角侧——双角对压构图用；单胶带省略则角侧也随 seed */
  corner?: "start" | "end";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(TAPE, className)}
      style={seed ? tapePhysics(seed, corner) : undefined}
    />
  );
}

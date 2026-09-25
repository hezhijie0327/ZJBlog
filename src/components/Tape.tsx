// 胶带（DESIGN.md §7 纸感装饰）：压在纸边之上的半透明矩形。装饰铁律
// （aria-hidden + pointer-events-none）已内置于 TAPE 片段，定位 / 旋转 /
// 透明度由调用方给；两角对压优于单条居中。

import { cn } from "@/lib/cn.ts";
import { TAPE } from "@/lib/styles.ts";

export function Tape({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn(TAPE, className)} />;
}

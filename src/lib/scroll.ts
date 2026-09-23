// 站内锚点滚动（首页 Hero CTA 与故事分镜条共用同一语义）。
// 不走浏览器原生锚点：平滑滚动、hash 用 replaceState 记录（不产生瞬时
// 跳转，也不新增历史条目，返回键仍是路由语义）；焦点跟随目标内容，
// 键盘 / 读屏器才能感知位置变化；reduced-motion 下瞬时到位。

import type { MouseEvent } from "react";
import { isModifiedClick } from "@/lib/link.ts";

/** 平滑滚动到 #id 对应的区块；修饰键点击（新标签页等）交给浏览器默认行为。 */
export function jumpToSection(event: MouseEvent<HTMLAnchorElement>, id: string): void {
  if (isModifiedClick(event)) {
    return;
  }
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  event.preventDefault();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}

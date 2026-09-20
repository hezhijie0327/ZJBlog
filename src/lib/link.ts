/** 链接工具：SPA Link 拦截判断与外链行为。 */

/** 修饰键点击（新标签 / 下载等）不拦截，交给浏览器默认行为。 */
export function isModifiedClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button?: number;
}): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button ?? 0) !== 0;
}

/** 外链统一新标签打开。 */
export function newTabLinkProps(on: boolean | undefined): { target?: string; rel?: string } {
  return on ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

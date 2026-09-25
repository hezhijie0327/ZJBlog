/** 链接工具：SPA Link 拦截判断与外链行为。外链统一在调用处以裸 <a target="_blank"
 *  rel="noopener noreferrer"> 表达（Lightbox/AuthorCard 等先例），不经 Link 组件。 */

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

/** 明暗主题：class 策略（html.dark），偏好存 localStorage，auto 跟随系统。
 *  调色板过渡由 CSS 完成（tokens.css 的 @property 注册 + behaviors.css 的
 *  html transition），这里只负责翻类名、开过渡的 stand-down 窗口和防闪烁
 *  的 pre-paint 内联脚本（预渲染时注入 <head>）。 */

export type ThemeStyle = "auto" | "light" | "dark";

const STORAGE_KEY = "zj-theme";

/** theme-color（浏览器 UI / PWA 标题栏）取页面底色：SSR 输出 light/dark 双
 *  meta（media 查询，auto 模式原生跟随系统）；显式选择时收敛为单枚并随
 *  applyThemeStyle 翻色（PWA 契约见 DESIGN.md §18）。 */
export const THEME_COLOR_LIGHT = "#faf9f6";
export const THEME_COLOR_DARK = "#1b1a18";

/** 收敛 head 里的 theme-color meta 为已解析值：首枚去掉 media、写入实际
 *  底色，其余移除。幂等 —— bootstrap 预paint 与每次翻调色板都走这里。 */
function syncThemeColorMeta(dark: boolean): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const primary = metas.item(0);
  if (!primary) {
    return;
  }
  primary.removeAttribute("media");
  primary.setAttribute("content", dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  metas.forEach((meta, index) => {
    if (index > 0) {
      meta.remove();
    }
  });
}

export function readThemeStyle(): ThemeStyle {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") {
      return value;
    }
  } catch {
    // 隐私模式等 localStorage 不可用的场景按 auto 处理
  }
  return "auto";
}

let paletteAnimTimer: number | undefined;

export function applyThemeStyle(style: ThemeStyle) {
  const dark = style === "dark" || (style === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  /* 真实翻类时打开 ~350ms 的 stand-down 窗口（.zjs-palette-anim）：带私有
     transition-colors 的元素（chips、按钮）否则会追着插值中的 token 跑，
     明显滞后于整页。类名本就一致时不动作；reduced-motion 用户无过渡。 */
  const changing = root.classList.contains("dark") !== dark;
  if (changing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("zjs-palette-anim");
    window.clearTimeout(paletteAnimTimer);
    paletteAnimTimer = window.setTimeout(() => root.classList.remove("zjs-palette-anim"), 350);
  }
  root.classList.toggle("dark", dark);
  // 图标显隐等纯展示逻辑依此属性（CSS 驱动，pre-paint 即正确，无需 JS 状态）
  root.setAttribute("data-theme-mode", style);
  // 浏览器 UI（安装后的 PWA 标题栏）跟随实况调色板
  syncThemeColorMeta(dark);
}

/** auto 模式下实时跟随系统明暗切换。 */
export function watchSystemTheme() {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readThemeStyle() === "auto") {
      applyThemeStyle("auto");
    }
  });
}

/** 订阅暗色状态（html.dark 是唯一事实源，站内切换与系统跟随都会翻它）。
 *  返回退订函数。重主题依赖（giscus iframe / mermaid 重渲染）经此联动，
 *  不要各自再挂 MutationObserver。 */
export function watchThemeDark(onChange: (dark: boolean) => void): () => void {
  const root = document.documentElement;
  const observer = new MutationObserver(() => onChange(root.classList.contains("dark")));
  observer.observe(root, { attributeFilter: ["class"], attributes: true });
  return () => {
    observer.disconnect();
  };
}

/** 预渲染 HTML <head> 内联脚本：首帧前挂好 .dark 与 data-theme-mode，避免明暗/图标闪烁；
 *  显式主题下同步收敛 theme-color meta（auto 留 media 对，原生跟随系统）。 */
export const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem("zj-theme");if(s!=="light"&&s!=="dark")s="auto";var d=s==="dark"||(s==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.setAttribute("data-theme-mode",s);if(s!=="auto"){var m=document.querySelectorAll('meta[name="theme-color"]');if(m.length>0){m[0].removeAttribute("media");m[0].setAttribute("content",d?"${THEME_COLOR_DARK}":"${THEME_COLOR_LIGHT}");for(var i=1;i<m.length;i++)m[i].remove();}}}catch(e){}})();`;

/** 明暗主题：class 策略（html.dark），偏好存 localStorage，auto 跟随系统。
 *  调色板过渡由 CSS 完成（tokens.css 的 @property 注册 + behaviors.css 的
 *  html transition），这里只负责翻类名、开过渡的 stand-down 窗口和防闪烁
 *  的 pre-paint 内联脚本（预渲染时注入 <head>）。 */

export type ThemeStyle = "auto" | "light" | "dark";

const STORAGE_KEY = "zj-theme";

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
}

/** auto 模式下实时跟随系统明暗切换。 */
export function watchSystemTheme() {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readThemeStyle() === "auto") {
      applyThemeStyle("auto");
    }
  });
}

/** 预渲染 HTML <head> 内联脚本：首帧前挂好 .dark，避免明暗闪烁。 */
export const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem("zj-theme");if(s!=="light"&&s!=="dark")s="auto";var d=s==="dark"||(s==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

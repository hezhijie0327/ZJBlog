/** Light/dark theme: class strategy (html.dark), preference stored in localStorage, auto
 *  follows the system. Palette transitions are handled by CSS (@property registration in
 *  tokens.css + the html transition in behaviors.css); this module only flips class names,
 *  opens the transition stand-down window, and provides the anti-flash (FOUC prevention)
 *  pre-paint inline script (injected into <head> at prerender time). */

export type ThemeStyle = "auto" | "light" | "dark";

const STORAGE_KEY = "zj-theme";

/** theme-color (browser UI / PWA title bar) takes the page background: SSR emits both
 *  light/dark metas (media queries; auto mode follows the system natively); with an
 *  explicit choice they collapse to one and flip with applyThemeStyle (PWA contract in
 *  DESIGN.md §18). */
export const THEME_COLOR_LIGHT = "#faf9f6";
export const THEME_COLOR_DARK = "#1b1a18";

/** Collapse the theme-color metas in head to the resolved value: the first drops its
 *  media attribute and gets the actual background color, the rest are removed. Idempotent —
 *  both the pre-paint bootstrap and every palette flip go through here. */
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
    // When localStorage is unavailable (private mode etc.), treat as auto
  }
  return "auto";
}

let paletteAnimTimer: number | undefined;

export function applyThemeStyle(style: ThemeStyle) {
  const dark = style === "dark" || (style === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  /* On a real class flip, open a ~350ms stand-down window (.zjs-palette-anim): elements
     with private transition-colors (chips, buttons) would otherwise chase the interpolating
     tokens and visibly lag the rest of the page. No-op when the class already matches;
     reduced-motion users get no transition. */
  const changing = root.classList.contains("dark") !== dark;
  if (changing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("zjs-palette-anim");
    window.clearTimeout(paletteAnimTimer);
    paletteAnimTimer = window.setTimeout(() => root.classList.remove("zjs-palette-anim"), 350);
  }
  root.classList.toggle("dark", dark);
  // Pure presentational logic such as icon visibility keys off this attribute (CSS-driven,
  // correct from pre-paint, no JS state needed)
  root.setAttribute("data-theme-mode", style);
  // Browser UI (the PWA title bar after install) follows the live palette
  syncThemeColorMeta(dark);
}

/** In auto mode, follow the system light/dark switch in real time. */
export function watchSystemTheme() {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readThemeStyle() === "auto") {
      applyThemeStyle("auto");
    }
  });
}

/** Subscribe to the dark state (html.dark is the single source of truth; both in-site
 *  toggles and system-follow flip it). Returns an unsubscribe function. Heavy theme
 *  dependencies (giscus iframe / mermaid re-render) hook in here — do not attach your own
 *  MutationObserver. */
export function watchThemeDark(onChange: (dark: boolean) => void): () => void {
  const root = document.documentElement;
  const observer = new MutationObserver(() => onChange(root.classList.contains("dark")));
  observer.observe(root, { attributeFilter: ["class"], attributes: true });
  return () => {
    observer.disconnect();
  };
}

/** Inline script for the prerendered HTML <head>: attaches .dark and data-theme-mode before
 *  the first frame to prevent light/dark and icon flashes; under an explicit theme it also
 *  collapses the theme-color meta (auto keeps the media pair and follows the system natively). */
export const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem("zj-theme");if(s!=="light"&&s!=="dark")s="auto";var d=s==="dark"||(s==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.setAttribute("data-theme-mode",s);if(s!=="auto"){var m=document.querySelectorAll('meta[name="theme-color"]');if(m.length>0){m[0].removeAttribute("media");m[0].setAttribute("content",d?"${THEME_COLOR_DARK}":"${THEME_COLOR_LIGHT}");for(var i=1;i<m.length;i++)m[i].remove();}}}catch(e){}})();`;

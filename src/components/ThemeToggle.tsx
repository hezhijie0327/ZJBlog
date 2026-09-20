// 明暗切换按钮：跟随系统 → 亮色 → 暗色 循环。图标显隐走 html[data-theme-mode]
// （SSR/接管前即正确，无闪烁），偏好写入 lib/theme.ts 管理的 localStorage；
// React 状态仅用于 aria-label / title 文案（挂载后从 localStorage 校正一次）。

import { Moon, Sun, SunMoon } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n.ts";
import { ICON_BTN } from "@/lib/styles.ts";
import type { ThemeStyle } from "@/lib/theme.ts";
import { applyThemeStyle, readThemeStyle } from "@/lib/theme.ts";

const NEXT: Record<ThemeStyle, ThemeStyle> = { auto: "light", light: "dark", dark: "auto" };

const LABEL: Record<ThemeStyle, "nav.themeAuto" | "nav.themeLight" | "nav.themeDark"> = {
  auto: "nav.themeAuto",
  light: "nav.themeLight",
  dark: "nav.themeDark",
};

export function ThemeToggle() {
  const t = useT();
  const [mode, setMode] = useState<ThemeStyle>("auto");
  useEffect(() => {
    setMode(readThemeStyle());
  }, []);
  return (
    <button
      aria-label={t(LABEL[mode])}
      className={ICON_BTN}
      onClick={() => {
        const next = NEXT[mode];
        applyThemeStyle(next);
        setMode(next);
      }}
      title={t(LABEL[mode])}
      type="button"
    >
      <SunMoon aria-hidden="true" className="theme-icon theme-icon-auto size-4" />
      <Sun aria-hidden="true" className="theme-icon theme-icon-light size-4" />
      <Moon aria-hidden="true" className="theme-icon theme-icon-dark size-4" />
    </button>
  );
}

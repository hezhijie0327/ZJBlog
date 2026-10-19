// Light/dark toggle: cycles system -> light -> dark. Icon show/hide rides on
// html[data-theme-mode] (correct from SSR/pre-hydration, no flash); the
// preference is written to the localStorage managed by lib/theme.ts; React
// state only feeds the aria-label / title copy (corrected once from
// localStorage after mount).

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

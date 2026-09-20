// 明暗切换按钮：图标显隐走 .dark 类（SSR/接管前即正确，无 JS 状态），
// 偏好写入 lib/theme.ts 管理的 localStorage。

import { Moon, Sun } from "lucide-react";
import { useT } from "@/lib/i18n.ts";
import { ICON_BTN } from "@/lib/styles.ts";
import { applyThemeStyle } from "@/lib/theme.ts";

export function ThemeToggle() {
  const t = useT();
  return (
    <button
      aria-label={t("nav.theme")}
      className={ICON_BTN}
      onClick={() => {
        applyThemeStyle(document.documentElement.classList.contains("dark") ? "light" : "dark");
      }}
      title={t("nav.theme")}
      type="button"
    >
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
    </button>
  );
}

// 页脚：仅版权一行（品牌名随界面语言切换）。

import { useT } from "@/lib/i18n.ts";

export function Footer() {
  const t = useT();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-xs text-ink-3">
          © {currentYear} {t("site.brand")}
        </p>
      </div>
    </footer>
  );
}

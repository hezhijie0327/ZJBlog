// 页脚：仅版权一行。

import { siteConfig } from "@/config/site.ts";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-xs text-ink-3">
          © {currentYear} {siteConfig.copyrightName}
        </p>
      </div>
    </footer>
  );
}

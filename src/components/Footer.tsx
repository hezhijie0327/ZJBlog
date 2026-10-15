// 页脚：版权一行。安装入口在导航右上角（Navigation 的 InstallAppButton，
// beforeinstallprompt 驱动，DESIGN.md §18）—— ZJSearch HeaderActions 同位。

import { siteConfig } from "@/config/site.ts";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        {/* 年份跨年构建/访问会不一致，抑制水合警告（客户端值才是对的）。
            版权持有者取 siteConfig.copyright（个人字标 Zhijie Online，
            不随产品名 ZJBlog 变动）。 */}
        <p className="text-center text-xs text-ink-3" suppressHydrationWarning>
          © {currentYear} {siteConfig.copyright}
        </p>
      </div>
    </footer>
  );
}

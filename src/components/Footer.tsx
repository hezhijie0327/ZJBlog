// 页脚：版权一行；可安装时多一枚「安装 App」图标钮（beforeinstallprompt
// 驱动，DESIGN.md §18）—— 桌面/Android 上地址栏的安装图标太隐蔽，入口
// 收敛到这里。按钮只在事件捕获后出现（SSR 与水合初帧都不渲染，无水合
// 分歧）；iOS Safari 不派发该事件，按钮永不出现，安装走系统「分享 →
// 添加到主屏幕」。

import { MonitorDown } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { promptInstall, watchInstallAvailability } from "@/lib/installPrompt.ts";
import { ICON_BTN } from "@/lib/styles.ts";

function InstallAppButton() {
  const t = useT();
  const [available, setAvailable] = useState(false);
  useEffect(() => watchInstallAvailability(setAvailable), []);
  if (!available) {
    return null;
  }
  return (
    <p className="mb-5 flex justify-center">
      <button
        aria-label={t("footer.installApp")}
        className={cn(ICON_BTN, "border border-line")}
        onClick={() => {
          void promptInstall();
        }}
        title={t("footer.installApp")}
        type="button"
      >
        <MonitorDown aria-hidden="true" className="size-4" />
      </button>
    </p>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        <InstallAppButton />
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

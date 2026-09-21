// OG 分享卡页（/og/，noindex 工具页）：1200×630 固定画布，Shell 对本路由
// 隐藏导航/页脚（见 Shell.tsx 的 bare 分支）。配色与字体全部走设计 token，
// 与站点主题同源 —— 主题调整后重新截图即可同步。
//
// 截图生成 public/og-default.png（构建后任选一种静态服务）：
//   pnpm build && pnpm exec vite preview --port 4173
//   msedge --headless=new --window-size=1200,630 --disable-gpu --hide-scrollbars \
//     --screenshot=public/og-default.png http://127.0.0.1:4173/og/
//
// 文案固定中文基线：这是截图目标，语言必须稳定，不随 UI 语言切换。

import { useEffect } from "react";
import { siteConfig } from "@/config/site.ts";
import { translateFor } from "@/lib/i18n.ts";
import { applyThemeStyle, readThemeStyle } from "@/lib/theme.ts";

export function OgPage() {
  // 文案锁定中文基线（translateFor 直取 zh 词库，不经 UI 语言状态）
  const t = translateFor("zh-CN");

  // OG 卡固定浅色基准：挂载期间压掉 html.dark（分享卡不做暗色变体），
  // 离开页面时按站点主题偏好恢复
  useEffect(() => {
    const root = document.documentElement;
    const force = () => root.classList.remove("dark");
    force();
    const observer = new MutationObserver(force);
    observer.observe(root, { attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      applyThemeStyle(readThemeStyle());
    };
  }, []);
  const host = new URL(siteConfig.url).host;
  return (
    <div
      className="relative flex h-[630px] w-[1200px] flex-col justify-center bg-bg px-24 font-serif text-ink"
      lang="zh-CN"
    >
      <p className="flex items-center gap-3.5 font-mono text-[22px] tracking-[0.28em] text-ink-3">
        <span aria-hidden="true" className="size-3 rounded-full bg-accent-strong" />
        {t("hero.kicker")}
      </p>
      <h1 className="mt-8 text-[108px] font-black leading-tight tracking-tight">{siteConfig.title}</h1>
      <p className="mt-7 border-l-5 border-accent-strong pl-5 text-[34px] italic text-ink-2">{t("hero.motto")}</p>
      <span className="absolute bottom-[72px] left-24 font-mono text-[22px] tracking-[0.2em] text-ink-3">
        ZHIJIE HE
      </span>
      <span className="absolute bottom-[72px] right-24 font-mono text-[26px] text-ink-3">{host}</span>
    </div>
  );
}

// OG share card page (/og/, noindex utility page): fixed 1200×630 canvas; Shell hides the
// navigation/footer for this route (see the bare branch in Shell.tsx). Colors and fonts all go
// through design tokens, sourced from the same place as the site theme — re-screenshot after a
// theme tweak to stay in sync.
//
// Screenshot to produce public/og-default.png (any static server after building):
//   pnpm build && pnpm exec vite preview --port 4173
//   msedge --headless=new --window-size=1200,630 --disable-gpu --hide-scrollbars \
//     --screenshot=public/og-default.png http://127.0.0.1:4173/og/
//
// Copy is pinned to the Chinese baseline: this is the screenshot target, the language must stay
// stable and must not follow the UI language.

import { useEffect } from "react";
import { siteConfig } from "@/config/site.ts";
import { translateFor } from "@/lib/i18n.ts";
import { applyThemeStyle, readThemeStyle } from "@/lib/theme.ts";

export function OgPage() {
  // Copy locked to the Chinese baseline (translateFor reads the zh wordbook directly, bypassing
  // the UI language state)
  const t = translateFor("zh-CN");

  // OG card is pinned to the light baseline: suppress html.dark while mounted (the share card
  // has no dark variant); restore per the site theme preference when leaving the page
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

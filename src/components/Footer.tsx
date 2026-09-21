// 页脚：版权一行 + 站点链接（GitHub / RSS / 支持）。
// RSS 与支持从顶栏下沉至此（顶栏只留高频控制项）；RSS 阅读器同时可经
// head 的 rel=alternate 自动发现订阅源。

import { Link } from "@/components/Shell.tsx";
import { siteConfig } from "@/config/site.ts";
import { useT } from "@/lib/i18n.ts";
import { FOOTER_LINK } from "@/lib/styles.ts";

export function Footer() {
  const t = useT();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-2.5">
          {/* 年份跨年构建/访问会不一致，抑制水合警告（客户端值才是对的） */}
          <p className="text-center text-xs text-ink-3" suppressHydrationWarning>
            © {currentYear} {t("site.brand")}
          </p>
          <nav aria-label={t("footer.links")} className="flex items-center gap-0.5 font-mono text-xs text-ink-3">
            <a className={FOOTER_LINK} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
              GitHub
            </a>
            <span aria-hidden="true" className="px-1">
              ·
            </span>
            <a className={FOOTER_LINK} href="/rss.xml">
              RSS
            </a>
            <span aria-hidden="true" className="px-1">
              ·
            </span>
            <Link className={FOOTER_LINK} href="/support/">
              {t("nav.support")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

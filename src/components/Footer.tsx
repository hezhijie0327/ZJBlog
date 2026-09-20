// 页脚：格言 + 版权 + Cloudflare 网络彩蛋（IP / 后量子加密状态）+ 返回顶部。

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { META } from "@/lib/styles.ts";

interface CFInfo {
  ip: string;
  kex: string;
  warp: string;
  loc: string;
}

const CACHE_KEY = "cf-trace-info";

function readCachedInfo(): CFInfo | null {
  if (typeof window === "undefined") {
    return null;
  }
  const cached = window.sessionStorage.getItem(CACHE_KEY);
  if (!cached) {
    return null;
  }
  try {
    return JSON.parse(cached) as CFInfo;
  } catch {
    window.sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export function Footer() {
  const t = useT();
  const currentYear = new Date().getFullYear();
  // 初始恒为 null（与 SSR 一致，保证 hydration 无缝）；缓存/远取都在挂载后进行
  const [cfInfo, setCfInfo] = useState<CFInfo | null>(null);

  useEffect(() => {
    const cached = readCachedInfo();
    if (cached) {
      setCfInfo(cached);
      return;
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 5000);

    void (async () => {
      try {
        const response = await fetch(`${window.location.origin}/cdn-cgi/trace`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const parsed: Partial<CFInfo> = {};
        for (const line of (await response.text()).split("\n")) {
          const [key, value] = line.split("=");
          if (key && value) {
            if (key === "ip" || key === "kex" || key === "warp" || key === "loc") {
              parsed[key] = value;
            }
          }
        }
        const next: CFInfo = {
          ip: parsed.ip ?? t("footer.unavailable"),
          kex: parsed.kex ?? "unavailable",
          warp: parsed.warp ?? "unknown",
          loc: parsed.loc ?? "unknown",
        };
        setCfInfo(next);
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        setCfInfo(null);
      }
    })();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [t]);

  const encryption =
    cfInfo === null
      ? { text: t("footer.loading"), cls: "text-ink-3" }
      : cfInfo.kex === "X25519MLKEM768"
        ? { text: t("footer.pqProtected"), cls: "text-ok" }
        : cfInfo.kex === "unavailable"
          ? { text: "", cls: "" }
          : { text: t("footer.standard"), cls: "text-ink-3" };

  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* 格言 */}
          <p className="font-serif text-sm text-ink-2">
            {siteConfig.footerMotto.zh}
            <span className="mx-2 text-line">·</span>
            <span className={cn(META, "tracking-wide")}>{siteConfig.footerMotto.en}</span>
          </p>

          {/* 版权 */}
          <p className="text-xs text-ink-3">
            © {currentYear} {siteConfig.author} · {siteConfig.name}
          </p>

          {/* 网络与安全信息（Cloudflare 部署时的彩蛋） */}
          <div className={cn(META, "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]")}>
            <span>
              IP {cfInfo?.ip ?? t("footer.unavailable")}
              {cfInfo && cfInfo.loc !== "unknown" && cfInfo.loc !== "" ? ` · ${cfInfo.loc}` : ""}
            </span>
            {encryption.text && <span className={encryption.cls}>{encryption.text}</span>}
          </div>

          {/* 返回顶部 */}
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            type="button"
          >
            <ArrowUp aria-hidden="true" className="size-3" />
            {t("footer.backToTop")}
          </button>
        </div>
      </div>
    </footer>
  );
}

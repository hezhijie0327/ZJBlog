"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site";
import { ArrowUp } from "lucide-react";

interface FooterProps {
  className?: string;
}

interface CFInfo {
  ip: string;
  kex: string;
  warp: string;
  loc: string;
}

const INITIAL_CF_INFO: CFInfo = {
  ip: "获取中...",
  kex: "loading",
  warp: "unknown",
  loc: "unknown",
};

export default function Footer({ className = "" }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const [cfInfo, setCfInfo] = useState<CFInfo>(() => {
    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem("cf-trace-info");

      if (cached) {
        try {
          return JSON.parse(cached) as CFInfo;
        } catch {
          window.sessionStorage.removeItem("cf-trace-info");
        }
      }
    }

    return INITIAL_CF_INFO;
  });

  useEffect(() => {
    const cacheKey = "cf-trace-info";
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort("timeout");
    }, 5000);

    const updateInfo = (next: CFInfo) => {
      setCfInfo(next);
      window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
    };

    const fetchInfo = async () => {
      try {
        const cfTraceUrl = `${window.location.origin}/cdn-cgi/trace`;
        const response = await fetch(cfTraceUrl, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (response.ok) {
          const text = await response.text();
          const lines = text.split("\n");
          const parsedData: Partial<CFInfo> = {};

          lines.forEach((line) => {
            const [key, value] = line.split("=");
            if (key && value) {
              switch (key) {
                case "ip":
                  parsedData.ip = value;
                  break;
                case "kex":
                  parsedData.kex = value;
                  break;
                case "warp":
                  parsedData.warp = value;
                  break;
                case "loc":
                  parsedData.loc = value;
                  break;
              }
            }
          });

          const next: CFInfo = {
            ip: parsedData.ip || "无法获取",
            kex: parsedData.kex || "unavailable",
            warp: parsedData.warp || "unknown",
            loc: parsedData.loc || "unknown",
          };

          updateInfo(next);
        } else {
          updateInfo({
            ip: "无法获取",
            kex: "unavailable",
            warp: "unknown",
            loc: "unknown",
          });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          updateInfo({
            ip: "无法获取",
            kex: "unavailable",
            warp: "unknown",
            loc: "unknown",
          });
          return;
        }

        console.error("Failed to fetch info from Cloudflare trace:", error);
        updateInfo({
          ip: "无法获取",
          kex: "unavailable",
          warp: "unknown",
          loc: "unknown",
        });
      }
    };

    void fetchInfo();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const getPostQuantumInfo = () => {
    if (cfInfo.kex === "X25519MLKEM768") {
      return { text: "后量子加密保护", cls: "text-ok" };
    } else if (cfInfo.kex === "loading") {
      return { text: "检测中...", cls: "text-ink-3" };
    } else if (cfInfo.kex === "unavailable") {
      return { text: "", cls: "" };
    } else {
      return { text: "标准加密", cls: "text-ink-3" };
    }
  };

  const encryptionInfo = getPostQuantumInfo();

  return (
    <footer
      className={cn("border-t border-line/80 bg-background", className)}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* 格言 */}
          <p className="font-serif text-sm text-ink-2">
            {siteConfig.footerMotto.zh}
            <span className="mx-2 text-line">·</span>
            <span className="font-mono text-xs tracking-wide">
              {siteConfig.footerMotto.en}
            </span>
          </p>

          {/* 版权 */}
          <p className="text-xs text-ink-3">
            © {currentYear} {siteConfig.author} · {siteConfig.name}
          </p>

          {/* 网络和安全信息（Cloudflare 部署时的彩蛋） */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
            <span>
              IP {cfInfo.ip}
              {cfInfo.loc !== "unknown" && cfInfo.loc !== ""
                ? ` · ${cfInfo.loc}`
                : ""}
            </span>
            {encryptionInfo.text && (
              <span className={encryptionInfo.cls}>
                {encryptionInfo.text}
              </span>
            )}
          </div>

          {/* 返回顶部 */}
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowUp className="size-3" />
            返回顶部
          </Link>
        </div>
      </div>
    </footer>
  );
}

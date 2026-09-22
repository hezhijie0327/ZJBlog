// giscus 评论区（GitHub Discussions 驱动）：进视口才挂载 iframe（与
// MermaidRenderer 同一套惰性策略，首屏零请求，审计加载期不注入内容）；
// 明暗跟随站点唯一真源 html.dark，切换时 @giscus/react 经 postMessage
// 同步进 iframe，无需刷新。配置未补齐（siteConfig.giscus.categoryId 为
// 空）时渲染占位卡片，不注入无效 iframe。

import Giscus from "@giscus/react";
import { MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useLocale, useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { CARD } from "@/lib/styles.ts";

export function GiscusComments() {
  const t = useT();
  const locale = useLocale();
  const { href } = useRouter();
  // SPA 换页时 pathname 变化而本组件保持挂载 —— 以 pathname 作为 giscus
  // widget 的 key 强制重挂载，iframe 才会按新路径加载对应讨论
  const pathname = new URL(href, "http://localhost").pathname;
  const containerRef = useRef<HTMLElement>(null);
  // 旧浏览器无 IntersectionObserver 时直接以可见起始，避免在 effect 里同步 setState；
  // 初始化器在 SSR 也会执行，读 DOM 前必须守卫 window
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const { repo, repoId, category, categoryId } = siteConfig.giscus;
  const configured = Boolean(repo && repoId && category && categoryId);

  // 进视口（含 300px 缓冲）才开始挂载
  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  // 主题同步：html.dark 翻转时更新 theme prop，组件内部自行 postMessage
  useEffect(() => {
    if (!visible || !configured) {
      return;
    }
    const root = document.documentElement;
    const observer = new MutationObserver(() => setDark(root.classList.contains("dark")));
    observer.observe(root, { attributeFilter: ["class"], attributes: true });
    return () => observer.disconnect();
  }, [visible, configured]);

  // 自托管主题 CSS（映射站点 token 色板，见 public/giscus-*.css）：
  // giscus 以完整 URL 加载自定义主题，跨域 iframe 必须用绝对地址。
  // window 仅浏览器可用 —— 渲染期触碰会让 SSR 整树崩溃转客户端渲染
  // （.prose 不落盘，正文注入断链，文章页全空），SSR 下取空串即可，
  // iframe 本就只在 visible（仅浏览器可为 true）后挂载。
  const theme = typeof window === "undefined" ? "" : `${window.location.origin}/giscus-${dark ? "dark" : "light"}.css`;

  return (
    <section className="mt-14 border-t border-line pt-8" ref={containerRef}>
      {/* 文章标题是 h1，评论区是次级章节，用 h2 保持层级连续 */}
      <h2 className="mb-6 flex items-center gap-2 font-serif text-lg font-semibold text-ink">
        <MessageSquare aria-hidden="true" className="size-4 text-ink-3" />
        {t("comments.title")}
      </h2>
      {!configured ? (
        <div className={cn(CARD, "px-6 py-8 text-center")}>
          <p className="font-serif text-base font-semibold text-ink">{t("comments.notConfigured")}</p>
          <p className="mt-2 text-sm text-ink-2">{t("comments.notConfiguredBlurb")}</p>
        </div>
      ) : (
        visible && (
          <Giscus
            category={category}
            categoryId={categoryId}
            emitMetadata="0"
            inputPosition="top"
            // key 含路径与明暗：任一变化都整体重挂载 iframe（换文加载对应
            // 讨论；明暗切换加载对应主题 CSS 文件），不依赖跨域 setConfig
            key={`${pathname}-${dark}`}
            lang={locale}
            mapping="pathname"
            reactionsEnabled="1"
            repo={repo}
            repoId={repoId}
            strict="0"
            theme={theme}
          />
        )
      )}
    </section>
  );
}

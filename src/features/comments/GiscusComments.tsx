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
import { CARD } from "@/lib/styles.ts";

/** 透明暗色：iframe 无自带底色，融入站点卡片区；亮态用官方 light。 */
type GiscusTheme = "light" | "transparent_dark";

export function GiscusComments() {
  const t = useT();
  const locale = useLocale();
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

  const theme: GiscusTheme = dark ? "transparent_dark" : "light";

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

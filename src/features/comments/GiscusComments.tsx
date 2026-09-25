// giscus 评论区（GitHub Discussions 驱动）：进视口才挂载 iframe（与
// MermaidRenderer 同一套惰性策略，首屏零请求，审计加载期不注入内容）。
// 配置未补齐（siteConfig.giscus.categoryId 为空）时渲染占位卡片，不注入
// 无效 iframe。
//
// 明暗联动：theme prop 绑定 html.dark（站内切换与系统切换都会翻转），
// prop 变化时 @giscus/react 向 iframe postMessage setConfig，giscus 原地
// 换自托管主题样式表 —— 不重挂 iframe，草稿不丢（同 Justin3go 的
// VitePress 联动方案）。SPA 换页时以 pathname 为 key 强制重挂，iframe
// 才会按新路径加载对应讨论。

import Giscus from "@giscus/react";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { useLocale, useT } from "@/lib/i18n.ts";
import { useRouter } from "@/lib/router.tsx";
import { CARD } from "@/lib/styles.ts";
import { watchThemeDark } from "@/lib/theme.ts";
import { useInView } from "@/lib/useInView.ts";

export function GiscusComments() {
  const t = useT();
  const locale = useLocale();
  const { href } = useRouter();
  // SPA 换页时 pathname 变化而本组件保持挂载 —— 以 pathname 作为 giscus
  // widget 的 key 强制重挂载，iframe 才会按新路径加载对应讨论
  const pathname = new URL(href, "http://localhost").pathname;
  // 进视口（含 300px 缓冲）才开始挂载
  const { ref: containerRef, inView: visible } = useInView<HTMLElement>({ once: true });
  // 站点唯一真源 html.dark 的镜像：初始值在 SSR 也要能算，读 DOM 前守卫 window
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const { repo, repoId, category, categoryId } = siteConfig.giscus;
  const configured = Boolean(repo && repoId && category && categoryId);

  // 主题联动：html.dark 翻转（站内切换或系统切换）→ 更新 theme prop →
  // @giscus/react 内部 postMessage setConfig，iframe 原地换主题样式表
  useEffect(() => watchThemeDark(setDark), []);

  // 自托管主题 CSS（映射站点 token 色板，见 public/giscus-*.css）：giscus
  // 以完整 URL 加载自定义主题，跨域 iframe 必须用绝对地址。window 仅浏览
  // 器可用 —— 渲染期触碰会让 SSR 整树崩溃转客户端渲染（.prose 不落盘，
  // 正文注入断链，文章页全空），SSR 下取空串即可，iframe 本就只在
  // visible（仅浏览器可为 true）后挂载。
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
            // key 只含路径：换页整体重挂以加载对应讨论。明暗走 theme prop
            // 的 postMessage 联动，不进 key —— 切换不重挂 iframe
            key={pathname}
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

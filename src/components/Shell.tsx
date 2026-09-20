// 页面骨架：SPA Link（拦截站内导航）+ 顶部加载进度条 + Shell（导航/主区/页脚）。

import type { MouseEvent, ReactNode } from "react";
import { BackToTop } from "@/components/BackToTop.tsx";
import { Footer } from "@/components/Footer.tsx";
import { Navigation } from "@/components/Navigation.tsx";
import { isModifiedClick, newTabLinkProps } from "@/lib/link.ts";
import { useRouter } from "@/lib/router.tsx";

/** 锚点：站内 URL 走 SPA 导航，其余（外链 / 带扩展名的 /rss.xml 等）走默认行为。 */
export function Link({
  href,
  children,
  className,
  ariaLabel,
  title,
  external,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
  external?: boolean;
  /** 追加的点击回调（如关闭移动端菜单），先于导航逻辑执行 */
  onClick?: () => void;
}) {
  const { navigate } = useRouter();
  const path = href.split("?")[0] ?? href;
  const internal = href.startsWith("/") && !external && !/\.[a-z0-9]+$/i.test(path);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (!internal || isModifiedClick(event)) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  return (
    <a
      className={className}
      href={href}
      onClick={handleClick}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      {...(title ? { title } : {})}
      {...newTabLinkProps(external)}
    >
      {children}
    </a>
  );
}

/** 换页时的顶部进度条（纯装饰，aria-hidden）。 */
function ProgressBar({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      <div className="h-full w-full origin-left bg-accent-strong animate-progress" />
    </div>
  );
}

/** 页面骨架：与迁移前 layout 的结构一致（sticky 导航 + main + 页脚 + 悬浮返回顶部）。 */
export function Shell({ children }: { children: ReactNode }) {
  const { loading } = useRouter();
  return (
    <div className="flex min-h-dvh flex-col">
      <ProgressBar active={loading} />
      <Navigation />
      <main className="flex-1 pb-12">{children}</main>
      <Footer />
      <BackToTop />
    </div>
  );
}

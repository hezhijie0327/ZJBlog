// 详情页返回链接：文章页与项目页共用同一节奏。

import { ArrowLeft } from "lucide-react";
import { Link } from "@/components/Shell.tsx";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-3 transition-colors hover:text-ink"
      href={href}
    >
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      {label}
    </Link>
  );
}

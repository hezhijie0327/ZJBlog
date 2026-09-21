// 「查看全部」右对齐入口：首页两个章节共用。

import { ArrowRight } from "lucide-react";
import { Link } from "@/components/Shell.tsx";

export function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-8 text-right">
      <Link
        className="inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:underline"
        href={href}
      >
        {label}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
    </div>
  );
}

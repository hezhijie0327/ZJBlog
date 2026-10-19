// Right-aligned "view all" entry: shared by the two home page sections.

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

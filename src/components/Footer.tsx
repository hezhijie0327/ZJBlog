// Footer: a single copyright line. The install entry lives at the top-right
// of the navigation (Navigation's InstallAppButton, driven by
// beforeinstallprompt, DESIGN.md §18) -- same spot as ZJSearch HeaderActions.

import { siteConfig } from "@/config/site.ts";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        {/* The year drifts out of sync across year-boundary builds/visits;
            suppress the hydration warning (the client value is the right one).
            The copyright holder comes from siteConfig.copyright (the personal
            wordmark Zhijie Online, unaffected by the product name ZJBlog). */}
        <p className="text-center text-xs text-ink-3" suppressHydrationWarning>
          © {currentYear} {siteConfig.copyright}
        </p>
      </div>
    </footer>
  );
}

// Story bar (home page only, md+): sits in the document flow after the Hero
// and sticks below the top bar (top = navigation height). It rests at the
// bottom of the first screen and sticks once you scroll past; because it is
// in-flow sticky, it naturally releases at the page end with its parent
// container -- it never covers the footer.
// Highlighting uses a rAF-throttled scrollspy: the current section is the one
// intersecting the viewport's 30%-45% decision band.
// IntersectionObserver is not used: the last item (contact) sits right above
// the page end, contact + footer cannot fill the remaining viewport, so even
// scrolled to the bottom it never enters the decision band -- IO only fires
// on crossings and that callback would never come; scroll-driven recalc is
// what allows the "light up the last item at page bottom" fallback.
// Anchor jumps go through lib/scroll.ts's jumpToSection (smooth scroll +
// focus follow).

import { Clapperboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/components/Shell.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { jumpToSection } from "@/lib/scroll.ts";

interface StorySection {
  id: string;
  no: string;
  label: string;
}

export function StoryBar({ sections }: { sections: StorySection[] }) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Section jumps go through lib/scroll.ts's jumpToSection (same semantics as
  // the Hero CTA).

  useEffect(() => {
    const visible = sections
      .map((section) => ({ id: section.id, el: document.getElementById(section.id) }))
      .filter((s): s is { id: string; el: HTMLElement } => s.el !== null);
    const last = visible[visible.length - 1];
    if (!last) {
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      // Page-end fallback: when the document is scrolled to the bottom the
      // band often still holds the previous section, so light up the last
      // item directly
      if (window.scrollY + vh >= document.documentElement.scrollHeight - 1) {
        setActiveId(last.id);
        return;
      }
      const bandTop = vh * 0.3;
      const bandBottom = vh * 0.45;
      // When the band overlaps multiple sections at once, take the later one
      // in document order (preserving the original IO callback's override
      // order)
      let current: string | null = null;
      for (const { id, el } of visible) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= bandBottom && rect.bottom > bandTop) {
          current = id;
        }
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!raf) {
        raf = requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sections]);

  return (
    <nav
      aria-label={t("home.storybar")}
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-40 hidden border-b border-line bg-bg/95 backdrop-blur-md md:block"
    >
      <div className="container mx-auto flex h-11 items-center justify-between gap-4 px-4">
        <span className="flex shrink-0 items-center gap-2 font-mono text-xs tracking-[0.18em] text-ink-3">
          <Clapperboard aria-hidden="true" className="size-3.5" />
          {t("home.storybar")}
        </span>
        <div className="flex items-center gap-1">
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <a
                aria-current={active ? "location" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                  active ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink",
                )}
                href={`#${section.id}`}
                key={section.id}
                onClick={(event) => jumpToSection(event, section.id)}
              >
                <span
                  aria-hidden="true"
                  className={cn("film-number font-mono text-[10px]", active ? "text-accent" : "text-ink-3 opacity-70")}
                >
                  {section.no}
                </span>
                {section.label}
              </a>
            );
          })}
        </div>
        <Link
          className="hidden shrink-0 items-center gap-1 text-xs text-ink-3 transition-colors hover:text-ink lg:flex"
          href="/blogs/"
        >
          {t("nav.blogs")}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  );
}

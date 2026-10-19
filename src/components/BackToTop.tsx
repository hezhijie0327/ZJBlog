// Back to top: floating button in the bottom-right corner that appears after
// scrolling past a threshold. Stays in the DOM permanently and toggles via
// opacity transition -- conditional unmount would make the button "blink away"
// with no exit animation.

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n.ts";

const SHOW_AFTER = 400;

export function BackToTop() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER);
    };
    // Shell persists across pages and SPA navigation keeps the scroll
    // position, so sync once on mount
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <button
      aria-hidden={!visible}
      aria-label={t("misc.backToTop")}
      className={`fixed right-6 bottom-6 z-40 grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-pop transition-all duration-200 hover:text-accent ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
      }}
      tabIndex={visible ? 0 : -1}
      type="button"
    >
      <ArrowUp aria-hidden="true" className="size-5" />
    </button>
  );
}

// In-viewport detection (shared by Giscus / Mermaid / STL lazy mounting etc.): an
// IntersectionObserver wrapper. once mode latches to true after the first trigger (heavy
// dependencies load only once); by default it keeps tracking enter/leave.
// The SSR initial value is always false — the first frame mounts no heavy dependency,
// matching the hydration contract.

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Viewport expansion buffer (same as IntersectionObserver rootMargin) */
  rootMargin?: string;
  /** Stop tracking after the first entry (for lazily mounting heavy dependencies) */
  once?: boolean;
}

export function useInView<T extends Element>({ rootMargin = "300px", once = false }: UseInViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || (once && inView)) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, once, rootMargin]);

  return { ref, inView };
}

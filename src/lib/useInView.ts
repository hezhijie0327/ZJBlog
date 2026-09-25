// 进视口检测（Giscus / Mermaid / STL 懒挂载等共用）：IntersectionObserver
// 封装。旧浏览器无 IO 时直接视为可见，避免在 effect 里同步 setState。
// once 模式触发后即定格 true（重依赖只加载一次）；默认持续跟踪进出。

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** 视口外扩缓冲（同 IntersectionObserver rootMargin） */
  rootMargin?: string;
  /** 首次进入后不再跟踪（懒挂载重依赖用） */
  once?: boolean;
}

export function useInView<T extends Element>({ rootMargin = "300px", once = false }: UseInViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));

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

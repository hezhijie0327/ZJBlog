// UI 文案字典（i18n）：英文（en.ts）是基准，其他 locale 逐键回退 EN。
// 新增语言只需两步：
//   1. 新建 ./i18n/<tag>.ts，导出 Record<StringKey, string>（Partial 亦可）
//   2. 在下方 CATALOGS 注册
// UI 语言可切换：无本地偏好时首访按浏览器主语言归一（简中 → zh-CN，其余
// 一律 → en），SSR/预渲染基准为 zh-CN；偏好存 localStorage，由 app.tsx 挂载
// 后校正并在导航栏切换。内容（frontmatter/正文）不随 UI 语言翻译，保持作者原文。

import { createContext, useContext, useMemo } from "react";
import { EN, type StringKey } from "@/lib/i18n/en.ts";
import { ZH_CN } from "@/lib/i18n/zh-CN.ts";

export type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

/** UI 语言。 */
export type UiLocale = "zh-CN" | "en";

const LOCALE_STORAGE_KEY = "zj-locale";

/** 读取用户语言偏好；无存储时首访按浏览器主语言归一（简中浏览器 → zh-CN，
 *  其余一律 → en），无法判定回退 zh-CN（与预渲染一致）。 */
export function readLocalePreference(): UiLocale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "zh-CN") {
      return stored;
    }
  } catch {
    // 隐私模式等存储不可用时按浏览器语言判定
  }
  const primary = navigator.language ?? navigator.languages?.[0];
  return primary ? themeLocaleTag(primary) : "zh-CN";
}

export function storeLocalePreference(locale: UiLocale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 隐私模式等存储不可用时静默降级：本次会话内仍然生效
  }
}

/** 词库按 locale tag 注册；文件名即 tag。 */
const CATALOGS: Record<string, Partial<Record<StringKey, string>>> = {
  en: EN,
  "zh-CN": ZH_CN,
};

/** 把任意 BCP-47 tag 归一到我们发布的词库：zh* 一律 → zh-CN（繁中暂用简中
 *  词库，不应让繁中用户落到英文），其余 → en。 */
function themeLocaleTag(locale: string): UiLocale {
  return locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

interface I18nContextValue {
  locale: UiLocale;
  /** 切换 UI 语言（zh-CN ↔ en）并持久化。 */
  switchLocale: () => void;
}

export const I18nContext = createContext<I18nContextValue>({ locale: "zh-CN", switchLocale: () => {} });

/** 当前 UI locale tag。 */
export function useLocale(): UiLocale {
  return useContext(I18nContext).locale;
}

/** UI 语言切换。 */
export function useLocaleSwitch(): () => void {
  return useContext(I18nContext).switchLocale;
}

export function useT(): Translate {
  const locale = useContext(I18nContext).locale;
  // 记忆化保证 t 的引用稳定 —— 调用方把它放进 effect deps 不会反复触发
  return useMemo(() => translateFor(locale), [locale]);
}

/** 非 React 场景（SSR 文档头 / document.title）使用的无上下文翻译。 */
export function translateFor(locale: string): Translate {
  const catalog = CATALOGS[themeLocaleTag(locale)] ?? EN;
  return (key, params) => {
    let text: string = catalog[key] ?? EN[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

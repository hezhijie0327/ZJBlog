// UI 文案字典（i18n）：英文（en.ts）是基准，其他 locale 逐键回退 EN。
// 结构对齐 ZJSearch —— 新增语言只需两步：
//   1. 新建 ./i18n/<tag>.ts，导出 Record<StringKey, string>（Partial 亦可）
//   2. 在下方 CATALOGS 注册，并让 themeLocaleTag() 能解析到该 tag
// 站点当前单语言（zh-CN），locale 由页面 payload 的 globals.locale 携带。

import { createContext, useContext, useMemo } from "react";
import { EN, type StringKey } from "@/lib/i18n/en.ts";
import { ZH_CN } from "@/lib/i18n/zh-CN.ts";

export type { StringKey };
export type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

/** 词库按 locale tag 注册；文件名即 tag。 */
const CATALOGS: Record<string, Partial<Record<StringKey, string>>> = {
  en: EN,
  "zh-CN": ZH_CN,
};

type CatalogTag = keyof typeof CATALOGS;

/** 把任意 BCP-47 tag 归一到我们发布的词库（zh* 简中 → zh-CN，其余 → en）。 */
function themeLocaleTag(locale: string): CatalogTag {
  const tag = locale.toLowerCase();
  if (tag.startsWith("zh") && !tag.includes("hant")) {
    return "zh-CN";
  }
  return "en";
}

export const I18nContext = createContext<string>("en");

/** 当前 UI locale tag。 */
export function useLocale(): string {
  return useContext(I18nContext);
}

export function useT(): Translate {
  const locale = useContext(I18nContext);
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

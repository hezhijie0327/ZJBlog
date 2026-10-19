// UI copy dictionaries (i18n): English (en.ts) is the baseline; other locales fall back
// to EN key by key. Adding a language takes two steps:
//   1. Create ./i18n/<tag>.ts exporting Record<StringKey, string> (Partial is fine)
//   2. Register it in CATALOGS below
// The UI language is switchable: with no stored preference, first visits normalize by the
// browser's primary language (Simplified Chinese → zh-CN, everything else → en); the
// SSR/prerender baseline is zh-CN. The preference lives in localStorage, is corrected by
// app.tsx after mount, and can be switched in the navigation bar. Content
// (frontmatter/body) is not translated with the UI language; it keeps the author's
// original text.

import { createContext, useContext, useMemo } from "react";
import { EN, type StringKey } from "@/lib/i18n/en.ts";
import { ZH_CN } from "@/lib/i18n/zh-CN.ts";

type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

/** UI language. */
export type UiLocale = "zh-CN" | "en";

const LOCALE_STORAGE_KEY = "zj-locale";

/** Read the user's language preference; with no stored value, first visits normalize by
 *  the browser's primary language (Simplified-Chinese browsers → zh-CN, everything else
 *  → en), falling back to zh-CN when undetectable (consistent with prerender). */
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
    // When storage is unavailable (private mode etc.), decide by browser language
  }
  const primary = navigator.language ?? navigator.languages?.[0];
  return primary ? themeLocaleTag(primary) : "zh-CN";
}

export function storeLocalePreference(locale: UiLocale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Silent degradation when storage is unavailable (private mode etc.): still takes effect for this session
  }
}

/** Wordbooks are registered by locale tag; the file name is the tag. */
const CATALOGS: Record<string, Partial<Record<StringKey, string>>> = {
  en: EN,
  "zh-CN": ZH_CN,
};

/** Normalize any BCP-47 tag onto the wordbooks we ship: zh* always → zh-CN (Traditional
 *  Chinese temporarily uses the Simplified wordbook; Traditional users should not land on
 *  English), everything else → en. */
function themeLocaleTag(locale: string): UiLocale {
  return locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

interface I18nContextValue {
  locale: UiLocale;
  /** Switch the UI language (zh-CN ↔ en) and persist. */
  switchLocale: () => void;
}

export const I18nContext = createContext<I18nContextValue>({ locale: "zh-CN", switchLocale: () => {} });

/** Current UI locale tag. */
export function useLocale(): UiLocale {
  return useContext(I18nContext).locale;
}

/** UI language switch. */
export function useLocaleSwitch(): () => void {
  return useContext(I18nContext).switchLocale;
}

export function useT(): Translate {
  const locale = useContext(I18nContext).locale;
  // Memoization keeps t's reference stable — callers putting it into effect deps won't re-trigger repeatedly
  return useMemo(() => translateFor(locale), [locale]);
}

/** Context-free translation for non-React contexts (SSR document head / document.title). */
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

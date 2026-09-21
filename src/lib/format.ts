/** 日期格式化。站点当前为单语言（zh-CN），i18n 多语言落地时按 locale 分派。 */

// 等宽紧凑日期：2024/12/21
// 按日历字段直接拆分（frontmatter 日期无时区语义，走 Date UTC 解析会在
// UTC 以西时区把日期显示成前一天）
export function formatDateISO(date: string): string {
  const parts = date.slice(0, 10).split("-");
  const y = Number.parseInt(parts[0] ?? "", 10);
  const m = Number.parseInt(parts[1] ?? "", 10);
  const day = Number.parseInt(parts[2] ?? "", 10);
  if (!y || !m || !day) {
    return date;
  }
  return `${y}/${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

/** 本地化日期（评论区等客户端场景；GitHub 返回的是带时区的 ISO 时间戳）。 */
export function formatDateLocale(iso: string, locale: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

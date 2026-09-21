/** 日期格式化。列表 / 归档统一等宽紧凑格式（按日历字段拆分，不走 Date
 *  时区解析 —— frontmatter 日期无时区语义，UTC 解析会在 UTC 以西时区把
 *  日期显示成前一天）。 */

// 等宽紧凑日期：2024/12/21
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

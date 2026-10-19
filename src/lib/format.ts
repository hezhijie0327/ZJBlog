/** Date formatting. Lists / archives share one mono compact format (split by calendar
 *  fields, no Date timezone parsing — frontmatter dates carry no timezone semantics;
 *  UTC parsing would show the previous day for timezones west of UTC). */

// Mono compact date: 2024/12/21
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

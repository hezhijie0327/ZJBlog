/** 日期格式化。站点当前为单语言（zh-CN），i18n 多语言落地时按 locale 分派。 */

// 中文长日期：2024年12月21日
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 等宽紧凑日期：2024/12/21
export function formatDateISO(date: string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

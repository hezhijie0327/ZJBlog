import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 中文长日期：2024年12月21日
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 等宽紧凑日期：2024/12/21
export function formatDateISO(date: string): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

// 从链接提取展示用域名（github.com），解析失败返回 undefined
export function hostOf(link?: string): string | undefined {
  if (!link) return undefined
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

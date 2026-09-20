import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** 组合类名；与设计片段（lib/styles.ts）配套使用，冲突时后者胜出。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combine class names; designed to pair with the design fragments (lib/styles.ts) — later arguments win on conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

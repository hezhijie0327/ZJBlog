/**
 * 设计语言类片段单一来源（ZJSearch 的 lib/styles.ts 约定）
 *
 * 重复出现的 Tailwind 组合一律收拢到这里，用 className={FRAGMENT} 消费；
 * 需要覆盖时用 cn(FRAGMENT, "覆盖类")，让 tailwind-merge 处理冲突。
 * 新 UI 先找这里，没有再新增片段，不要在组件里裸写长串。
 */

/** 圆形图标按钮（导航栏 / 页脚 / 操作区通用） */
export const ICON_BTN =
  "grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

/** 卡片容器：细边框 + 表面底 + 暖色浅阴影 */
export const CARD = "rounded-2xl border border-line bg-surface shadow-card";

/** 卡片容器 + 悬停加深阴影 */
export const CARD_HOVER = `${CARD} transition-shadow hover:shadow-pop`;

/** 紧凑列表容器（分隔行式） */
export const LIST_CONTAINER = "divide-y divide-line/70 rounded-2xl border border-line bg-surface";

/** 主操作按钮（金黄底胶囊） */
export const BTN_PRIMARY =
  "inline-flex h-10 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop";

/** 次操作按钮（描边胶囊） */
export const BTN_OUTLINE =
  "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2";

/** 标签胶囊 */
export const CHIP = "inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2";

/** 等宽小号标签胶囊（键盘提示 / 类型标记） */
export const MONO_CHIP = `${CHIP} font-mono text-[10px]`;

/** 等宽元信息文字（日期 / 计数 / 键盘提示） */
export const META = "font-mono text-xs text-ink-3";

/** 页面级 section 外壳（容器 + 统一纵向节奏） */
export const SECTION = "container mx-auto px-4 py-14 sm:py-20";

/** 隐藏滚动条但保留滚动能力（内滚动容器用） */
export const SCROLLBAR_NONE = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

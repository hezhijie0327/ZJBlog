/**
 * Single source of truth for design-language class fragments.
 *
 * Recurring Tailwind combinations must be gathered here and consumed via
 * className={FRAGMENT}; when overriding, use cn(FRAGMENT, "override classes") and let
 * tailwind-merge resolve conflicts. Look here first for new UI and only add a fragment
 * when missing — never hand-write long class strings inside components.
 */

/** Round icon button (shared by navigation bar / footer / action areas) */
export const ICON_BTN =
  "grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

/** Card container: hairline border + surface background + soft warm shadow */
export const CARD = "rounded-2xl border border-line bg-surface shadow-card";

/** Card container + deepened shadow on hover */
export const CARD_HOVER = `${CARD} transition-shadow hover:shadow-pop`;

/** Divider-row list (no bordered shell; callers compose CARD + DIVIDE_LIST for a card shell) */
export const DIVIDE_LIST = "divide-y divide-line/70";

/** Compact list row (home project rows and post rows share the same rhythm; callers compose CARD + DIVIDE_LIST for a card shell) */
export const LIST_ROW =
  "group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:gap-6 sm:px-6";

/** Primary action button (gold pill) */
export const BTN_PRIMARY =
  "inline-flex h-10 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop";

/** Secondary action button (outlined pill) */
export const BTN_OUTLINE =
  "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2";

/** Torn-edge paper strip button (borrowed from justin3go's paper-strip entry; pairs with
 * the global .paper-strip torn-edge background): the paper color is injected via
 * [--strip:…], slightly tilted, lifted straight on hover. */
export const PAPER_STRIP =
  "paper-strip inline-flex h-10 items-center gap-2 px-5 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:rotate-0 active:translate-y-0";

/** Tag chip */
export const CHIP = "inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2";

/** Small mono tag chip (keyboard hints / type markers) */
export const MONO_CHIP = `${CHIP} font-mono text-xs`;

/** Mono metadata text (dates / counts / keyboard hints) */
export const META = "font-mono text-xs text-ink-3";

/** Eyebrow: small mono uppercase spaced label used for English accents next to headings
 *  and for group sub-headings. Informational text has a 12px font-size floor (DESIGN.md
 *  §4): eyebrows are decorative but also carry section names. */
export const EYEBROW = "font-mono text-xs uppercase tracking-[0.2em] text-ink-3";

/** Ghost date watermark (shared by the Archives year rows and PostList post rows, same
 *  language as §7): hollow-outlined large mono digits (hollow-text), purely decorative so
 *  it must be aria-hidden; positional tweaks are applied by the consumer via cn (the
 *  parent needs overflow-x-clip to prevent small-screen overflow). */
export const GHOST_DATE =
  "hollow-text pointer-events-none absolute -top-5 right-0 select-none whitespace-nowrap font-mono text-[4.5rem] font-bold leading-none sm:-top-6 sm:text-[5.5rem]";

/** Tape (DESIGN.md §7 paper-feel decoration): a translucent gold rectangle pressed over
 *  the paper edge; positioning / rotation / opacity come from the caller (composition is
 *  tiered by paper width: wide paper gets a single strip top-center, medium sheets get
 *  two corners pressed from opposite sides, narrow notes get a single corner strip — the
 *  corner being overlapped gets no tape) */
export const TAPE = "pointer-events-none absolute z-10 h-6 bg-accent-soft";

/** Page-level section shell (container + uniform vertical rhythm) */
export const SECTION = "container mx-auto px-4 py-14 sm:py-20";

/** Detail-page section shell (tighter rhythm for body pages) */
export const SECTION_DETAIL = "container mx-auto px-4 py-12 sm:py-16";

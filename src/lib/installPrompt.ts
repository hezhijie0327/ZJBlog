// Capturing and consuming beforeinstallprompt (PWA install entry, DESIGN.md §18).
//
// The event fires very early in page load, possibly before React hydration — the listener
// is attached at module import time and the event is stashed in a module slot; the UI
// subscribes via watchInstallAvailability after mounting. The event is single-use: once
// prompt() consumes it, the slot is cleared. iOS Safari never fires this event — UI
// depending on it never appears, and installation goes through the system
// "Share → Add to Home Screen", so no special-casing is needed.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Session-level silence after the user dismisses (forgotten when the tab closes; the next visit may ask again). */
const DISMISS_KEY = "zj-install-dismissed";

let stashed: BeforeInstallPromptEvent | undefined;
let installed = false;
const watchers = new Set<(available: boolean) => void>();

/** Installable = event in hand, not inside a standalone shell (already installed on this device), and not dismissed this session. */
function available(): boolean {
  if (!stashed || installed) {
    return false;
  }
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return false;
  }
  try {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      return false;
    }
  } catch {
    // storage unavailable (private mode etc.) — offer anyway
  }
  return true;
}

function sync(): void {
  const current = available();
  for (const watcher of watchers) {
    watcher(current);
  }
}

if (typeof window !== "undefined") {
  // preventDefault: suppress the browser's built-in install UI (banner-style prompts
  // beyond the address-bar icon); the entry point converges onto our own button
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    stashed = event as BeforeInstallPromptEvent;
    sync();
  });
  window.addEventListener("appinstalled", () => {
    stashed = undefined;
    installed = true;
    try {
      sessionStorage.removeItem(DISMISS_KEY);
    } catch {
      // Best-effort button state when storage is unavailable
    }
    sync();
  });
}

/** Subscribe to the installable state. Invoked immediately with the current value on registration; returns an unsubscribe function. */
export function watchInstallAvailability(onChange: (available: boolean) => void): () => void {
  watchers.add(onChange);
  onChange(available());
  return () => {
    watchers.delete(onChange);
  };
}

/** Pop the browser's native install prompt and return the user's choice. The event is
 *  consumed once: the slot is cleared regardless of outcome, and a dismissal additionally
 *  records session-level silence (after a browser-side dismissal the event won't re-fire
 *  this session anyway). */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!stashed) {
    return "unavailable";
  }
  await stashed.prompt();
  const { outcome } = await stashed.userChoice;
  if (outcome === "dismissed") {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable — it will still be offered when the next event fires
    }
  }
  stashed = undefined;
  sync();
  return outcome;
}

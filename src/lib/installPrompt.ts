// beforeinstallprompt 的捕获与消费（PWA 安装入口，DESIGN.md §18）。
//
// 事件在页面加载极早期派发，可能早于 React 水合 —— 监听在模块导入时就挂
// 上，事件存进模块槽；UI 挂载后经 watchInstallAvailability 订阅取用。事件
// 是一次性的：prompt() 消费后即失效清槽。iOS Safari 不派发该事件 —— 依赖
// 它的 UI 永不出现，安装走系统「分享 → 添加到主屏幕」，无需特判。

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** 用户拒绝后的会话级静默（关标签即忘，下次访问可再问）。 */
const DISMISS_KEY = "zj-install-dismissed";

let stashed: BeforeInstallPromptEvent | undefined;
let installed = false;
const watchers = new Set<(available: boolean) => void>();

/** 可安装 = 事件在手，且不在 standalone 壳里（本机已装），且本会话没拒绝过。 */
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
    // storage 不可用（隐私模式等）—— 照常提供
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
  // preventDefault：压掉浏览器自带的安装 UI（地址栏图标之外的横幅类提示），
  // 入口统一收敛到我们自己的按钮
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
      // 存储不可用时按钮态是尽力而为
    }
    sync();
  });
}

/** 订阅「可安装」状态。注册时立即回填当前值，返回退订函数。 */
export function watchInstallAvailability(onChange: (available: boolean) => void): () => void {
  watchers.add(onChange);
  onChange(available());
  return () => {
    watchers.delete(onChange);
  };
}

/** 弹出浏览器原生安装框，返回用户选择。事件一次性消费：无论结果都清槽，
 *  拒绝另记会话级静默（浏览器侧拒绝后本次会话也不会再派发）。 */
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
      // 存储不可用 —— 下次事件派发时仍会提供
    }
  }
  stashed = undefined;
  sync();
  return outcome;
}

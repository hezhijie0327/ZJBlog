# DESIGN.md — ZJ 设计系统（品牌基座）

> ZJ 产品家族的统一设计语言与工程规范。第一个产品是 **ZJSearch**，本站（治杰 Online 博客）是其同构实现，后续衍生产品一律以本文档为设计/工程契约，保证「一眼同源」。
>
> 基准源：`~/searxng/client/zjsearch`（产品实现）；本仓库是第二实现，二者 token 与命名保持同步。

---

## 1. 设计原则

1. **暖纸墨金**：暖纸底 × 墨字 × 琥珀金强调 —— 纸感、低刺眼、高辨识度。
2. **内容优先**：界面退后，正文站前；装饰只用「编号 + 细线 + 留白」表达。
3. **零 webfont**：全部系统字体栈。无字体下载、无布局抖动、无性能税。
4. **快**：预渲染 + 惰性取数，任何交互不等待任何大依赖。
5. **克制**：动效只出现在首屏入场与状态切换，从不为装饰而动。

## 2. 色彩体系

全部颜色走 CSS 变量（`src/styles/tokens.css`），以 `<color> @property` 注册 —— 明暗切换时变量本身插值，整页交叉淡化。

| Token | 浅色 | 深色 | 语义 |
|---|---|---|---|
| `--bg` | `#faf9f6` | `#1b1a18` | 页面底色 |
| `--surface` | `#ffffff` | `#232120` | 卡片/面板 |
| `--surface-2` | `#f1efe8` | `#2c2a27` | 悬停底/次级表面 |
| `--line` | `#e6e2d7` | `#38342f` | 细线/描边 |
| `--ink` | `#201d17` | `#eceae4` | 主文字 |
| `--ink-2` | `#6b675c` | `#a8a399` | 次级文字 |
| `--ink-3` | `#716c61` | `#9b958a` | 弱化文字（≥4.5:1） |
| `--accent` | `#8c6800` | `#fec843` | **文字强调**（链接/chips，AA 达标） |
| `--accent-hover` | `#7a5c00` | `#ffd76b` | 文字强调悬停 |
| `--accent-strong` | `#f5c84c` | `#fec843` | **填充强调**（主按钮底/进度条） |
| `--accent-soft` | `#faf0cf` | `#3a3320` | 强调浅底（图标圆盘） |
| `--accent-contrast` | `#241d0e` | `#241d0e` | 填充强调上的文字（必须） |
| `--highlight-bg` | `#fde68a` | `#4a4020` | 高亮/选区 |
| `--ok / --warning / --danger` | 绿/橙/红 | 亮化 | 状态色 |
| `--shadow-card / --shadow-pop` | 暖色阴影 | 加深 | 卡片 / 弹层 |

**硬性规则**
- 禁止裸写 hex / Tailwind 调色板（`text-gray-*` 等），一切走 token；Tailwind 映射见 `@theme inline`（`bg-surface`、`text-ink-2`、`border-line`、`bg-accent-strong`、`text-accent`、`text-ok`、`shadow-card`…）。
- `--accent` 是**文字**强调色；`--accent-strong` 只做**填充**，其上文字必须是 `--accent-contrast`。
- `--ink-3` 及以上弱化文字对一切表面保持 ≥ 4.5:1（AA）。
- 暗色仅允许通过 token 生效（`.dark` class 策略，`@custom-variant dark`）；禁止 `dark:` 下散落硬编码色值（图标显隐 `dark:hidden/dark:block` 除外）。

**产品级扩展**（博客）：`--code-bg/--code-fg`（暖黑代码块）与 `--font-serif`，已注册进同一 @property/主题体系，属文档化的合法扩展；新扩展照此办理。

## 3. 字体（零 webfont）

| 栈 | 变量 | 用途 |
|---|---|---|
| sans | `--font-sans` | 界面（导航、按钮、卡片正文） |
| serif | `--font-serif` | 标题与文章正文（宋体族；Windows 回退 SimSun，macOS 回退 Songti） |
| mono | `--font-mono` | 编号、日期、英文小标签、代码 |

引入 webfont 前必须先过 Lighthouse 门禁评估（历史教训：webfont 曾致 CSS 276KB + perf 91）。

## 4. 形状与节奏

- **圆角**：按钮/图标钮 `rounded-full`；卡片 `rounded-2xl`；小件 `rounded-lg/xl`。
- **阴影**：卡片 `shadow-card`，弹层/悬停 `shadow-pop`（都是暖色调）。
- **节奏**：页面级 section 统一用 `SECTION` 片段（`container mx-auto px-4 py-14 sm:py-20`）；长文容器 `max-w-3xl`。

## 5. 动效

| 场景 | 动效 |
|---|---|
| 首屏入场 | `animate-fade-up` + `[animation-delay:Nms]` 阶梯 |
| 悬停 | 仅 `transition-colors` / `transition-shadow` |
| 明暗切换 | 整页交叉淡化（@property 插值）+ 350ms stand-down 窗口（`zjs-palette-anim`） |
| 换页 | 顶部 2px `animate-progress` 进度条 |

全局尊重 `prefers-reduced-motion`（behaviors.css 一律 0.01ms 收掉）。

## 6. 组件片段（`lib/styles.ts`）

重复组合一律收拢为 SCREAMING_SNAKE 常量，`className={FRAGMENT}` 消费，覆盖用 `cn(FRAGMENT, "覆盖类")`：

`ICON_BTN`（36px 圆形图标钮）· `CARD` / `CARD_HOVER` · `LIST_CONTAINER` · `BTN_PRIMARY` / `BTN_OUTLINE` · `CHIP` / `MONO_CHIP` · `META`（等宽元信息）· `SECTION` · `SCROLLBAR_NONE`

新 UI **先找片段，没有再新增**，禁止在组件里裸写长串类名。

## 7. 页面骨架

```
Shell（min-h-dvh 纵向 flex）
├── ProgressBar        # 换页顶部进度条（loading 时）
├── Navigation         # sticky 毛玻璃 h-14：品牌区 / 链接组(active 下划线+aria-current) / 搜索·主题·RSS·GitHub / 移动端抽屉
├── <main>             # 页面内容（每页一个语义区块）
├── Footer             # 版权一行
└── BackToTop          # 右下角悬浮返回顶部（滚动超过 400px 出现）
```

- 图标按钮必须有 `aria-label`；当前导航项 `aria-current="page"`；全局 `:focus-visible` 焦点环在 base.css。
- 404 与空状态同构：图标圆盘（`accent-soft` 底）+ 标题 + 灰字说明 + 一个胶囊动作。

## 8. 工程规范（命名法）

```
src/
├── main.tsx / app.tsx      # 启动引导 + Provider 树 + payload 分发
├── pages/                  # *Page.tsx（PascalCase）+ lazyPages.ts 按需加载
├── features/<域>/          # 领域特性（组件 + 就近 api/hook，kebab-case 辅助模块）
├── components/             # 通用组件，PascalCase.tsx
├── lib/                    # 领域无关：router / theme / i18n / styles / format / link / cn …
│   └── i18n/<BCP47>.ts     # 词库文件名即 locale tag
├── styles/                 # global.css 单入口：tokens → base → prose → behaviors
└── config/site.ts          # 站点元数据与个人内容（文案边界，见下）
```

- **仅命名导出**，全树零 `export default`；hook 就近放在领域文件（`useT` 在 i18n、`useRouter` 在 router）。
- 导入用 `@/` 别名 + **显式扩展名**（`@/lib/i18n.ts`）；`verbatimModuleSyntax` + `useImportType`。
- TypeScript 全严格（含 `noUncheckedIndexedAccess`）；Lint 用 **Biome**（含 sorted-attributes、2 空格、120 列）。
- TypeScript strict 下禁 `any`；外部宽松响应用 `Raw*` 接口 + 显式收窄。
- 文案边界：界面词汇 → i18n 词库；个人内容（姓名/格言）→ `config/site.ts`；产品内容 → content/。
- 包管理器：**pnpm**（唯一 lockfile：pnpm-lock.yaml）。

## 9. SPA 契约（fetch-and-swap 路由）

- 每条路由都预渲染完整 HTML（SEO/首屏），内嵌 `<script id="page-data">` JSON payload。
- payload 是判别联合（`globals.page` 判别），类型守卫分发页面；换页 = `fetch(URL)` → DOMParser 提取 payload → `pushState`，popstate 按 URL 重取；payload 携带 `title/description` 同步文档头。
- 重依赖一律进视口惰性加载（先例：Mermaid ~2.7MB、GitHub 评论取数）。

## 10. i18n 规范

- **EN（`i18n/en.ts`）是基准**：`StringKey` 从 EN 推导；其他语言 `Record<StringKey, string>`（Partial 可回退），缺 key/拼错 key 编译报错。
- 新语言 = 新建 `i18n/<tag>.ts` + CATALOGS 注册 + `themeLocaleTag()` 归一。
- 占位符 `{name}`，`t(key, params)` 替换；非 React 场景用 `translateFor(locale)`。

## 11. 质量要求（每个产品必须满足）

1. `tsc --noEmit` 零错误（strict + noUncheckedIndexedAccess）
2. `biome check` 零错误
3. 生产构建成功
4. **Lighthouse 门禁**：全站每页 Performance / Accessibility / Best Practices / SEO 全类别满分基准（ZJSearch 定义的 Agentic Browsing 类别一并保留）；门禁脚本模式见 `scripts/audit.mjs`（本地静态服务器镜像生产 CDN：压缩、缓存、/cdn-cgi/trace、404 语义）
5. 浏览器目标 `baseline 2022, not dead`
6. 可访问性硬规则：焦点环、aria-label、aria-current、reduced-motion、装饰元素 aria-hidden

## 12. 衍生产品接入 Checklist

- [ ] 复制 `styles/`（tokens/base/behaviors + 入口），token 不得改值，只允许按第 2 节规则登记扩展
- [ ] 引入 `lib/styles.ts` 片段集（可增不可改语义）
- [ ] 采用 `lib/cn.ts / format.ts / link.ts / theme.ts / i18n`（i18n 按 EN 基准建词库）
- [ ] 页面骨架对齐第 7 节（Shell/导航/页脚），组件命名对齐第 8 节
- [ ] 路由按第 9 节契约（预渲染 + fetch-and-swap）或证明更优方案
- [ ] 接入 Lighthouse 门禁脚本并设阈值；包管理器用 pnpm
- [ ] README/AGENTS 注明「遵循 DESIGN.md」与 token 基准版本

## 13. 治理

- Token 变更以 **ZJSearch 实现为基准源**：改 token 先改 zjsearch，再同步本仓库与本文档（PR 中附两边截图对比）。
- 新片段/新 token 必须先更新本文档再落码；文档与实现不一致按 bug 处理。

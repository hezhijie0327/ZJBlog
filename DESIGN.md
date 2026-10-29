# DESIGN.md — ZJ 设计系统（品牌基座）

> ZJ 产品家族的统一设计语言与工程规范。后续衍生产品一律以本文档为设计/工程契约，保证「一眼同源」。
>
> 与 `AGENTS.md` 的分工（格式对齐 DESIGN.md 通行约定：Stitch 九段式设计段 + 家族扩展段）：
>
> | 文件 | 读者 | 定义 |
> |---|---|---|
> | `AGENTS.md` | 编码 agent | 项目怎么建（架构、命令、开发门禁） |
> | `DESIGN.md` | 设计 agent + 人 | 界面长什么样（§1–11），附家族工程契约（§12–18） |

---

## 1. 设计原则（视觉主题与氛围）

风格关键词：**暖纸底 × 墨字 × 琥珀金；纸感物理；编辑排印；大留白低密度**。

1. **暖纸墨金**：暖纸底 × 墨字 × 琥珀金强调 —— 纸感、低刺眼、高辨识度。
2. **内容优先**：界面退后，正文站前；装饰只用「编号 + 细线 + 留白」表达。
3. **纸感物理**：凡引用纸张的装饰（撕边、胶带、微倾斜、高亮纸带）必须遵守真实世界的物理规则 —— 胶带要搭在纸边上、纸面微微歪斜、装饰只落在留白处（详见 §7）。
4. **零 webfont**：全部系统字体栈。无字体下载、无布局抖动、无性能税。
5. **快**：预渲染 + 惰性取数，任何交互不等待任何大依赖。
6. **克制**：动效只出现在首屏入场与状态切换，从不为装饰而动。

## 2. 品牌资产（Branding）

品牌是家族资产：各产品按本节产出与复用，禁止各造各的。

### 2.1 命名与词标

- 家族前缀 **ZJ** + 领域名：`ZJSearch` / `ZJBlog` / `ZJDNS` / `ZJDDNS`；一名一产品，不重不占。
- 界面品牌区直接用产品名（serif 字体呈现），不另设图形 logo。
- **词标处方**（紧凑顶栏，两代产品已对齐）：`font-serif text-2xl font-semibold tracking-tight`，后缀**品牌句号** —— 实心金点（`--accent-strong`，`0.25em` 圆、起始间距 `0.14em`、基线对齐、`aria-hidden`），与 §2.2 品牌标句号同色系。间距以词标自身字号为基准（`em`）——固定像素值在 hero 大字号下会让句号贴住字面；两种字号（顶栏 2xl / hero 6xl–7xl）均按此式缩放。句号是图形元素，不进词库：产品名本身照常走 i18n / 实例名。

### 2.2 品牌标（favicon / 产品图形标）

家族统一的是**设计语言**，不是同一个字形：每个产品用同一语言设计自己的**签名图形**，右下品牌句号是全家族的统一记忆点。字形登记表：

| 产品 | 字形 | 出处 |
|---|---|---|
| ZJBlog | 单笔画首字母 Z | `public/favicon.svg` |
| ZJSearch | 放大镜（搜索） | `client/zjsearch/src/brand/favicon.svg` |

语言规则（全家族常量）：

| 原则 | 说明 |
|---|---|
| 一个字形基元 | 产品签名图形做单笔画圆头描边：viewBox 100 下 stroke-width 14 —— 16px 下轮廓仍清晰 |
| 品牌句号 | 右下角一枚实心圆点（(85,85) r=7）收尾，全家族统一记忆点 |
| 色 | 金渐变 `#f5c84c → #e09f0a`（`--accent-strong` 族），**透明底** —— 明暗背景直接可用，无需双版本 |
| 资产矩阵 | `favicon.svg`（主）→ `favicon.png`（兜底）→ `apple-touch-icon.png`（180，**实底 + 安全边距**；实底用固定浅色基准 `#faf9f6`，同 §2.3）→ PWA 栅格：`icon-192.png` / `icon-512.png`（**透明底整幅**）+ `maskable-512.png`（**实底 + 80% 安全区**，Android 圆形遮罩裁底不裁字形）——配方与声明契约见 §18 |

新产品的字形先在上表登记再落码（§17）；禁止脱离本语言私造图形。

### 2.3 OG 分享卡

- 1200×630，**固定浅色基准**：分享卡不随 UI 主题切换，截图页锁定中文基准词库。
- 构图：kicker → 品牌名（大号衬线）→ 格言 → 底部作者 + 域名；配色与字体全部走设计 token，与站点同源。
- 产品豁免（ZJSearch，已登记）：搜索工具无社交分享场景，不设 OG 分享卡。

### 2.4 个人内容资产

个人产品的头像用真实形象或手绘（`avatar`），置于纸面语境中呈现；收款码等联系资产直接放 `public/` 根。

## 3. 色彩体系（Color Palette & Roles）

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
| `--accent-strong-hover` | `#eebd35` | `#ffd76b` | 填充强调悬停 |
| `--accent-soft` | `#faf0cf` | `#3a3320` | 强调浅底（图标圆盘） |
| `--accent-contrast` | `#241d0e` | `#241d0e` | 填充强调上的文字（必须） |
| `--highlight-bg` | `#fde68a` | `#4a4020` | 高亮/选区 |
| `--ok / --warning / --danger` | 绿/橙/红 | 亮化 | 状态色 |
| `--shadow-card / --shadow-pop` | 暖色阴影 | 加深 | 卡片 / 弹层 |
| `--scrim` | `rgb(0 0 0 / 0.6)` | 同浅色 | 灯箱背板遮罩（媒体 chrome，物理黑不随主题翻转） |

**硬性规则**

- 禁止裸写 hex / Tailwind 调色板（`text-gray-*` 等），一切走 token；Tailwind 映射见 `@theme inline`（`bg-surface`、`text-ink-2`、`border-line`、`bg-accent-strong`、`text-accent`、`text-ok`、`shadow-card`…）。
- `--accent` 是**文字**强调色；`--accent-strong` 只做**填充**，其上文字必须是 `--accent-contrast`。
- `--ink-3` 及以上弱化文字对一切表面保持 ≥ 4.5:1（AA）。
- 暗色仅允许通过 token 生效（`.dark` class 策略，`@custom-variant dark`）；禁止 `dark:` 下散落硬编码色值（图标显隐 `dark:hidden/dark:block` 除外）。

**产品级扩展**：产品特有 token（如暖黑代码块 `--code-bg/--code-fg`、衬线正文 `--font-serif`）注册进同一 @property/主题体系，属文档化的合法扩展；新扩展照此办理 —— 先在本文档登记，再落码。

**已登记扩展**

- **OLED `.black` 档**：叠在 `.dark` 之上的第三调色板（`dark`+`black` 双 class），仅再压深表面档（`--bg/--surface/--surface-2/--line/--ink*/--accent-soft/--highlight-bg/--shadow-card`），强调色沿用 `.dark` 值。
- **固定暗色媒体 chrome 豁免**：图片灯箱、缩略图角标（`TILE_BADGE`）与媒体浮层在**所有调色板下都渲染在同一暗色底上**，主题 token 不适用 —— 允许固定色值（灯箱的 zinc 系文字、`bg-black/70` 角标 scrim）；灯箱背板已收编为 `--scrim` token（明暗同值），不再豁免。canvas 画布内的 JS 颜色字面量同豁免（CSS 变量到不了 canvas）。豁免面仅限媒体浮层/角标/画布，页面 UI 一律走 token。
- **扫码容器固定白底**（ZJBlog 支持页收款码）：二维码需要真实白底保证扫码器对比度，暗色下不能跟 token 翻黑 —— `bg-white` 固定值合法。
- **theme-color meta 镜像常量**（ZJBlog `lib/theme.ts` 的 `THEME_COLOR_LIGHT/DARK`）：SSR 头部与 `applyThemeStyle` 需要字符串字面量直写 meta（CSS 变量到不了 `<meta content>`），值必须与 `--bg` 两档逐一相同 —— 改 token 时两处同步，注册于此即非「裸 hex」。

**依赖样式按需加载**：大而少用的样式资产（如 KaTeX，25KB raw）不做全站 render-blocking —— 构建期标记需要的页面，仅对这些页注入对应样式（含字体资产），客户端 SPA 换页再幂等补注。

## 4. 字体与排印（Typography Rules）

| 栈 | 变量 | 用途 |
|---|---|---|
| sans | `--font-sans` | 界面（导航、按钮、卡片正文） |
| serif | `--font-serif` | 标题与文章正文（宋体族；Windows 回退 SimSun，macOS 回退 Songti） |
| mono | `--font-mono` | 编号、日期、英文小标签、代码 |

**排印层级**（全部现值取自实现，改字号先改实现再改此处）：

| 层级 | 处方 | 出处 |
|---|---|---|
| 品牌字标 | `font-serif text-xl sm:text-2xl font-semibold tracking-tight`（品牌句号 `size-[0.25em]` 随 em 缩放） | `Navigation` |
| 首页 Hero H1 | `font-serif text-4xl sm:text-6xl font-black leading-tight tracking-tight` | `IndexPage` |
| 页面 H1 | `font-serif text-3xl sm:text-4xl font-black tracking-tight` | `SectionHeading level={1}` 与各详情页 |
| 区块 H2 | `font-serif text-2xl sm:text-3xl font-semibold tracking-tight` | `SectionHeading`（level=2 默认） |
| 列表阅读位 | 行标题 `text-xl sm:text-2xl`；摘要/描述性正文 `text-sm leading-relaxed sm:text-base`（15px 半档已并入 `text-base`） | `PostList` / `ArchivesPage` / `IndexPage` 联系卡 |
| 界面正文 | `text-sm`（说明性文字 `text-xs`） | 全站默认 |
| 元信息 | `META` 片段（mono `text-xs`） | 日期/计数/键位 |
| 长文正文 | `.prose` 显式刻度 **17px / line-height 1.8**（`1.0625rem`——中文衬线长文，标题/代码/表格为 em 刻度整体跟随；覆盖必须非分层压过 Typography 插件，同 `--tw-prose-*` 颜色覆盖） | `prose.css`；颜色全走 `--tw-prose-*` → token 映射 |
| 文内标题（MD `#`→`######`） | 六档可辨链（17px 基准实测值）：h1 34 / h2 25.5 / h3 21.3 / h4 19.1 / h5 17 w600 / h6 14.9 w600——h1 收到 2em 防倒挂页题（36px），h4+ 加大、h5/h6 补字重（Typography 默认与正文同号同重完全隐身）；脚注区 0.875em 小于正文 | `prose.css` 显式覆盖 |
| 幻灯片页题 | px 定尺（构建期主题 `tools/deckTheme.css`，按标题降级后的真实层级）：`#`→h2 60 / `##`→h3 44 / `###`→h4 32 / lead 76 | deck 画布（§5.2） |
| 装饰水印 | `text-6xl font-black`（`text-accent/20` 或 `.hollow-text`） | 纯装饰，必须 `aria-hidden` |

- 标题一律衬线 + `tracking-tight`；界面正文一律 sans —— 两套排印轨道不混用。
- **信息文本字号地板 = 12px（`text-xs`）**：eyebrow / MONO_CHIP / 图例 / 上下篇导航 / 代码卡语言标等一切承载信息的微字号一律 ≥12px；11px 档已清零（2026-10 可读性审计）。**豁免**：`aria-hidden` 装饰（SEALED 印章 8px、胶片齿孔编号 10px、姓名便签）与 OG 画布定尺（生成器，非页面）不设限。
- **响应式原则**：正文与元信息字号全端恒定（移动端不往小压）；展示级标题（Hero/页题/区块题/行标题）按 `sm:` 上探一档；品牌字标反向——移动端降一档保导航条密度。
- 引入 webfont 前必须先过 Lighthouse 门禁评估（历史教训：webfont 曾致 CSS 276KB + perf 91）。
- 产品变体（ZJSearch，已登记）：品牌区/词标与知识面板（infobox）标题走衬线；结果条目标题（16px 链接）与界面区块标题保持 sans —— 结果页密度优先。词标句号是实心金点图形（呼应 §2.2 favicon 句号），所有表面一律为惰性装饰（含 hero——曾有的「Powered by SearXNG」hover 揭示件已移除：噪音大于信息，About 入口在页头操作区）。

## 5. 组件片段（Component Stylings）

重复组合一律收拢为 SCREAMING_SNAKE 常量（`lib/styles.ts` 单一来源），`className={FRAGMENT}` 消费，覆盖用 `cn(FRAGMENT, "覆盖类")`。本表登记语义与状态，类名串以 `styles.ts` 为准：

| 片段 | 用途 | 状态 |
|---|---|---|
| `ICON_BTN` | 36px 圆形图标钮（导航/页脚/操作区） | hover：`surface-2` 底 + 字色提亮 |
| `CARD` | 卡片容器：`rounded-2xl` + `border-line` + `surface` + `shadow-card` | — |
| `CARD_HOVER` | `CARD` + 可悬停卡 | hover：阴影升 `shadow-pop` |
| `DIVIDE_LIST` | 分隔行式列表（无边框壳；卡片壳由调用方拼 `CARD + DIVIDE_LIST`） | — |
| `LIST_ROW` | 分隔列表行（`px-5 py-4 sm:px-6`），两种容器通用 | row hover：`surface-2` 底 |
| `BTN_PRIMARY` | 金底胶囊主操作（`h-10 px-5`，文字 `accent-contrast`） | hover：底色加深 + 阴影升 |
| `BTN_OUTLINE` | 描边胶囊次操作 | hover：`surface-2` 底 |
| `PAPER_STRIP` | 撕边纸条入口（纸色经 `--strip` 注入） | hover：抬起 `-translate-y-0.5` 回正 |
| `STRIP_PRIMARY` / `STRIP_PAPER` | `PAPER_STRIP` 的两种标准面色组合：金条（`--strip: accent-strong`，左倾、字 `accent-contrast`）与素纸条（`--strip: surface`，右倾、hover 转 accent）——`cn(PAPER_STRIP, STRIP_*)` 消费 | hover 面色加深 / 字转 accent |
| `ALERT_DANGER` | 渲染失败告警盒体（`border-danger/60` + `bg-danger/10`）；`role=alert` 与文案由调用方给，`cn(ALERT_DANGER, "my-4")` 调节奏 | — |
| `CHIP` / `MONO_CHIP` | 标签胶囊 / 等宽小号版 | — |
| `CODE_CHIP` | 方角行内代码令牌（算法名/配置键/许可证），12px 元层 | — |
| `PILL` | 13px 控制层胶囊底座（导出条/建议条/媒体触发），调用方追加 `gap-*` 与 hover 色 | hover 由调用方给 |
| `META_TOGGLE` | 结果元行 12px 文本开关（「找到 N 条 · 耗时 X s」） | hover：字色提亮 |
| `SEGMENT` / `SEGMENT_ACTIVE` / `SEGMENT_IDLE` | 分段控制（偏好页页签、信息页页签、行情区间） | 选中：`accent-strong` 填充 |
| `SEGMENT_SM` | 紧凑分段（行内选项组：HTTP 方法、主题样式、行情胶囊） | 同上 |
| `META` | 等宽元信息文字（日期/计数/键位） | — |
| `GHOST_DATE` | 幽灵日期水印（Archives 年份行 / PostList 行右上，`hollow-text` + 4.5rem 等宽）——§7「装饰只落留白」，必须 `aria-hidden` + `pointer-events-none` | — |
| `EYEBROW` | 眉标：等宽 11px 全大写间距标签（标题旁英文点缀、分组小标题） | — |
| `TAPE` | 胶带装饰基底（§7）：`aria-hidden` + `pointer-events-none` 内置，定位/旋转/透明度由调用方给 | — |
| `SECTION` / `SECTION_DETAIL` | 页面级 / 详情页 section 外壳（§6 节奏） | — |

各产品可增自有片段；**同语义在同产品内必须同名**，禁止同语义双别名并存。新增/改名片段必须先更新本表再落码（§17）。

新 UI **先找片段，没有再新增**，禁止在组件里裸写长串类名。

### 5.1 共享 Markdown 渲染词汇（AI 生成内容）

两家产品渲染 AI 生成内容（ZJBlog 构建期管线 `tools/content.ts`、zjsearch 客户端 `lib/markdownParts.tsx`）用**同一套词汇**，prompt 侧只教真实可渲染的语法 —— 家族共享契约，改这里先于改任何一侧实现（§17）：

| 词汇 | 语法 | 实现 |
|---|---|---|
| GFM 全套 | 表格 / 任务列表 / 删除线 / 自动链接 / 脚注 | `remark-gfm` |
| 高亮 | `==文本==` | `micromark-extension-mark` → `<mark>`（token 配色） |
| Callouts | `> [!type] 标题`（`-` 默认折叠 / `+` 默认展开；别名归一十类别，正典见 ZJBlog `tools/callouts.ts`） | remark 插件家族共享；类别 → 语义 token（ok/warning/danger/accent/中性） |
| 定义列表 / emoji 短代码 | `remark-deflist` / `remark-emoji` | 同 |
| 数学 | `$...$` / `$$...$$` / ` ```math ` fence（LaTeX once-only） | `remark-math` + `rehype-katex` |
| 图表 | ```mermaid fence —— v12 全部图型（渲染器不挑图型；`xychart` 为 v12 注册名、detector 兼容 `xychart-beta`，`radar-beta` 必须带 `-beta`，zenuml 未随 v12 内置）。词法纪律：含标点/括号/中文的标签加引号；xychart 轴数组中文条目必须加引号；sankey-beta 节点与 radar-beta/quadrantChart 轴/点名为 ASCII 裸标识符（中文只进引号内字符串）；treemap 节点必须双引号（引号内可 CJK） | mermaid 12 惰性渲染 |

**有意不共享**：`rehype-raw`（博客内容作者所有、可透传原生 HTML；AI 生成内容一律**禁止 raw HTML** —— 信任模型差异）、PlantUML（外部渲染服务，mermaid 已覆盖）、Shiki 代码高亮（zjsearch 体积预算；代码块纯 mono 呈现）。

**编辑排印配方（2026-10 起，zjsearch 侧消费）**：AI 内容（回答 / 报告文档 / 知识库检查器）的 markdown 元素在本词汇之上按本站 prose 的声音渲染 —— 衬线正文与标题（按深度加权 h1 2xl → h4 sm）、琥珀引用条（`--accent-strong` 左条）、发丝线表格（仅行底线、无竖线无底色）、行内代码 surface 底 + `--accent-hover`（AA 安全档）、`==mark==` accent-soft 底、链接 medium + 下划线。配方收敛为一份类串常量（zjsearch `lib/markdownParts.ts` 的 `MD`），两个渲染器（`MarkdownAnswer` / 知识库 `InspectorMarkdown`）共同消费；机器声音面（思考流、工具行、元信息）保持 sans。撕边多边形 / 物理规则同样两侧同步（§17）。

### 5.2 幻灯片画布与播放器（deck）

deck 文（frontmatter `deck: true` 或正文 marp fence）的视觉契约：构建期主题 `tools/deckTheme.css` 是**纯 token 消费方**——颜色与字体全走 §3/§4 变量，deck 随站点明暗交叉淡化，不设独立配色。marpit 会把主题选择器 scoping 到 `div.marpit > section`，因此主题 CSS 只写亮态默认值，`.dark` 祖先切换（含 shiki 双主题）一律放 DeckViewer 宿主 CSS。

| 词汇 | 处方 |
|---|---|
| 画布 | 1280×720 px 定尺 + transform 缩放（`tan(atan2(100cqw, 1280px))` 纯 CSS 求容器比），圆角 16px + `--line` 描边 + `--shadow-card`，底 `--surface`、字 `--ink` |
| 页题层级 | 按 §4 幻灯片行（降级后层级，勿按源码层级写主题——h1 规则全是死规则） |
| 播放器 chrome | 复用 `ICON_BTN` / `CHIP` / `META` 片段（无新片段）；控制条始终渲染——挂载后插入控件同样计入布局位移 |
| 全屏 | 状态驱动样式（`[data-fullscreen]`，**不用 `:fullscreen` 伪类**——webview/预览环境的原生 API 半残：resolve 但视图不展开、事件不派发）；fixed 覆盖层 `z-index` 压过 app-bar，padding 按 `max(24px, env(safe-area-inset-*))` 内收（§18 延伸）；原生 promise 拒绝/不可用自动回落伪全屏 |
| 触控 | 舞台 `touch-action: pan-y`：横滑翻页归播放器、纵滚归页面 |
| 动效 | 换页 `deck-slide-in` 0.28s ease（§8 轨道；reduced-motion 全局收敛） |
| 布局边界 | 主题**不发明布局语法**：纯 Marpit 无双栏/分栏（`bg right/left` 与多层 `![bg]` 是 Marp Core 语法、不可用）。需要特殊布局时作者用**原生** `style:` 指令或 `<style>` 元素在 deck 内自带 CSS（随文件走、不依赖主题） |
| 行内标签与图片 | `<mark>`（`--highlight-bg`）/`<kbd>`/`<u>`（accent 下划线）/`<del>`（ink-3）/上下标有主题样式（样式归主题，标签是原生 HTML）；图片修饰符 `w:`/`h:`/`bg fit` 可用，图片 `max-height: 480px` 防顶出画布 |
| 无 JS | `<noscript>` 样式（`DECK_NOSCRIPT_CSS`）展开全页堆叠，`zoom` 布局缩放（transform 不参与布局，父级拿不到实际高度） |

**deck 管线家族契约（ZJSearch 运行时同架构，§17）**：ZJSearch 的 deck 编译是本站 `tools/deck.ts` 的孪生（`client/zjsearch/src/lib/deck/compile.ts`，内核 marp-core 版本对钉），`DeckView.tsx` 是 DeckViewer 的孪生、`deckFit.ts` 是本站溢出适配的孪生——机制改动两侧同步。三个**站点缝**把同一份管线分开：`html`（本站 `true` 可信作者直通；zjsearch `false`——模型内容 raw HTML 转义为可见文本，注入的标签不执行，即信任模型）、`highlight`（本站传 shiki 双主题 pass；zjsearch 缺省走 markdown-it 转义代码块）、`imageSizes` / `demoteHeadings`（本站开，zjsearch 独立 deck 关）；deck 均无脚注管线（marpit 系不含脚注插件，两侧 prompt 一致禁教）。内核把 mathjax-full 与 highlight.js 全语言注册表静态 require 在模块顶层，而钉死的配置（`math: "katex"` + `highlight: () => ""`）永不执行这两条路径——bundler alias 把它们指到一个 Proxy 替身（zjsearch `tools/deck-stubs/empty-dep.cjs`），**升级内核时替身与 alias 清单要跟着核对**。

**溢出自动适配（两侧孪生 `deckFit.ts`）**：compile 期把每页正文包进 `.deck-body`；播放器对可见页测量溢出并对 wrapper 施加 `transform: scale(s)` + 宽度补偿（`width: 100/s%`——排版先放宽再缩回，有效行宽不变、整页等比缩小落进画布），缩放下限 0.5（之下宁可裁切——无限缩小等于不可读）。两个载荷级陷阱：**量 wrapper 自身的 scrollHeight**（`section.scrollHeight` 被钳到 clientHeight 且计入 padding-bottom，会把干净页误报成恰好超一个 padding）；**钉 `transform-origin: top left`**（默认 center 会把缩放后的页向中心漂）。`display:none` 的页量不出尺寸——逐页模式翻到即量；mermaid/图片迟到渲染由防抖 MutationObserver 重测（fit 只写 style/attribute，不在 childList 观察范围，无回环）。打印前先切连续/揭示全量再量，克隆纸面携带每页的 inline 缩放。

### 5.3 打印 / 导出（家族契约，与 ZJSearch print 管线统一）

「打印 / 存为 PDF」走浏览器打印（`styles/print.css` + `lib/print.ts` 的 `startPrintPreview`），机制与 ZJSearch `client/zjsearch/src/styles/print.css` + `lib/print.ts` 同源（§17：两侧改动须同步）：

| 机制 | 契约 |
|---|---|
| 纸面永远浅色 | 色 token 均为 @property 注册色、初值即浅色——`.dark` 覆写用 `--token: initial` 归位，零 hex 复制；特例 `--bg: #ffffff`（暖白贴 @page 白边像污渍）+ `color-scheme: light`；`html { transition: none }` 防交叉淡化渗入快照；`* { print-color-adjust: exact }` |
| 预览脸 | 嵌入式 webview 的 print 是静默 no-op（ZJSearch 实测另有幽灵 afterprint）——`startPrintPreview` 先让纸面可见（`body.print-preview` 强制纸面样式上屏 + 关闭芯片 + Esc），双 rAF 后 `window.print()`；真浏览器对话框盖在纸面上方；文件名 = 打印期 `document.title = zjblog_<标题>`（teardown 恢复） |
| chrome 隐藏 | `.print-hide` 钩子类（本站命名，对位 ZJSearch `.zjs-print-hide`）+ 结构选择器（app-bar/footer/aside）；`.fixed/.sticky → static`；`@media print` 与 `body.print-preview` 两份列表须保持同步（ZJSearch 同款取舍） |
| 深色 mermaid | 颜色烤进 svg 的组件打印前经文档事件（`blog:print-mermaid-light` / `-restore`）以浅色主题就地重渲染、关闭恢复；外部 Ctrl+P 不走此管线（保持当前主题，已知降级） |
| 品牌字标 | 文章打印在纸面左上注入品牌字标（`lib/print.ts` 注入 `.print-wordmark`：衬线 20px/600 + 金点 + 分隔线，同 ZJSearch print 文档 wordmark）；deck 幻灯片自带品牌且定高页面不容插入、不注入 |
| 内容完整 | 画布/正文全量常驻 DOM（deck 换页只逐节切 `hidden`）；打印时隐藏页揭示、代码卡/表格 `break-inside: avoid`、外链 `::after` 展开 href、deck 靠 marpit 自带 `@page 1280×720` + 逐页 break（print.css 的 `@page a4` 只服务文章，级联被 deck 页后置覆盖） |
| 复制为 Markdown | 构建期为未锁定内容落 `<kind>/<slug>/index.md`（原文保真；锁定文不落盘不渲染按钮——fail-closed）；`compress-images` 改写面含 `.md`；`_headers` 对 `/<kind>/*/index.md` 显式 `text/markdown; charset=utf-8`；`<head>` 带 alternate 直链 |

**不做**：构建期真 PDF（需 Chromium）、PPTX（marp-cli 同款也只是图片贴片）。


## 6. 空间与层级（Layout Principles & Depth）

- **间距刻度**：Tailwind 默认 4px 基数，不自造刻度；纵向节奏统一由片段承载，不逐页散写 —— `SECTION`（`px-4 py-14 sm:py-20`）、`SECTION_DETAIL`（`py-12 sm:py-16`）、`LIST_ROW`（`px-5 py-4 sm:px-6`）。
- **版心**：`container mx-auto`；长文容器 `max-w-3xl`。
- **页头对齐**：每页 H1 / 页头块（BackLink + header / SectionHeading）直接置于 SECTION 容器下 —— 全站标题同一左缘；正文列宽由各页自定（网格 `max-w-6xl`、长文 `max-w-3xl`），不得为迁就正文而缩进页头。
- **圆角**：按钮/图标钮 `rounded-full`；卡片 `rounded-2xl`；小件 `rounded-lg/xl`。
- **表面层级**：`--bg`（页面底）→ `--surface`（卡片）→ `--surface-2`（悬停/次级），三级止步；更深的「底上底」一律先回到 token 语义再议。
- **凸起（elevation）两档**：`shadow-card`（静态卡片）→ `shadow-pop`（弹层与悬停加深）。都是暖色调（值见 §3 表 / `tokens.css`），禁止裸写盒阴影。

## 7. 纸感语言（折纸 / 贴纸）

纸感是家族的视觉签名：数字界面引用真实纸张的物理规则。所有纸感元素只落在留白处、一律 `aria-hidden` + `pointer-events-none`，绝不与可交互内容抢位。

| 元素 | 实现 | 物理规则 |
|---|---|---|
| 撕边纸面 `.paper-note` | clip-path 撕边 + 横线纸纹 + 随轮廓 drop-shadow；变体 `--blank` 素面去横线 | 平贴会假 —— 微倾斜 ±0.5° 级，方向按位置轮换；**横线只配静态列表** —— 中段可滚动的交互纸面（zjsearch 澄清门）用 `--blank`，文字滚动才不漂过固定横线 |
| 撕边纸条 `.paper-strip` | 按钮形态的撕边纸，纸色经 `--strip` 注入 | 主纸条金底（`--accent-strong`），次纸条纸面色；交错 ±1° 歪斜 |
| 胶带（`TAPE` 片段 + `components/Tape.tsx`） | 半透明 `bg-accent-soft` 矩形，压在纸边之上；传 `seed`（内容字符串）时位置按下方 **seed 物理规范** 确定性变化 | **必须是被裁剪元素（clip-path）的兄弟节点** —— 放在其内部会被撕边裁掉角；构图按纸宽分档：通栏宽纸单条顶中（`center`）、中等纸面双角对压、窄便签单条角压——已被其他纸片叠压的角不再上胶带（真实贴法里便签多为一胶带，满页两角对压即机器感） |
| 马克笔高亮 `.marker-strip` | 文字下半截的撕边金条 | 只扫过关键字，微歪斜 |
| 手绘分隔线 `.paper-chapter` | 章节顶部的 1px 细线，rotate -0.4° | 模拟纸页间手账分隔 |
| 圆形邮戳 `.paper-postmark` | 双环圆戳（外圈虚线 + `::before` 内圈实线），环内承载真实元数据（日期/标签），尺寸与确定性旋转由消费方给（两侧 `global.css` / zjsearch `paper.css` 同配方，zjsearch 侧在 components 层） | **唯一的非 `aria-hidden` 纸感件**：环内是真实信息而非装饰；文档流内使用（不绝对定位遮字），rotate 12° 级盖戳（封缄信 LockScreen 的 SEALED 戳、文末署名卡的 CC 落款戳——戳文与正文内许可链接重复时退为 `aria-hidden` 装饰、zjsearch 报告的归档落款） |

变化必须是**确定性**的，禁止随机数 —— SSR 与客户端水合必须一致。重复钉卡（列表中的卡片）的位置变化走 **seed 物理规范**（2026-10 起，按内容而非按序号）：

**`tapePhysics(seed)` 规范** —— 家族唯一权威算法，两侧（ZJBlog / ZJSearch 的 `components/Tape.tsx`）实现须逐字一致，新家族产品照抄：

```
h = 5381                      // djb2 初值
for c in seed: h = ((h << 5) + h + ord(c)) >>> 0
top    = -(6 + (h % 4))                 // -6..-9 px 顶部漂移
inset  = 24 + ((h >>> 2) % 5) * 4       // 24..40 px 角内缩
rotate = (h % 2 == 0 ? 1 : -1) * (4 + ((h >>> 4) % 4))   // ±4..7°
drift  = ((h >>> 6) % 5) * 6 - 12       // -12..12 px 顶中漂移（center 构图）
h 偶数 → insetInlineStart；奇数 → insetInlineEnd        // 角侧
```

位移一律**逻辑右移 `>>>`**：djb2 结果约半数 ≥ 2³¹，算术右移 `>>` 按 int32 符号扩展会算出负偏移，把 inset / rotate 拖出上列值域（2026-10 视觉调试实测：半数内容 seed 越界，胶带近乎水平或悬出纸外——勿回退）。`corner` 三构型：`start`/`end` 角压（双角对压构图由构图指定左右，同一纸条的两条胶带 seed 各异，漂移互不相同）；`center` 顶中——`left = calc(50% + drift)`，`transform = translateX(-50%) rotate(rotate)`，供通栏宽纸单条固定用。

seed 取该卡片的**内容身份**（标题 / slug / 查询词；单屏构图取稳定常量）。适用对象是**一切胶带**——家族内不再有规范外的胶带定位。

博客侧同语言消费（2026-10 起）：hero 便签（单条角压——右上由姓名小纸片占位，被叠压的角不上胶带）与联系纸条（双角对压）、首页三张通栏列表纸（最新思考/旅行足迹/归档：单条顶中 `center` w-32——宽纸双角窄胶带比例失衡且满页同构图即机器感）、旅行明信片墙（**有封面 = 拍立得 + 图钉挂绳**——金钉头 + 棉线升向地图卡方向，参考实体旅行照片墙；无封面 = 胶带便签 + 背面粉条角票，胶带入 **seed 物理** seed 行程标题）、文头手写摘要便签（撕边纸 + 顶部单胶带 + 0.35° 微倾，胶带 seed 文章 slug）、项目卡（胶带 seed 项目标题——按序号轮换已退役）、文末署名卡（素面撕边 + CC 落款邮戳，信件落款叙事）、404 与全部列表空态告示纸（EmptyState 非 bare 变体，两角对压——ZJSearch `PaperEmpty` 同语言）、`PAPER_STRIP` 作空态/纸条动作。

ZJSearch 侧同语言消费（2026-10 起）：`.paper-note` + 两角胶带作空状态/404/搜索失败框的告示纸、AI 线程「已确认方向」卡的钉住便签与报告 TOC 纸条，`PAPER_STRIP` 作空状态的唯一动作，`.marker-strip` 扫首页问候语的称呼词，`.paper-chapter` 作混合搜索分类块的手绘分隔线，衬线标题 + 等宽日期作知识库目录行（PostList 的行语言；目录行的幽灵 hollow-text 日期水印已退场——行的右上角是操作钮领地，「装饰只落留白」在那里不成立，blog 的 PostList 无角钮才立得住），`PaperEmpty` 组件承载全部告示纸空态；hero 手绘箭头同款移植（`client/zjsearch/src/styles/paper.css` + `components/PaperEmpty.tsx`，片段在 `lib/styles.ts` 同名同语义）。钉卡物理同款上身的还有首页 ask-card（确定性微倾 + 顶边胶带 + 聚焦转正 `focus-within:rotate-0`，箭头/胶带挂在不倾斜的外层上）、常规搜索的两个内容卡（AI Overview 卡与 infobox：单胶带压角 + 交替 ±0.35° 微倾，胶带 `zjs-print-hide`——打印留盒去胶带；两卡胶带入 **seed 物理**——AI Overview seed 查询词、infobox seed 条目标题）；`.paper-postmark` 作报告文档的归档落款（DocumentView 文末 + 知识库 inspector 同款）；线程未找到页入列 `PaperEmpty` 告示纸 + 金 `PAPER_STRIP` 动作；澄清门问询卡入列钉住的问询纸条（`paper-note--blank` 素面撕边 + 两角胶带，对话语义留在纸面上，确认动作是金 `PAPER_STRIP`——LockScreen 解锁按钮同款）。撕边多边形 / 物理规则改动**两侧同步**（§17）。

## 8. 动效（Motion）

| 场景 | 动效 |
|---|---|
| 首屏入场 | `animate-fade-up` + `[animation-delay:Nms]` 阶梯 |
| 悬停 | 颜色/阴影走 `transition-colors` / `transition-shadow`；轻微位移悬停（按钮抬起、箭头微移）用 `transition-all` |
| 明暗切换 | 整页交叉淡化（@property 插值）+ 350ms stand-down 窗口（`zjs-palette-anim`） |
| 换页 | 顶部 2px `animate-progress` 进度条 |
| 折叠块展开/收起（`<details>`） | `interpolate-size: allow-keywords` + `::details-content` 高度过渡（Chrome 131+ 渐进增强，behaviors.css） |
| 灯箱进入 | `dialog[open]` 播 `fade-up`，背板 `fade-in`（behaviors.css） |
| 命令面板开/关 | 背板 `animate-fade-in` / `animate-fade-out`；关闭经 `animationend` 卸载 + 240ms 超时兜底 |
| 移动抽屉开/合 | 常驻 DOM + `grid-template-rows 0fr↔1fr` 过渡 + `invisible` 管可聚焦性 |
| 条件渲染面的退出 | `closing` 期播 `-out` 动画 + `inert`，**定时器卸载即超时兜底**（ZJBlog 在 CommandPalette 内联实现该模式，家族产品可沉淀为 `useExitPresence` 等钩子），焦点在关闭发起即归还；reduced-motion 直切卸载 |

原则：**每个可交互面都要有进入/退出动画**（模块级条件渲染直切视为缺陷）；退出卸载依赖动画事件时必须有超时兜底。全局尊重 `prefers-reduced-motion`（behaviors.css 一律 0.01ms 收掉）。内容翻页/换 Tab 属内容替换，以进入动画覆盖。

## 9. 页面骨架与响应式（Page Skeleton & Responsive Behavior）

```
Shell（min-h-dvh 纵向 flex）
├── ProgressBar        # 换页顶部进度条（loading 时）
├── Navigation         # sticky 毛玻璃 h-14：品牌区 / 链接组(active 下划线+aria-current) / 搜索·主题·语言 / 移动端抽屉（grid-rows 过渡）
│                      # （产品变体允许：非粘性导航、结果型页面自带 header；品牌/进度条/页脚/BackToTop 保持同构）
├── <main>             # 页面内容（每页一个语义区块）
├── Footer             # 版权一行
└── BackToTop          # 右下角悬浮返回顶部（滚动超过 400px 出现）
```

- 图标按钮必须有 `aria-label`；当前导航项 `aria-current="page"`；全局 `:focus-visible` 焦点环在 base.css（2px `--accent` outline + offset）。
- 404 与空状态同构：图标圆盘（`accent-soft` 底）+ 标题 + 灰字说明 + 一个动作 —— `components/EmptyState.tsx` 单一实现（`bare` 变体承载 404 整页居中，`heading="h1"` 取页面 H1 字号）。404 整页形态是**告示纸**（2026-10 起，ZJSearch 线程未找到同款语言，§7）：`paper-note` 撕边便签 + 两角胶带（挂在不倾斜外层）+ 微倾斜钉住，动作用金 `PAPER_STRIP`（空状态唯一动作契约）。

**响应式**

- 断点用 Tailwind 默认：`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280；全站以 `sm:` 为主要切换点（移动优先单列），`md/lg/xl` 只做少量布局修正。
- **Hero 一屏构图（移动端收紧处方，登记）**：Hero `min-h-[calc(100svh-3.5rem)]`、「Scroll down」绝对定位在区块底 —— 桌面双栏天然装得下；移动端纵向堆叠会超一屏、把提示顶出折叠线（读起来像没设计完的长文）。处方：装饰箭头与姓名便签移动端退场（`hidden sm:block`）、纸片拼贴缩幅（w-280 / 头像 128 / p-6）、纵向节奏减档（pt-12 pb-14 / gap-8 / kicker mb-4 / motto mt-5 / CTA mt-8），`sm:` 起逐项恢复桌面值 —— 提示稳定落在折叠线。按 svh 余量弹性缩放拼贴属专项设计，不在样式层硬凑。
- 触控目标基线：按钮 `h-10`（40px）、图标钮 `size-9`（36px）、导航 `h-14`（56px）；更小的命中区必须用 padding 补足（先例：脚注返回符 ≥24px、地图针脚透明命中盘 r=24 用户单位）。
- 移动端导航折叠为抽屉（`grid-rows 0fr↔1fr` 过渡，§8）；Hero 大字与分镜条在 `sm` 降档（§4 层级表的 `sm:` 处方）。
- **旅行地图的移动端妥协（登记）**：地图 viewBox 固定 1280×484，手机视口 ~310px 时屏上标注 = 单位值 × 容器宽/1280 —— 标签以 `max-width: 640px` 媒体查询放大单位字号（13→30）补偿，图例 `<sm` 隐藏让控制钮单行。理想方案（slice 裁切出更高地图 + 控制器 toUser/clamp 按可见子矩形补偿 + reset 语义改为「适配全图」）是一次控制器坐标系的专项改造，不在样式层解决 —— 改前必须连同手势数学一起设计。

## 10. 设计守则（Do / Don't）

跨节硬规则的收拢速查（规范正文以各节为准）：

| ❌ 不要 | ✅ 要 | 详见 |
|---|---|---|
| 裸写 hex / `text-gray-*` | 一切走 token（`bg-surface`、`text-ink-2`…） | §3 |
| 在 `--accent-strong` 填充上直接放文字 | 其上文字必须是 `--accent-contrast` | §3 |
| `dark:` 下散落硬编码色 | 暗色仅经 `.dark` token 生效（豁免见 §3 登记项） | §3 |
| 未经评估引入 webfont | 先过 Lighthouse 门禁评估 | §4 |
| 装饰与可交互内容抢位、可聚焦 | `aria-hidden` + `pointer-events-none`，只落留白 | §7 |
| 用随机数驱动视觉变化 | 确定性轮换（序号取模），保证水合一致 | §7 |
| 条件渲染面直切卸载 | 进入/退出动画 + 超时兜底 | §8 |
| 图标按钮没有 `aria-label` | 一律补齐；当前项 `aria-current` | §9 |
| 正文用半透明前景（color-mix 带 alpha） | 关键文字显式 token 实色 | §15 |
| 演示页写 `<font color>`/`bgcolor` 固定色 | 一律以代码块展示 | §15 |

## 11. Agent 使用指南（Agent Prompt Guide）

**阅读路径**：写任何 UI 前 —— §1 定调 → 用色查 §3 → 拼 UI 查 §5 片段 → 字号查 §4 层级 → 骨架查 §9 → 拿不准查 §10 守则。怎么建（路由/payload/命令）读 `AGENTS.md`。

**速查块**

```text
色板速查（light / dark）
  页面底 --bg                #faf9f6 / #1b1a18
  卡片   --surface           #ffffff / #232120
  主文字 --ink               #201d17 / #eceae4
  次文字 --ink-2             #6b675c / #a8a399
  文字强调 --accent          #8c6800 / #fec843   （链接/文字强调，AA 达标）
  填充强调 --accent-strong   #f5c84c / #fec843   （其上文字必须 --accent-contrast）

三条铁律
  1. 禁止裸写颜色 —— 一律 token（Tailwind 映射：bg-surface / text-ink-2 / border-line / bg-accent-strong）
  2. 新 UI 先查 lib/styles.ts 片段，没有再新增；新增须先在本文档登记
  3. 深色只经 .dark token 生效；所有动画尊重 prefers-reduced-motion

片段清单  ICON_BTN · CARD(+_HOVER) · DIVIDE_LIST/LIST_ROW · BTN_PRIMARY/BTN_OUTLINE ·
          PAPER_STRIP · CHIP/MONO_CHIP · EYEBROW · TAPE · META · SECTION/SECTION_DETAIL
```

**典型任务处方**

- **新卡片/按钮**：只用 §5 片段 + §3 token 组合；需要微调用 `cn(FRAGMENT, "覆盖类")`，不复制类名串。
- **新页面**：对齐 §9 骨架（Shell → `<main>` 一个语义区块），section 外壳用 `SECTION`/`SECTION_DETAIL`；标题按 §4 层级表取现成处方，不发明新字号。
- **「想要一个新颜色」**：默认答案是不需要 —— 先从 §3 找语义最近的 token；确属产品级扩展，按 §3 扩展规则登记后落码。

## 12. 工程规范（命名法）

```
src/
├── main.tsx / app.tsx      # 启动引导 + Provider 树 + payload 分发
├── pages/                  # *Page.tsx（PascalCase）+ registry.ts 每页一 chunk
│                           # （或 manualChunks 等价方案，同一契约：每页一 chunk）
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
- 包管理器：各产品**单一 lockfile**（pnpm 或 npm）并在产品文档中记录；同一产品内不得混用、不得双 lockfile 并存。ZJSearch 采用 **pnpm**（`pnpm-lock.yaml` + `packageManager` 钉扎，见 `client/zjsearch/README.rst`）；迁移用 `pnpm import` 保版本一致，严格 node_modules 暴露的幻影依赖（如 `unified` 类型导入）补显式声明。

## 13. SPA 契约（fetch-and-swap 路由）

- 每条路由都预渲染完整 HTML（SEO/首屏），内嵌 `<script id="page-data">` JSON payload。
- 首帧水合契约（SSR 产品）：SSR 经 `SyncPages`（tools/ssr.tsx）同步渲染真实内容（renderToString 等不了 lazy）；客户端在 `main.tsx` 里先取好当前页 chunk 再 hydrateRoot，首帧即真实内容、零 CLS。Suspense 骨架（PageFallback）只在站内换页 chunk 未就绪时兜底。（无 SSR 的产品可以流式首屏 + 骨架镜像达成同一「首帧即内容」目标，属「证明更优方案」路径。）
- payload 是判别联合（`globals.page` 判别），类型守卫分发页面；换页 = `fetch(URL)` → DOMParser 提取 payload → `pushState`，popstate 按 URL 重取；payload 携带元数据同步文档头（`title` 必同步；`description` 有则同步）。
- 重依赖一律进视口惰性加载（先例：Mermaid ~2.7MB、GitHub 评论取数）。

## 14. i18n 规范

- **EN（`i18n/en.ts`）是基准**：`StringKey` 从 EN 推导；其他语言 `Record<StringKey, string>`（Partial 可回退），缺 key/拼错 key 编译报错。
- 新语言 = 新建 `i18n/<tag>.ts` + CATALOGS 注册 + `themeLocaleTag()` 归一。
- 占位符 `{name}`，`t(key, params)` 替换；非 React 场景用 `translateFor(locale)`。

## 15. 质量要求（每个产品必须满足）

1. `tsc --noEmit` 零错误（strict + noUncheckedIndexedAccess）
2. `biome check` 零错误
3. 生产构建成功
4. **Lighthouse 门禁**：全站每页，**桌面端与移动端**都跑；Accessibility / Best Practices 以 **100 为基准**；鼓励登记自定义 Lighthouse 类别（如 Agentic Browsing）并以 100 为基准；Performance 与 SEO 的阈值由各产品在门禁脚本中**记录并维持**（豁免页 —— 如 robots.txt disallow 的路径 —— 在脚本中显式置空并注明理由）。门禁脚本两种已知形态：本地静态服务器镜像生产 CDN（**brotli 优先**、缓存、/cdn-cgi/trace、404 语义；headless Chrome 连跑多页不稳，每 4 页自动重启浏览器），或驱动自身 dev 实例离线跑分（夹具引擎）。**PWA 安装性检查**（§18）作为门禁脚本的独立步骤直连审计源站核验 —— Lighthouse v10+ 已移除 pwa 类别，manifest / 图标矩阵 / 作用域根 worker 任一不达标即整体 FAIL，结果随 scores.json 归档
5. 浏览器目标 `baseline 2022, not dead`
6. 可访问性硬规则：焦点环、aria-label、aria-current、reduced-motion、装饰元素 aria-hidden；**正文半透明前景色（color-mix 带 alpha）会让对比度无法判定而挂审计** —— 关键文字显式 token 实色；内容页固定色值（`<font color>`/`bgcolor`）物理上无法在亮暗两套调色板同时达标，演示场景一律以代码块展示
7. **水合一致性**：凡参与 SSR 的排序/文案禁止依赖运行时 locale（`localeCompare` 的 collation 在 Node 与浏览器 ICU 不同 → React #418 水合不匹配），用 codepoint 比较

## 16. 衍生产品接入 Checklist

- [ ] 复制 `styles/`（tokens/base/behaviors + 入口），token 不得改值，只允许按 §3 规则登记扩展
- [ ] 引入 `lib/styles.ts` 片段集（可增不可改语义，登记进 §5）
- [ ] 采用 `lib/cn.ts / format.ts / link.ts / theme.ts / i18n`（i18n 按 EN 基准建词库）
- [ ] 页面骨架对齐 §9（Shell/导航/页脚），组件命名对齐 §12
- [ ] 路由按 §13 契约（预渲染 + fetch-and-swap）或证明更优方案
- [ ] 品牌资产按 §2 产出：品牌标 favicon 矩阵（SVG 主 + PNG 兜底 + apple-touch）与 OG 分享卡
- [ ] PWA 层按 §18 接入：manifest（standalone + 图标矩阵）、作用域根免缓存 SW、theme-color 双 meta、`viewport-fit=cover` 安全区、16px 触控地板；门禁脚本含安装性检查
- [ ] 接入 Lighthouse 门禁脚本并设阈值（§15 实况）；包管理器单一 lockfile 并在 §12 记录
- [ ] README/AGENTS 注明「遵循 DESIGN.md」

## 17. 治理

- 新片段/新 token 必须先更新本文档再落码；文档与实现不一致按 bug 处理。
- 每节末尾如标注「现值取自实现」，实现变更时同步更新该节，保持 §11 速查块与 §4 层级表可用作 agent 的唯一事实来源。

## 18. PWA 契约（standalone 适配）

产品安装为独立应用所需的**最小安装层**：让 manifest 可安装、让安装后的壳像原生产品（浏览器 UI 随调色板、不顶刘海、不触发 iOS 聚焦缩放），**不引入运行时缓存策略**。ZJSearch 试点（2026-10）、ZJBlog 跟进；衍生产品照此接入（§16）。

| 组成 | 契约 |
|---|---|
| manifest | `display: standalone`；`background_color` / `theme_color` 锁**固定浅色基准 `#faf9f6`**（同 §2.2/§2.3 规则：启动画面与安装横幅不随 UI 主题翻转）；图标矩阵按 §2.2 资产矩阵 —— favicon.svg（any）+ `icon-192/512`（透明底整幅，any）+ `maskable-512`（实底 + 80% 安全区，即 apple-touch 配方放到 512） |
| Service Worker | 必须落在**作用域根** `/sw.js`（子目录会让 scope 收窄、控不住页面）；**刻意免缓存**的直通 worker：GET 导航请求网络直通，失败回 503 离线兜底页 —— 构建资产已是哈希文件名 + immutable 长缓存，worker 再缓存一层只会在部署后复活陈旧 bundle（「重建了但页面还在跑旧代码」这类 bug 的半衰期会被拉长一个量级）；缓存策略是后续的显式 opt-in，不许顺手加。导航 fetch 带短延迟重试（[300ms, 900ms]）再落兜底 —— iOS 独立壳冷启动有已知 WebKit flake（设备在线但网络栈未就绪，首导航 fetch 立刻 reject），重试即恢复；兜底页带「重试」按钮，明暗双档落 §3 token 现值。worker 本体响应 `Cache-Control: no-cache`（更新随下次加载生效）+ `Service-Worker-Allowed: /`（显式备案作用域） |
| 注册时机 | `load` 事件之后注册、失败静默 —— 安装层绝不挡启动、绝不产生用户可见错误；dev 不注册（残留 worker 会干扰后续 dev 会话） |
| 安装入口 | 自有按钮承接 `beforeinstallprompt`（事件派发早于水合 —— 模块导入时挂监听存槽，UI 挂载后订阅），**只在可安装时渲染**：SSR 与水合初帧都不渲染、已在 standalone 壳（本机已装）不渲染、拒绝后 sessionStorage 记会话级静默 —— 零水合分歧、零打扰；`prompt()` 一次性消费，`appinstalled` 即清槽隐藏；入口统一收敛到自有按钮，监听里 `preventDefault` 压掉浏览器自带横幅。iOS 无此事件、按钮永不出现 —— 系统「分享 → 添加到主屏幕」就是入口，不做占位与指引噪音 |
| theme-color | SSR 输出 light/dark **双 meta**（`media="(prefers-color-scheme: …)"`，auto 模式零 JS 原生跟随系统，含 OS 实况翻转）；用户显式选择时由 pre-paint 内联脚本收敛为单枚已解析值，此后 `applyThemeStyle` 每次翻调色板同步更新（安装后的 PWA 标题栏与页面同色交叉淡化） |
| 安全区 | `viewport-fit=cover` 露出 `env(safe-area-inset-*)`：sticky 页头 `padding-top: env(safe-area-inset-top)`（毛玻璃延伸进状态栏区）、`body padding-bottom: env(safe-area-inset-bottom)`（页尾让出 Home 指示条）；导航之下的次级 sticky 面（分镜条/TOC/侧栏）与锚点 `scroll-margin-top` 的偏移一律 `calc(原值 + env(safe-area-inset-top))`。非刘海/浏览器标签页环境 `env()` 为 0，视觉零变化 |
| 触控地板 | `@media (pointer: coarse)` 下可编辑控件（input/select/textarea）字号 **≥16px** —— iOS 对聚焦的更小字号控件整页自动放大，破坏 standalone 布局；桌面维持设计字号不动 |

**审计**：安装性检查（standalone / 图标 192+512+maskable / worker 在作用域根且带 `Service-Worker-Allowed` / 逐图标可达）是门禁脚本的独立步骤，直连审计源站核验并随 scores.json 归档（§15.4）—— 不跑 Lighthouse 也能单独核验这层契约。

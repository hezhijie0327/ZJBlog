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
| 首页 Hero H1 | `font-serif text-4xl sm:text-6xl font-black leading-tight tracking-tight` | `IndexPage` |
| 页面 H1 | `font-serif text-3xl sm:text-4xl font-black tracking-tight` | `SectionHeading level={1}` 与各详情页 |
| 区块 H2 | `font-serif text-2xl sm:text-3xl font-semibold tracking-tight` | `SectionHeading`（level=2 默认） |
| 界面正文 | `text-sm`（说明性文字 `text-xs`） | 全站默认 |
| 元信息 | `META` 片段（mono `text-xs`） | 日期/计数/键位 |
| 长文正文 | `.prose`（Tailwind Typography 默认刻度，衬线正文 + 衬线标题） | `prose.css`；颜色全走 `--tw-prose-*` → token 映射 |
| 装饰水印 | `text-6xl font-black`（`text-accent/20` 或 `.hollow-text`） | 纯装饰，必须 `aria-hidden` |

- 标题一律衬线 + `tracking-tight`；界面正文一律 sans —— 两套排印轨道不混用。
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
| `CHIP` / `MONO_CHIP` | 标签胶囊 / 等宽小号版 | — |
| `CODE_CHIP` | 方角行内代码令牌（算法名/配置键/许可证），12px 元层 | — |
| `PILL` | 13px 控制层胶囊底座（导出条/建议条/媒体触发），调用方追加 `gap-*` 与 hover 色 | hover 由调用方给 |
| `META_TOGGLE` | 结果元行 12px 文本开关（「找到 N 条 · 耗时 X s」） | hover：字色提亮 |
| `SEGMENT` / `SEGMENT_ACTIVE` / `SEGMENT_IDLE` | 分段控制（偏好页页签、信息页页签、行情区间） | 选中：`accent-strong` 填充 |
| `SEGMENT_SM` | 紧凑分段（行内选项组：HTTP 方法、主题样式、行情胶囊） | 同上 |
| `META` | 等宽元信息文字（日期/计数/键位） | — |
| `EYEBROW` | 眉标：等宽 11px 全大写间距标签（标题旁英文点缀、分组小标题） | — |
| `TAPE` | 胶带装饰基底（§7）：`aria-hidden` + `pointer-events-none` 内置，定位/旋转/透明度由调用方给 | — |
| `SECTION` / `SECTION_DETAIL` | 页面级 / 详情页 section 外壳（§6 节奏） | — |

各产品可增自有片段；**同语义在同产品内必须同名**，禁止同语义双别名并存。新增/改名片段必须先更新本表再落码（§17）。

新 UI **先找片段，没有再新增**，禁止在组件里裸写长串类名。

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
| 撕边纸面 `.paper-note` | clip-path 撕边 + 横线纸纹 + 随轮廓 drop-shadow | 平贴会假 —— 微倾斜 ±0.5° 级，方向按位置轮换 |
| 撕边纸条 `.paper-strip` | 按钮形态的撕边纸，纸色经 `--strip` 注入 | 主纸条金底（`--accent-strong`），次纸条纸面色；交错 ±1° 歪斜 |
| 胶带（`TAPE` 片段 + `components/Tape.tsx`） | 半透明 `bg-accent-soft` 矩形，压在纸边之上 | **必须是被裁剪元素（clip-path）的兄弟节点** —— 放在其内部会被撕边裁掉角；两角对压优于单条居中 |
| 马克笔高亮 `.marker-strip` | 文字下半截的撕边金条 | 只扫过关键字，微歪斜 |
| 手绘分隔线 `.paper-chapter` | 章节顶部的 1px 细线，rotate -0.4° | 模拟纸页间手账分隔 |

变化必须是**确定性**的（按序号轮换），禁止随机数 —— SSR 与客户端水合必须一致。

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
- 404 与空状态同构：图标圆盘（`accent-soft` 底）+ 标题 + 灰字说明 + 一个胶囊动作 —— `components/EmptyState.tsx` 单一实现（`bare` 变体承载 404 整页居中，`heading="h1"` 取页面 H1 字号）。

**响应式**

- 断点用 Tailwind 默认：`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280；全站以 `sm:` 为主要切换点（移动优先单列），`md/lg/xl` 只做少量布局修正。
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
| Service Worker | 必须落在**作用域根** `/sw.js`（子目录会让 scope 收窄、控不住页面）；**刻意免缓存**的直通 worker：GET 导航请求网络直通，失败回 503 离线兜底页 —— 构建资产已是哈希文件名 + immutable 长缓存，worker 再缓存一层只会在部署后复活陈旧 bundle（「重建了但页面还在跑旧代码」这类 bug 的半衰期会被拉长一个量级）；缓存策略是后续的显式 opt-in，不许顺手加。worker 本体响应 `Cache-Control: no-cache`（更新随下次加载生效）+ `Service-Worker-Allowed: /`（显式备案作用域） |
| 注册时机 | `load` 事件之后注册、失败静默 —— 安装层绝不挡启动、绝不产生用户可见错误；dev 不注册（残留 worker 会干扰后续 dev 会话） |
| theme-color | SSR 输出 light/dark **双 meta**（`media="(prefers-color-scheme: …)"`，auto 模式零 JS 原生跟随系统，含 OS 实况翻转）；用户显式选择时由 pre-paint 内联脚本收敛为单枚已解析值，此后 `applyThemeStyle` 每次翻调色板同步更新（安装后的 PWA 标题栏与页面同色交叉淡化） |
| 安全区 | `viewport-fit=cover` 露出 `env(safe-area-inset-*)`：sticky 页头 `padding-top: env(safe-area-inset-top)`（毛玻璃延伸进状态栏区）、`body padding-bottom: env(safe-area-inset-bottom)`（页尾让出 Home 指示条）；导航之下的次级 sticky 面（分镜条/TOC/侧栏）与锚点 `scroll-margin-top` 的偏移一律 `calc(原值 + env(safe-area-inset-top))`。非刘海/浏览器标签页环境 `env()` 为 0，视觉零变化 |
| 触控地板 | `@media (pointer: coarse)` 下可编辑控件（input/select/textarea）字号 **≥16px** —— iOS 对聚焦的更小字号控件整页自动放大，破坏 standalone 布局；桌面维持设计字号不动 |

**审计**：安装性检查（standalone / 图标 192+512+maskable / worker 在作用域根且带 `Service-Worker-Allowed` / 逐图标可达）是门禁脚本的独立步骤，直连审计源站核验并随 scores.json 归档（§15.4）—— 不跑 Lighthouse 也能单独核验这层契约。

# AUDIT.md — zjblog audit playbook

ZJBlog 全站审计的可复用手册，沉淀自 2026-09 全量审计（代码结构 / 渲染验证 /
视觉走查 / Lighthouse 双端门禁 / 依赖升级 / 文档同步）。下一轮审计照此执行：
bootstrap → 门禁 → 测试矩阵 → 浏览器测量 → 修复 → 回归 → 文档。

目标设定：**按轮审计，直到一轮审计不再产生新发现为止**。每个修复都要重跑
其影响面的回归 + lint 门禁；每轮结束把新教训落进 AGENTS.md / DESIGN.md
（§17 治理），同一错误不审计两次。

## 1. 环境准备

```sh
pnpm install                       # 唯一 lockfile（pnpm）；无 CI，全部门禁本地跑
pnpm dev                           # dev 服务器 :5175（dev 中间件同构 SSR 整页 + 生成文件）
pnpm run ci                        # lint + tsc + build（每轮开头先跑到绿）
```

- dev 侧内容热更：**`perl -pi` / 原子替换改写 inode 会让 Vite watcher 失灵**，
  改完 content/ 后 `touch` 一次文件，或直接重启 dev；怀疑内容陈旧先 `touch` 再刷新。
- 构建产物验证一律 `pnpm build` 后看 `dist/`（dev 不做图片 webp 改写，属正常）。
- Lighthouse 门禁自带本地静态服务器镜像生产 CDN，不依赖 dev 实例。

## 2. 质量门禁（每轮，浏览器工作之前）

```sh
pnpm lint            # biome check 零错误
pnpm tsc             # strict + noUncheckedIndexedAccess 零错误
pnpm build           # 全路由预渲染成功
pnpm run audit       # Lighthouse 桌面端：sitemap 每页全类别 100 分
LH_FORM_FACTOR=mobile pnpm run audit   # 移动端同样 100 分
```

- audit **不属于常规门禁**（AGENTS.md §Quality Gates）：仅审计轮执行；
  本机需 Chromium/Edge，`CHROME_PATH` 可指定（本机用 Edge：`CHROME_PATH=
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"`）。
- audit 输出里的 `!` 行是 insight（改进机会），不是门禁失败；门禁只看类别分数。
- 已知 insight（接受现状，勿反复追）：`unused-javascript`（页面级 chunk 本来
  就按路由拆分）、`render-blocking-insight`、`cache-insight`、`bf-cache`
  （SPA scrollRestoration 手工接管与审计镜像头的组合，无 unload handler，实际
  bfcache 行为以真实部署为准）。

## 3. 依赖更新（每轮）

```sh
pnpm outdated
pnpm update <pkgs>   # 只动 in-range；锁版本包用 pnpm add -D pkg@<pin>
```

- 升级后：`pnpm run ci` 全绿 → `pnpm run audit` 双端 → 回归受影响面。
- 本项目重依赖的回归点：**mermaid**（渲染测试页 9 张图）、**three**（STL canvas）、
  **shiki**（代码卡双主题）、**katex**（公式 6 处 + 已知错误边界 1 处）、
  **vite/wrangler**（产物结构 + 部署契约）。
- 大版本升级单独立项，不搭审计便车。

## 4. 功能测试矩阵

| 面 | URL / 操作 | 预期 |
|---|---|---|
| 首页 | `/` | Hero 100svh、分镜条 sticky 跟随 + 高亮当前 section、三区块 + 胶带装饰 |
| 列表页 | `/blogs/` `/projects/` `/archives/` | 页题 `SectionHeading level=1`、幽灵日期水印、标签云 |
| 文章页 | `/blogs/markdown-render-test/` | §5 渲染矩阵全绿；复制按钮水合后即当前语言 |
| 标签页 | `/blogs/tags/<tag>/` | 标签过滤列表 + 空状态 |
| 支持页 | `/support/` | 收款码**固定白底**（DESIGN.md §3 登记豁免，勿"修"） |
| 404 | 任意未知路径 | 与空状态同构（EmptyState bare 变体）：图标圆盘 + 404 + 胶囊动作 |
| 明暗 | 主题按钮循环 auto→light→dark | 整页交叉淡化（@property 插值），无散落硬编码色 |
| 语言 | 文A 按钮 zh↔en | `html.lang` 同步、全部 UI 文案翻转、代码卡复制按钮文案跟随 |
| 移动端 | 375×812 | 抽屉 `grid-rows 0fr↔1fr` 开合、`aria-expanded` 同步、无横向溢出 |
| 命令面板 | ⌘K / 搜索按钮 | 懒取索引、`<mark>` 高亮、Enter 导航、ESC 关 + 焦点归还 |
| 灯箱 | 点正文图片 | dialog 上浮动画、ESC/背板关闭、焦点归还触发图 |

### 4.1 加密内容实测（fixture 配方，2026-10 新增）

加密路径平时休眠（内容库可以长期没有 `secret:` 文），**休眠功能必须用临时夹具实测**，
否则与其他构建阶段的交互 bug 不会暴露（2026-10 审计实测出两个：compress-images
删除密文引用的共享图原图；travel 解锁把缓存命名空间带进 .bin 资产名）。配方：

1. **夹具四件套**（本地临时，审计结束删除；`.env` 已 gitignore）：
   - `content/blogs/<slug>.md`：frontmatter 带 `secret: <name>` + 正文含
     h2/h3（TOC）+ KaTeX + 代码块（复制按钮）+ **独占图**（只有本文引用）+
     **共享图**（markdown-render-test 也引用的 `/images/markdown-test/favicon.png`）；
   - `content/travels/<slug>.md`：同 secret 名 + frontmatter `cover`（旅行封面
     也进信封）+ 正文独占图 —— **blogs 与 travels 必须各测一篇**（缓存键
     `travel:` 命名空间是真实差异点）；
   - 一篇**不带 secret** 的旅行带 `cover`（明信片灯箱 + 与近邻坐标触发城市聚簇，
     与既有旅行针脚经纬距离 ≤0.7°）；
   - `.env` 写 `BLOG_SECRET_<NAME>=<≥16 字符>`。
2. **fail-closed 双验**：无 `.env` 构建 → 必须失败；`BLOG_SECRET_<NAME>=short`
   构建 → 必须失败。
3. **dist 泄漏面八扫**（正文哨兵 / summary / description 全 dist grep 应 0；
   rss/sitemap/search-index/llms(.full)/robots 应 0；详情页 noindex + 锁屏应 1；
   page-data 应无 toc/contentHtml/summary/description 且 ciphertext 解不出明文；
   .bin 存在且明文原图已删；列表 payload 仅标题+元信息+locked 标）。
4. **浏览器全流程**：锁屏聚焦输入框 → 错码（`role=alert` + `aria-invalid` +
   输入保留）→ 正码（正文/KaTeX/独占图 blob URL 全就位）→ SPA 换页再回
   （会话缓存还原明文）→ 整页刷新（回锁屏）；EN 语言下解锁，解锁后正文里的
   复制按钮必须显示 "Copy"（水合校正依赖 `[t, html]`）。
5. **dev/生产对齐**：dev 明文独占图 404、.bin 现算；共享图 dev 直服原图。

### 4.2 旅行图集实测（2026-10 新增）

- 地图：SVG `aria-label`（水合后按 UI 语言）、`.lit` 点亮编排结束针脚
  opacity=1、`--map-zoom` 与 transform 联动（放大/复位按钮）。
- **聚簇**：必须有 ≤0.7° 的两针脚夹具——聚合针脚「×× ×N」、点击推进到
  `data-threshold` 倍率、成员与 10m 细节层淡入（`.on`）、组合针脚隐藏（`.off`）、
  成员锚点 `href="#<slug>"` 可跳明信片。
- **重放**：按钮播放期 disabled、结束后恢复；所有针脚 `.on` 点亮；停留 .on 态
  （不回挂 .lit，设计如此）。
- 明信片墙：锁定旅行无封面（占位盘）+ 锁标 + 无摘要；解锁旅行封面点击开灯箱。

## 5. Markdown 渲染矩阵（`/blogs/markdown-render-test/` 逐条验证）

页面级探针（控制台一次性断言，数字为 2026-09 基线）：

```js
(() => { const q = s => document.querySelectorAll(s).length; return {
  mermaid: [...document.querySelectorAll(".mermaid-placeholder")].filter(p => p.querySelector("svg")).length, // 9
  stlCanvas: q(".stl-stage canvas"),            // 1
  katex: q(".katex"),                            // 6
  katexErr: q(".katex-error"),                   // 1（见下方已知边界）
  marks: q(".prose mark"),                       // 2（==高亮== + <mark>）
  callouts: q(".callout"),                       // 43
  details: q(".prose details"),                  // 7
  geoMaps: q(".geo-map"),                        // 2
  plantuml: q(".plantuml-img"),                  // 1
  images: [...document.querySelectorAll(".prose img")].filter(i => i.complete && i.naturalWidth > 0).length, // 6
}})()
```

- **懒渲染必须先滚动触发**：IO 进视口 300px 缓冲才挂 mermaid/three/giscus；
  headless/探针前先做一遍全页步进滚动（每屏 ~250ms），再等首块大依赖编译。
- **已知边界（设计如此，勿当 bug 报）**：
  - `katex-error` ×1：`$\sqrt{\$4}$` —— remark-math 的 `\$` 边界，content.ts
    有注释说明「勿加 hack」；渲染为 danger 红原文，提示作者改写。历史上
    0686022 曾 vendor 过 GFM 数学补丁、74cf26f 有意回退（减手维护面），重启该
    决策需单独立项。
  - `$​100/2$`（零宽空格防公式）：本站按 GFM 展示为含 math 残片的行内文本；
    GitHub 语义对齐属同一已知边界族。
  - `[[wiki链接]]`、`%%注释%%`、`[TOC]`、`H~2~O`：README 矩阵明确不支持/按
    GFM 渲染（`H~2~O` 单波浪 = 删除线，GitHub 同款），原样展示即正确。
- **修复史（2026-09）**：geojson/topojson 曾整幅不渲染（`collectGeometries`
  把收集几何体错误 gate 在 `props.name` 上）——地图类回归直接跑 node 级最小
  用例调 `renderGeoSvg` 最快。

## 6. 浏览器测量配方

**ZCode IAB 三个已知的「假 bug」陷阱**（先排除陷阱再定产品结论）：

1. **渲染管线冻结**：整页 rAF 永不触发（IO 回调、CSS 动画、过渡全部停摆），
   DOM/定时器/evaluate 正常，截图因 CDP 强制出帧而"看起来正常"。
   探测：`new Promise(r => requestAnimationFrame(r))` 与 1.5s 超时 race。
   冻结时 **IO 依赖的懒渲染测量全部作废** —— 换 CDP 直驱的真实 headless
   Chromium（见下），或换新标签页/会话重试。冻结与 `visibility` capability
   无关（实测 reported visible 仍冻结）。
2. **Playwright role/locator 点击超时**：快照明明有目标、`count()===1` 但
   click 30s 超时（连 `force:true` 也超时）—— 改 `tab.cua.click({x,y})`
   坐标点击（先截图定位），或 evaluate 内直接派发。
3. **全页截图 svh 重排**：`fullPage: true` 会把 `100svh` 元素撑成整页高，
   产物出现"内容重复"伪影 —— 视觉走查用固定视口 + 步进滚动截图代替。

**CDP 直驱 headless（懒渲染/交互断言的可靠路径）**：Edge 稳定版 + 裸 CDP
WebSocket（Node 24 原生 WebSocket，chrome-launcher 在本机与 Edge 组合有
端口不通的问题，直接 `spawn` + 轮询 `/json/version` 更稳）。要点：

- `--headless=new` 默认带 GPU 限制：**STL/WebGL 必须去掉 `--disable-gpu`**
  （或加 `--use-angle=metal`），否则 three.js 抛错 → 假 "STL 渲染失败"。
- headless 默认跟随系统 `prefers-color-scheme`（本机深色 → 页面默认暗色）；
  验亮色需显式 `classList.remove("dark")` + `data-theme-mode=light`。
- 交互断言走 evaluate（点击、键盘、断言状态），动画类用
  `getBoundingClientRect` 采样 + `transitionrun/end` 事件计数（参考 searxng
  AUDIT.md §5 的 sampler）。

## 7. 代码审计维度（扫查清单）

并行派 Explore 只读代理 + 自查，覆盖：

0. **结构/命名/复用**：死导出（逐个 grep 验证再删，**含内容文件引用检查** ——
   `/test/favicon.png` 曾被误判调试残留，实为渲染测试文的图片素材，测试素材
   应放 `public/images/`）；重复实现收拢（单元素 IO → `useInView`、主题监听 →
   `watchThemeDark`、装饰 → 片段/组件）；近亲组件合并（PageHeading+SectionHeading
   → `SectionHeading level`，EmptyState+404 → `EmptyState bare/heading`）。
1. **性能**：重依赖惰性边界、页面级 chunk、CSS 单文件（`dist/assets/main-*.css`）、
   持续动画随视口启停、**无 content-visibility:auto**（AGENTS.md 禁令）。
2. **动画完整性**：每个条件渲染面有进出动画 + 超时兜底；每个披露件有
   `aria-expanded`；`animate-hint-bob` 等循环动画随视口启停。
3. **i18n**：EN/zh 键集 diff 为空；逐键 grep 使用方；硬编码用户可见串仅限
   白名单（品牌名、协议名、ESC/404 键帽、OG 截图基线、构建期 SVG 内容层文案
   —— 地图针脚 `<title>`/聚合标签，svg aria-label 由客户端水合校正）；
   构建期 HTML 内的文案（复制按钮）必须在水合时按当前语言校正，**运行时注入
   的 HTML（解锁明文）同样要校正**（Prose 的校正 effect 必须依赖 `html`）。
4. **设计 token**：亮/暗双扫、无裸 hex（豁免以 DESIGN.md §3 登记为准），
   `dark:` 零使用（图标显隐走 `[data-theme-mode]`）。
4b. **加密泄漏面（审计轮 + 改动加密管线时）**：§4.1 的 dist 八扫 +
   `grep -c "audit-locked" dist/{rss.xml,sitemap.xml,search-index.json,llms.txt,llms-full.txt}`
   全 0；compress-images 日志应出现 `kept (referenced by locked post envelope)`
   行（有共享图时）；构建日志 `sealed N` 数与独占图数一致。
4c. **跨构建阶段交互**：功能分布在不同构建阶段（content 编译 → prerender →
   compress）时，夹具必须**贯穿全链路构建后检查产物**，只测 dev 不够
   （compress 只发生在生产构建，dev 永远服务原图 —— 2026-10 的共享图 404
   就是 dev 全绿、生产必坏）。
5. **构建契约**：types.ts 是跨端契约单一来源（TocItem/SearchItem/LockedContent/
   TRAVEL_MAP_SIZE 无第二定义）；生成器双管线（dev 中间件 + prerender）同步登记。
6. **文档一致性**：styles.ts 片段 = DESIGN.md §5 表；架构树 = 实际文件；
   README 矩阵 = 渲染实测。「文档与实现不一致按 bug 处理」。

## 8. 环境陷阱清单

- `pnpm audit`（无 run）是 pnpm 安全审计，不是本项目门禁。
- audit 需本机 Chromium/Edge；审计轮先 `pnpm build`。
- **perl -pi 改 md → watcher 失灵**：touch 或重启 dev（§1）。
- IAB 渲染冻结 / locator 死 / fullPage svh 伪影（§6）—— 三类假 bug 先排除。
- headless `--disable-gpu` 会制造假的 STL 失败（§6）。
- PlantUML 是外链公共渲染服务（plantuml.com），离线审计时该图必挂 ——
  断言 `img` 存在即可，勿断言 `naturalWidth`。
- 深色系统下 headless 默认暗色主题（§6），亮色断言需显式注入。
- **headless 无剪贴板权限**：点复制按钮走 `navigator.clipboard` 失败 →
  execCommand 兜底在无头态也返回 false，`data-copied` 不置位 —— 环境限制
  非 bug，断言按钮文案/委托路径即可。
- **合成 KeyboardEvent 不触发原生 `<dialog>` 的 ESC 关闭**（浏览器把 ESC 走
  cancel 默认行为）；测灯箱 ESC 用 CDP `Input.dispatchKeyEvent` 或改断言
  关闭按钮/背板点击路径。
- **CDP `Page.navigate` 是整页加载**：会清掉会话内存态（解锁缓存等）——
  测 SPA 会话行为必须在同一页面生命周期内用页内点击换页。
- `pnpm run ci` 管道接 `| tail` 会用 tail 的退出码伪装全绿（2026-10 实锤：
  HEAD 带着 lint 错误「通过」了 bootstrap）——门禁命令用 `set -o pipefail`
  或直接看输出。

## 9. 收尾闭环

1. 修复 → `pnpm run ci` → 影响面回归（渲染矩阵 §5 / 交互矩阵 §4）→
   Lighthouse 双端（审计轮）。
2. 每轮把新教训落文档：AGENTS.md（约定 + 一句话教训）、DESIGN.md（片段/豁免
   先登记后落码）、本文件（新陷阱/新配方追加到对应节）。
3. 提交风格：约定式粒度提交（`fix(scope): …` / `refactor(ui): …` / `chore: …` / `[docs] …`，以 git log 实际历史为准），文档与代码分开；不提交构建产物（dist/、.lighthouse-archive/ 已 ignore）。

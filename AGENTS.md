# AGENTS.md - Development Guide for Agentic Coding

AI agent 开发指南。修改代码前先读完本文件。设计语言与品牌规范见 **[DESIGN.md](./DESIGN.md)**；全站审计的执行手册与历史教训见 **[AUDIT.md](./AUDIT.md)**。

## Essential Commands

```bash
# 开发服务器（Vite，http://localhost:5175；dev 中间件与生产同构地 SSR 整页，
# 并同构地产出 rss/sitemap/search-index 等生成文件 —— 命令面板/RSS 在 dev 可用）
pnpm dev

# 生产构建（vite build → vite build --ssr → scripts/prerender.mjs 预渲染全部路由 + 静态资源 → dist/）
pnpm build

# Biome 检查（lint + 格式；pnpm lint:fix 自动修复）
pnpm lint

# 类型检查
pnpm tsc

# Lighthouse 审计：对 sitemap 中每个页面审计，全类别必须 100 分
pnpm run audit                        # 桌面端（默认）
LH_FORM_FACTOR=mobile pnpm run audit  # 移动端；需先 pnpm build，本机需 Chromium/Edge（CHROME_PATH 可指定）
LH_ONLY=/blogs,/support pnpm run audit # 只审计路径前缀匹配的页面（快速迭代）

# 完整本地检查（lint + tsc + build）
pnpm run ci
```

无测试框架；质量门禁 = tsc + biome + build：本地跑 `pnpm run ci`，push 到 main 后由 GitHub Actions（`.github/workflows/deploy.yml`）跑同一套门禁并自动部署。包管理器 **pnpm**（唯一 lockfile）。

## Architecture

**Vite 8 + React 19 纯 SPA**：每条路由构建期预渲染完整 HTML（`dist/<route>/index.html`，内嵌 `<script id="page-data">` JSON payload）；站内导航由 fetch-and-swap 路由接管（拦截链接 → fetch 目标页 → 提取 payload → pushState）。部署到 Cloudflare Workers Static Assets（`wrangler.jsonc` → `./dist`，`not_found_handling: "404-page"`）。

```
src/
├── main.tsx / app.tsx   # 启动引导（水合前预取页面 chunk）；Provider 树；payload 守卫分发（isXxxData）
├── pages/               # *Page.tsx + registry.ts（每页一个 chunk；客户端懒取块，SSR 同步渲染）
├── features/
│   ├── comments/        # GiscusComments.tsx（giscus，进视口才挂载 iframe）
│   └── markdown/        # Prose（注入构建期 HTML + 复制/灯箱委托 + KaTeX 样式补注）
│                        # + MermaidRenderer / StlViewer（进视口懒加载，离屏停帧）
├── components/          # Shell(Link/ProgressBar/骨架) Navigation Footer CommandPalette
│                        # ThemeToggle SectionHeading icons
├── lib/
│   ├── router.tsx       # fetch-and-swap SPA 路由（pushState/popstate/回退整页/会话缓存）
│   ├── pageData.ts      # payload 提取（内嵌/DOMParser）
│   ├── types.ts         # payload 判别联合 + 类型守卫 + 跨端共享契约（SearchItem 等）
│   ├── theme.ts         # 明暗（localStorage + html.dark + pre-paint 内联脚本防闪烁；watchThemeDark 主题订阅）
│   ├── useInView.ts     # 进视口检测（懒挂载 once / 持续跟踪；单元素观察统一走此封装）
│   ├── i18n.ts + i18n/  # EN 基准词库 + zh-CN；useT/translateFor
│   ├── styles.ts        # 设计片段单一来源（DESIGN.md §5）
│   └── cn / format / link
├── styles/              # global.css 入口 → tokens → base → prose → behaviors
│                        # （KaTeX 样式不在入口：仅 needsKatex 页面按 /katex.min.css 注入）
└── config/site.ts       # 站点元数据、社交链接、giscus（个人内容）
tools/
├── content.ts           # 构建期内容管线：frontmatter + 编译 HTML + TOC + needsKatex/图片尺寸注入
├── payloads.ts          # 路由 → payload（含 title/description/OG）
├── generators.ts        # rss/sitemap/robots/search-index/llms/llms-full/manifest 生成器
└── ssr.tsx              # SSR 整页组装（dev 中间件与预渲染共用；含 KaTeX 按需注入）
scripts/
├── prerender.mjs        # 预渲染全部路由 + 落盘静态资源到 dist/
└── audit.mjs            # Lighthouse 双端门禁（本地静态服务器镜像生产 CDN：压缩、缓存、404 语义、sw.js 头）+ PWA 安装性检查
```

## Content

- `content/blogs/*.md` frontmatter：`title/description/date/category/tags/summary/draft`；`content/projects/*.md` 另有 `type: personal|starred`、`link`、`image`（封面图，缺省时列表/详情不渲染封面位）。
- **frontmatter 日期**：建议 ISO 字符串（`date: "2024-12-21"`）；无引号日期（`date: 2024-12-21`）会被 gray-matter 解析成 `Date` 实例，`parseDate` 已兼容两者 —— 修改解析逻辑时不得破坏此行为（曾致日期被静默丢弃）。
- Markdown 在**构建期**编译为 HTML：shiki 双主题高亮代码卡、KaTeX、mermaid/sequence/flow 占位容器（客户端进视口渲染）、geojson/topojson 构建期 SVG、plantuml lazy img、Callouts、表格滚动容器、任务清单 aria-hidden、`rehypeLocalImageSize` 为站内图片注入固有尺寸（防 CLS）。
- 完整语法支持矩阵见 README。
- 每条路由的 payload 由 `tools/payloads.ts` 生成；新增页面类型 = types.ts 加 payload + 守卫 → payloads.ts 加分支 → pages/ 加页面 → app.tsx 分发。
- 中文 slug：URL 用 `encodeURIComponent`，磁盘/查找用解码后的原始 slug（content.ts 已处理）。
- **旅行（/travels/）**：`content/travels/*.md`（place/coords [lng,lat]/endDate/companion couple|solo/cover/link + 正文故事），frontmatter `secret` 可上锁（详情锁屏 + 封面/独占图加密，针脚与地名/日期保持公开纪念层）。/travels/ 的地图由 `tools/travelMap.ts` 构建期投影 world-atlas（110m 主图 + 10m 市内细节）为**单份内联 SVG**（存 `#travel-map` DOM，page-data 经 slimForClient 剥离、pageData.ts 回填；画布尺寸走 types.ts 的 `TRAVEL_MAP_SIZE` 契约）；市内旅行（经纬距离 ≤0.7°）在主图聚合为「城市 ×N」组合针脚，10m 细节层按成员 bbox 裁选烘进主图并带 `data-threshold`，倍率达标才淡入（组合针脚同倍率反向隐藏）；逐站点亮有纯 CSS 初始编排（.travel-map.lit + --seq，global.css）；「重放」是 JS 镜头跟拍（useMapZoom 的 flyTo 逐站飞行：聚合站推进到市/区视角点亮成员，单站 pop，data-stops 编排由构建期下发、城市站携带 id 供成员回查点亮序号；动画用 setTimeout 驱动，后台标签页不卡死；重放后地图停留在 .on 点亮态，不回挂 .lit）。地图支持缩放/平移（TravelsPage 的 useMapZoom：滚轮/双指/拖拽/双击/按钮；初始视野自动适配针脚包围盒，针脚与标签经 calc(1/var(--map-zoom)) 反缩放保持恒定大小，线条 non-scaling-stroke；四个控制按钮必须 aria-label）。SVG 的 aria-label 构建期为中文基准，客户端水合后按当前 UI 语言校正（`travel.mapLabel`，同复制按钮模式）；针脚 `<title>`/聚合标签属内容层中文基准（i18n 白名单）。页面 kind = `travels`/`travel`。
- **加密博文/旅行**：frontmatter 加 `secret: <name>`（→ 环境变量 `BLOG_SECRET_<NAME>`，查 process.env → `.env.local` → `.env`；`.env*` 已 gitignore，模板见 `.env.example`）。构建期用 Argon2id（64MiB/t3/p1，参数随信封存档）+ AES-256-GCM 把正文 HTML+TOC 加密进 `post.locked` 信封（`tools/crypto.ts` 加密、`src/lib/locked.ts` 解密，解锁态仅会话内存、刷新即重锁）。**fail-closed：缺口令或口令 <8 字符直接构建失败，绝不降级明文**。锁定文的正文/toc/summary/description 不进任何 payload，且从 RSS / sitemap / search-index / llms.txt / llms-full.txt 排除，页面 noindex、跳过 JSON-LD；列表仅标题 + 锁标。**独占图加密**：只被锁定文引用的图片构建期加密为 `<路径>.<slug>.bin` 并删除 dist 明文（`tools/lockedImages.ts`，sharp→webp 后复用该文密钥，IV 表随正文信封存档；dev 中间件明文 404、现算 .bin；.bin 文件名用**裸 slug**，客户端 `unlockPost(cacheKey, …, assetSlug)` 把缓存命名空间键与资产名分离——混用会让 .bin 请求永远 404）；被公开内容共享的图无法加密、保持明文并告警——prerender 落 `.locked-shared-images.json` 清单、compress-images 据此跳过转换保留原扩展名文件（信封密文里的引用改写不到，原图被删则解锁后共享图 404；清单读后即删不进发布物）；私密照片必须用加密文独占的文件；密文唯一防线是口令强度（建议 ≥16 字符）。图片引用表以 `<kind>:<slug>` 命名空间为键（blogs/travels 同名 slug 互不覆盖）；同名 slug 的两篇加密文独占同一图会撞 .bin 资产名，构建期直接报错要求改 slug。

## PWA（standalone 适配）

安装层契约见 **DESIGN.md §18**（ZJSearch 试点、本站跟进），实现落点：

- **manifest**：`tools/generators.ts` 的 `generateManifest()`（siteConfig 单一来源），预渲染落盘 + dev 中间件同构伺服（vite.config.ts `GENERATED_FILES`）；颜色锁固定浅色基准 `#faf9f6`，图标矩阵见 `public/`（favicon.svg + icon-192/512 + maskable-512，sharp 从 favicon.svg 栅格化，配方在 §2.2/§18）。
- **Service Worker**：`public/sw.js` 直通 worker（GET 导航网络直通 + 503 离线兜底页），**刻意免缓存** —— 静态资产已 immutable、worker 缓存只会在部署后复活陈旧 bundle；缓存策略是后续显式 opt-in。导航 fetch 失败先短延迟重试两轮再落兜底（iOS 独立壳冷启动的 WebKit flake：在线但首导航 fetch 立刻 reject）；兜底页带「重试」按钮、明暗双档。头（`Cache-Control: no-cache` + `Service-Worker-Allowed: /`）在 `public/_headers`，audit 静态服务器镜像同一头。`main.tsx` 在 `load` 后注册（仅 `import.meta.env.PROD`、失败静默）。
- **theme-color**：SSR 输出 light/dark 双 meta（media 查询）；显式主题由 `THEME_BOOTSTRAP` 预 paint 收敛为单枚，`applyThemeStyle` 翻调色板时同步（`src/lib/theme.ts`，色值常量 `THEME_COLOR_LIGHT/DARK` 单一来源）。
- **standalone 布局**：`viewport-fit=cover`（ssr.tsx）+ `.app-bar`（Navigation）顶部安全区 inset + body 底部 inset；导航之下的次级 sticky 面（StoryBar/TOC/BlogsPage 侧栏）与 `[id]` 的 `scroll-margin-top` 偏移一律 `calc(原值 + env(safe-area-inset-top))` —— 新增 sticky 面照此办理。触控地板：`@media (pointer: coarse)` 下 input/select/textarea 16px（iOS 聚焦缩放地板，base.css）。
- **安装入口**：`src/lib/installPrompt.ts` 模块级捕获 `beforeinstallprompt`（派发早于水合）；页脚「安装 App」按钮（`footer.installApp` 词库键）仅在可安装时渲染，`prompt()` 一次性消费、`appinstalled` 清槽；iOS 不派发事件、按钮永不出现。

## Conventions

- **仅命名导出**（零 default export）；组件 PascalCase.tsx；lib 辅助模块小写 topic 命名；hook 就近领域文件。
- 导入：`@/` 别名 + 显式扩展名（`@/lib/i18n.ts`）；`verbatimModuleSyntax`，type-only 导入必须 `import type`。
- TypeScript strict（含 `noUncheckedIndexedAccess`），禁 `any`（外部响应用 `Raw*` 接口收窄）。
- 颜色一律 token（DESIGN.md §3）；重复类名一律 `lib/styles.ts` 片段；零 webfont；`dark:` 只用于图标显隐。
- **禁止 `localeCompare` 排序任何参与 SSR 的数据**：Node 与浏览器 ICU collation 不一致会导致水合文本不匹配（React #418，曾挂 best-practices 门禁）。排序用 codepoint 比较（`a < b ? -1 : …`）。
- 重依赖必须惰性：进视口才加载（先例：Mermaid ~2.7MB、three.js、KaTeX 样式按页、giscus iframe），单元素观察统一用 `lib/useInView.ts` 的 `useInView`（`{ once: true }` 懒挂载 / 持续跟踪两用）；多目标/命令式观察器（TOC scrollspy 逐标题跟踪、STL 渲染循环停启）允许手写 IntersectionObserver，但卸载时必须 disconnect。**持续动画（如 STL 自转）必须随视口启停**（离屏 `setAnimationLoop(null)`），否则长文页持续吃 CPU。**禁止给 `.prose` 等长内容容器加 `content-visibility: auto`**：Chromium 146+/Edge 153 实测「相关度」不再触发展开，长文在 `contain-intrinsic-size` 占位高度处被裁断（正文 92% 不可达；2026-09 审计在 Electron 41 与 Edge 153 双双复现后移除，教训详见 AUDIT.md）。
- 懒组件的关闭路径若依赖 `animationend`（如 CommandPalette 退出动画），必须加超时兜底 —— 渲染管线冻结/事件丢失时 UI 会滞留。
- 图标：lucide-react；品牌图标（GitHub）用 `components/icons.tsx` 内联 SVG。
- 图片：`public/images/` 存**原始** PNG/JPG（不做本地预压缩）；最终产物一律 **webp**（对齐 Lab/Web）——`pnpm build` 在 prerender 后用 `scripts/compress-images.mjs`（sharp）把 `dist/images` 的 jpg/png 转为同名 webp（限宽 1920、q80），并改写 dist 内 `.html/.xml/.txt` 的引用；加密文引用的共享明文图按 `.locked-shared-images.json` 清单跳过（见 Content 的加密条目）；`pnpm run img` 可单独执行。正文引用原始扩展名 `/images/x.jpg` 即可（dev 服务原图）。
- 可访问性：图标按钮必须 `aria-label`；当前导航项 `aria-current="page"`；装饰元素 `aria-hidden`；正文半透明前景色（color-mix 带 alpha）会导致对比度无法判定而挂审计 —— 关键文字显式用 token 实色。

## Quality Gates

1. `pnpm tsc` 零错误
2. `pnpm lint`（biome）零错误
3. `pnpm build` 成功（全部路由预渲染）
4. `pnpm run audit`（桌面）与 `LH_FORM_FACTOR=mobile pnpm run audit`（移动）每页全类别 100 分（性能/可访问性/最佳实践/SEO/Agentic Browsing；压缩用 brotli 镜像生产 CDN）——**不属于常规门禁，不是每次改动都要跑**：仅在用户明确要求审计时执行；注意 headless Chrome 连跑多页会不稳，audit 脚本每 4 页自动重启浏览器
5. 注意 `pnpm audit`（无 run）是 pnpm 内置安全审计，不是本项目的门禁

## Deployment

`pnpm build` → `pnpm deploy`（= `wrangler deploy`，锁在 devDependencies；wrangler.jsonc 指向 ./dist；未知路径服用 404.html）。wrangler.jsonc 开了运行时 `cache.enabled`（边缘缓存 Worker 响应；`cross_version_cache` 保持默认关 —— 缓存按 Worker 版本隔离，每次 deploy 自动换新，不存在陈旧窗口）。robots.txt / sitemap.xml / rss.xml / search-index.json / llms.txt / manifest.json / katex.min.css(+fonts/) 由预渲染阶段生成到 dist/；根目录不要放静态文件（走 `public/`）。

**自动部署（GitHub Actions）**：push 到 main 自动跑 `.github/workflows/deploy.yml` —— `pnpm install --frozen-lockfile` → `pnpm run ci`（lint + tsc + build 门禁）→ `pnpm run deploy`；同分支并发部署互斥（新提交顶掉旧的），也可在 Actions 页手动触发。仓库 Secrets 需配 `CLOUDFLARE_API_TOKEN`（"Edit Cloudflare Workers" 模板）与 `CLOUDFLARE_ACCOUNT_ID`（wrangler.jsonc 未写 account_id，CI 必须显式给）。锁定文口令走 `BLOG_SECRET_<NAME>`：fail-closed 意味着**加了锁定文而 CI 没配对应 Secret 会直接构建失败**——新增锁定文时同步在 Secrets 配好并在 build 步骤透传（workflow 头注有操作说明）。

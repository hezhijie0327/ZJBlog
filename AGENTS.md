# AGENTS.md - Development Guide for Agentic Coding

AI agent 开发指南。修改代码前先读完本文件。设计语言与品牌规范见 **[DESIGN.md](./DESIGN.md)**。

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

无测试框架；质量门禁 = tsc + biome + build，全部本地运行（无 CI）。包管理器 **pnpm**（唯一 lockfile）。

## Architecture

**Vite 8 + React 19 纯 SPA，与 ZJSearch（`~/searxng/client/zjsearch`）同构**：每条路由构建期预渲染完整 HTML（`dist/<route>/index.html`，内嵌 `<script id="page-data">` JSON payload）；站内导航由 fetch-and-swap 路由接管（拦截链接 → fetch 目标页 → 提取 payload → pushState）。部署到 Cloudflare Workers Static Assets（`wrangler.jsonc` → `./dist`，`not_found_handling: "404-page"`）。

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
│   ├── types.ts         # payload 判别联合 + 类型守卫（客户端契约）
│   ├── theme.ts         # 明暗（localStorage + html.dark + pre-paint 内联脚本防闪烁）
│   ├── i18n.ts + i18n/  # EN 基准词库 + zh-CN；useT/translateFor
│   ├── styles.ts        # 设计片段单一来源（DESIGN.md §8）
│   └── cn / format / link
├── styles/              # global.css 入口 → tokens → base → prose → behaviors
│                        # （KaTeX 样式不在入口：仅 needsKatex 页面按 /katex.min.css 注入）
└── config/site.ts       # 站点元数据、社交链接、giscus（个人内容）
tools/
├── content.ts           # 构建期内容管线：frontmatter + 编译 HTML + TOC + needsKatex/图片尺寸注入
├── payloads.ts          # 路由 → payload（含 title/description/OG）
├── generators.ts        # rss/sitemap/robots/search-index/llms/llms-full 生成器
└── ssr.tsx              # SSR 整页组装（dev 中间件与预渲染共用；含 KaTeX 按需注入）
scripts/
├── prerender.mjs        # 预渲染全部路由 + 落盘静态资源到 dist/
└── audit.mjs            # Lighthouse 双端门禁（本地静态服务器镜像生产 CDN：压缩、缓存、404 语义）
```

## Content

- `content/blogs/*.md` frontmatter：`title/description/date/category/tags/summary/draft`；`content/projects/*.md` 另有 `type: personal|starred`、`link`、`image`（封面图，缺省时列表/详情不渲染封面位）。
- **frontmatter 日期**：建议 ISO 字符串（`date: "2024-12-21"`）；无引号日期（`date: 2024-12-21`）会被 gray-matter 解析成 `Date` 实例，`parseDate` 已兼容两者 —— 修改解析逻辑时不得破坏此行为（曾致日期被静默丢弃）。
- Markdown 在**构建期**编译为 HTML：shiki 双主题高亮代码卡、KaTeX、mermaid/sequence/flow 占位容器（客户端进视口渲染）、geojson/topojson 构建期 SVG、plantuml lazy img、Callouts、表格滚动容器、任务清单 aria-hidden、`rehypeLocalImageSize` 为站内图片注入固有尺寸（防 CLS）。
- 完整语法支持矩阵见 README。
- 每条路由的 payload 由 `tools/payloads.ts` 生成；新增页面类型 = types.ts 加 payload + 守卫 → payloads.ts 加分支 → pages/ 加页面 → app.tsx 分发。
- 中文 slug：URL 用 `encodeURIComponent`，磁盘/查找用解码后的原始 slug（content.ts 已处理）。

## Conventions

- **仅命名导出**（零 default export）；组件 PascalCase.tsx；lib 辅助模块小写 topic 命名；hook 就近领域文件。
- 导入：`@/` 别名 + 显式扩展名（`@/lib/i18n.ts`）；`verbatimModuleSyntax`，type-only 导入必须 `import type`。
- TypeScript strict（含 `noUncheckedIndexedAccess`），禁 `any`（外部响应用 `Raw*` 接口收窄）。
- 颜色一律 token（DESIGN.md §3）；重复类名一律 `lib/styles.ts` 片段；零 webfont；`dark:` 只用于图标显隐。
- **禁止 `localeCompare` 排序任何参与 SSR 的数据**：Node 与浏览器 ICU collation 不一致会导致水合文本不匹配（React #418，曾挂 best-practices 门禁）。排序用 codepoint 比较（`a < b ? -1 : …`）。
- 重依赖必须惰性：进视口才加载（先例：Mermaid ~2.7MB、three.js、KaTeX 样式按页、giscus iframe）。**持续动画（如 STL 自转）必须随视口启停**（离屏 `setAnimationLoop(null)`），否则长文页持续吃 CPU。
- 懒组件的关闭路径若依赖 `animationend`（如 CommandPalette 退出动画），必须加超时兜底 —— 渲染管线冻结/事件丢失时 UI 会滞留。
- 图标：lucide-react；品牌图标（GitHub）用 `components/icons.tsx` 内联 SVG。
- 图片：`public/images/` 存**原始** PNG/JPG（不做本地预压缩）；`pnpm build` 在 dist 阶段用 `scripts/compress-images.mjs`（sharp）对 `dist/images` 就地压缩 —— 限宽 1920、JPEG q78 mozjpeg / PNG palette、变小才替换，原图始终留在仓库；`pnpm run img` 可单独执行（需先 build）。
- 可访问性：图标按钮必须 `aria-label`；当前导航项 `aria-current="page"`；装饰元素 `aria-hidden`；正文半透明前景色（color-mix 带 alpha）会导致对比度无法判定而挂审计 —— 关键文字显式用 token 实色。

## Quality Gates

1. `pnpm tsc` 零错误
2. `pnpm lint`（biome）零错误
3. `pnpm build` 成功（全部路由预渲染）
4. `pnpm run audit`（桌面）与 `LH_FORM_FACTOR=mobile pnpm run audit`（移动）每页全类别 100 分（性能/可访问性/最佳实践/SEO/Agentic Browsing；压缩用 brotli 镜像生产 CDN）——**不属于常规门禁，不是每次改动都要跑**：仅在用户明确要求审计时执行；注意 headless Chrome 连跑多页会不稳，audit 脚本每 4 页自动重启浏览器
5. 注意 `pnpm audit`（无 run）是 pnpm 内置安全审计，不是本项目的门禁

## Deployment

`pnpm build` → `wrangler deploy`（wrangler.jsonc 指向 ./dist；未知路径服用 404.html）。robots.txt / sitemap.xml / rss.xml / search-index.json / llms.txt / katex.min.css(+fonts/) 由预渲染阶段生成到 dist/；根目录不要放静态文件（走 `public/`）。

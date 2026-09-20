# AGENTS.md - Development Guide for Agentic Coding

AI agent 开发指南。修改代码前先读完本文件。设计语言与品牌规范见 **[DESIGN.md](./DESIGN.md)**。

## Essential Commands

```bash
# 开发服务器（Vite，http://localhost:5175；dev 中间件与生产同构地 SSR 整页）
pnpm dev

# 生产构建（vite build → vite build --ssr → scripts/prerender.mjs 预渲染 22 路由 + 静态资源 → dist/）
pnpm build

# Biome 检查（lint + 格式；pnpm lint:fix 自动修复）
pnpm lint

# 类型检查
pnpm tsc

# Lighthouse 门禁：对 sitemap 中每个页面审计，全类别必须 100 分
pnpm run audit         # 需先 pnpm build；本机需有 Chromium（CHROME_PATH 可指定）

# 完整本地检查（lint + tsc + build）
pnpm run ci
```

无测试框架；质量门禁 = tsc + biome + Lighthouse，全部本地运行（无 CI）。包管理器 **pnpm**（唯一 lockfile）。

## Architecture

**Vite 8 + React 19 纯 SPA，与 ZJSearch（`~/searxng/client/zjsearch`）同构**：每条路由构建期预渲染完整 HTML（`dist/<route>/index.html`，内嵌 `<script id="page-data">` JSON payload）；站内导航由 fetch-and-swap 路由接管（拦截链接 → fetch 目标页 → 提取 payload → pushState）。部署到 Cloudflare Workers Static Assets（`wrangler.jsonc` → `./dist`，`not_found_handling: "404-page"`）。

```
src/
├── main.tsx / app.tsx   # 启动引导；Provider 树；payload 守卫分发（isXxxData）
├── pages/               # *Page.tsx + lazyPages.ts（次级页面按需加载；首页/404 急加载）
├── features/
│   ├── comments/        # GitHubComments.tsx + api.ts（客户端懒取数）
│   └── markdown/        # Prose（注入构建期编译的 HTML）+ MermaidRenderer（进视口懒加载）
├── components/          # Shell(Link/ProgressBar/骨架) Navigation Footer CommandPalette
│                        # ThemeToggle SectionHeading icons
├── lib/
│   ├── router.tsx       # fetch-and-swap SPA 路由（pushState/popstate/回退整页）
│   ├── pageData.ts      # payload 提取（内嵌/DOMParser）
│   ├── types.ts         # payload 判别联合 + 类型守卫（客户端契约）
│   ├── theme.ts         # 明暗（localStorage + html.dark + pre-paint 内联脚本防闪烁）
│   ├── i18n.ts + i18n/  # EN 基准词库 + zh-CN；useT/translateFor
│   ├── styles.ts        # 设计片段单一来源（DESIGN.md §6）
│   └── cn / format / link
├── styles/              # global.css 入口 → tokens → base → prose → behaviors
└── config/site.ts       # 站点元数据、社交链接、Hero（个人内容）
tools/
├── content.ts           # 构建期内容管线：content/*.md → frontmatter + 编译 HTML（Node 专用）
├── payloads.ts          # 路由 → payload（含 title/description/OG）
├── generators.ts        # rss/sitemap/robots/search-index/llms/llms-full 生成器
└── ssr.tsx              # SSR 整页组装（dev 中间件与预渲染共用）
scripts/
├── prerender.mjs        # 预渲染全部路由 + 落盘静态资源到 dist/
└── audit.mjs            # Lighthouse 门禁（本地静态服务器镜像生产 CDN 行为）
```

## Content

- `content/blogs/*.md` frontmatter：`title/description/date/category/tags`；`content/projects/*.md` 另有 `type: personal|starred`、`link`（GitHub 仓库自动解析 owner/repo 供评论区）、`image`（已预留未消费）。
- Markdown 在**构建期**编译为 HTML（remark-gfm；mermaid 代码块替换为占位容器，客户端进视口才渲染；GFM 复选框构建期补 aria-hidden）。
- 每条路由的 payload 由 `tools/payloads.ts` 生成；新增页面类型 = types.ts 加 payload + 守卫 → payloads.ts 加分支 → pages/ 加页面 → app.tsx 分发。
- 中文 slug：URL 用 `encodeURIComponent`，磁盘/查找用解码后的原始 slug（content.ts 已处理）。

## Conventions

- **仅命名导出**（零 default export）；组件 PascalCase.tsx；lib 辅助模块小写 topic 命名；hook 就近领域文件。
- 导入：`@/` 别名 + 显式扩展名（`@/lib/i18n.ts`）；`verbatimModuleSyntax`，type-only 导入必须 `import type`。
- TypeScript strict（含 `noUncheckedIndexedAccess`），禁 `any`（外部响应用 `Raw*` 接口收窄）。
- 颜色一律 token（DESIGN.md §2）；重复类名一律 `lib/styles.ts` 片段；零 webfont；`dark:` 只用于图标显隐。
- 重依赖必须惰性：进视口才加载（先例：Mermaid、GitHub 评论数据）。
- 图标：lucide-react；品牌图标（GitHub）用 `components/icons.tsx` 内联 SVG。
- 可访问性：图标按钮必须 `aria-label`；当前导航项 `aria-current="page"`；装饰元素 `aria-hidden`。

## Quality Gates

1. `pnpm tsc` 零错误
2. `pnpm lint`（biome）零错误
3. `pnpm build` 成功（22+ 路由全部预渲染）
4. `pnpm run audit` 每页全类别 100 分（性能/可访问性/最佳实践/SEO/Agentic Browsing）；改样式、加依赖、动路由后必须跑
5. 注意 `pnpm audit`（无 run）是 pnpm 内置安全审计，不是本项目的门禁

## Deployment

`pnpm build` → `wrangler deploy`（wrangler.jsonc 指向 ./dist；未知路径服用 404.html）。robots.txt / sitemap.xml / rss.xml / search-index.json / llms.txt 由预渲染阶段生成到 dist/；根目录不要放静态文件（走 `public/`）。

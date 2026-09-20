# AGENTS.md - Development Guide for Agentic Coding

AI agent 开发指南。修改代码前先读完本文件。

## Essential Commands

```bash
# 开发服务器（Windows 兼容，无环境变量前缀）
npm run dev

# 生产构建（静态导出到 out/）
npm run build

# ESLint
npm run lint

# 类型检查
npx tsc --noEmit

# Lighthouse 门禁：对 sitemap 中每个页面审计，全类别必须 100 分
npm run audit          # 需先 npm run build；本机需有 Chromium

# 完整本地检查（lint + build）
npm run ci
```

无测试框架；质量门禁 = tsc + eslint + Lighthouse，全部在本地开发时运行（无 CI，GitHub Actions 工作流已移除）。

## Architecture

Next.js 16 App Router，`output: "export"` 全静态导出，部署到 Cloudflare Workers Static Assets（`wrangler.jsonc`，部署目录 `./out`）。内容系统：`content/<type>/*.md` + gray-matter（见 src/lib/content.ts）。

```
src/
├── app/               # 路由：/ /blogs /blogs/[slug] /projects /projects/[slug]
│                      #       /archives /donation
│                      # 静态资源路由：/rss.xml /search-index.json /sitemap.xml /robots.txt
├── components/        # 页面组件（无 shadcn/ui 依赖）
├── config/site.ts     # 站点元数据、社交链接、Hero 文案、时间线（个人内容）
└── lib/
    ├── content.ts     # 内容加载（fs + gray-matter + reading-time）
    ├── github.ts      # GitHub API（评论区客户端懒取数，5 分钟内存缓存；禁止注入 token）
    ├── i18n.ts        # UI 文案字典 + t()（类型安全）
    ├── styles.ts      # 设计语言类片段单一来源（ICON_BTN/CARD/BTN_*/CHIP/META/SECTION）
    └── utils.ts       # cn / formatDate / formatDateISO / hostOf
```

## Design Language（对齐 ZJSearch）

- **Token**：全部颜色走 `src/app/globals.css` 的 CSS 变量（暖纸底/墨字/金黄强调），工具类名为 `bg-surface`、`text-ink-2`、`border-line`、`bg-accent-strong`、`text-accent-text`、`shadow-card`、`shadow-pop`。禁止裸写 hex 或 Tailwind 调色板（`text-gray-*` 等）。
- **类片段**：重复的组合类一律用 `src/lib/styles.ts` 导出的常量（`BTN_PRIMARY`、`ICON_BTN`、`CARD_HOVER`…），覆盖时用 `cn(FRAGMENT, "覆盖类")`。不要在组件里裸写长串类名。
- **字体**：零 webfont（对齐 ZJSearch），全部系统字体栈（globals.css `--font-*`）。`font-serif`（宋体族：Noto Serif SC/宋体回退）用于标题与文章正文；`font-sans`（系统无衬线）用于界面；`font-mono` 只用于编号/日期/英文小标签。引入 webfont 前先跑 `npm run audit` 评估 perf 影响。
- **对比度规则**：`accent-text`（金棕）是文字链接色；`accent-strong`（金黄）只做填充底色，上面的文字必须是 `accent-contrast`。
- **明暗模式**：next-themes，class 策略；只允许通过 token 生效，禁止 `dark:` 下散落硬编码色值（图标显隐用 `dark:hidden`/`dark:block` 除外）。
- **圆角**：按钮/图标钮 `rounded-full`，卡片 `rounded-2xl`，小件 `rounded-lg/xl`。
- **动效**：仅 `animate-fade-up` + `[animation-delay:*ms]`（首屏），列表悬停 `transition-colors`；尊重 prefers-reduced-motion（全局已处理）。

## i18n Interface

- 界面词汇一律通过 `import { t } from "@/lib/i18n"` 取词，key 是类型安全的（`MessageKey`）。新增文案先加进字典再使用。
- **边界**：个人内容（姓名/格言/时间线/Hero）放 `src/config/site.ts`，不放字典；文章正文在 `content/`。
- 未来加英文：新建 `src/lib/locales/en.ts`（类型 `Dict`，缺 key 编译报错）→ 注册 dictionaries → 切换 setLocale。

## Content

- Frontmatter：blogs 用 `title/description/date/category/tags`；projects 另有 `type: personal|starred`、`link`（GitHub 仓库，自动解析出 owner/repo 供评论区）、`image`。
- 所有页面静态生成（`generateStaticParams`）；中文 slug 需 `decodeURIComponent`（content.ts 已处理）。

## Conventions

- 导入顺序：react → next → 第三方（字母序）→ `@/components` → `@/lib` → type 导入。
- TypeScript strict；禁止 `any`（GitHub API 响应用 `Raw*` 宽松接口 + 显式收窄）。
- 图标：lucide-react；品牌图标（GitHub）用 `components/icons.tsx` 的内联 SVG（lucide v1 无品牌图标）。
- 图片：优先 `next/image`（已 unoptimized）；外链封面在卡片网格中用 `<img loading="lazy">`。
- 可访问性：图标按钮必须有 `aria-label`；当前导航项加 `aria-current="page"`；全局 `:focus-visible` 焦点环已在 globals.css 定义。

## Quality Gates

1. `npx tsc --noEmit` 零错误
2. `npm run lint` 零错误（react-hooks/set-state-in-effect 已启用：不要在 effect 里同步 setState，用渲染期收敛或事件回调）
3. `npm run build` 成功（所有页面可 SSG）
4. `npm run audit` 每个页面全类别 100 分（性能/可访问性/最佳实践/SEO/Agentic Browsing）；改了样式或加依赖后必须跑

## Known Decisions（勿轻易回退）

- **零 webfont**：系统字体栈（globals.css `--font-*`）；webfont 曾致 CSS 276KB + perf 91。
- **Mermaid 懒加载**：进视口才动态加载（库 ~2.7MB），预加载曾致 perf 掉到 82。
- **评论区客户端懒取数**：进视口才请求 api.github.com（实时数据；403/429/404/410 静默降级）；构建期取数与任何形式的 token 注入均不可回退。
- **审计服务器（scripts/audit.mjs）非通用工具**：trace 端点镜像、RSC 路径映射、gzip 均为「镜像生产 CDN 行为」的审计设施，勿用于开发服务器。

## Deployment

`npm run build` → `wrangler deploy`（wrangler.jsonc 指向 ./out）。robots.txt/sitemap.xml/rss.xml 由 app 路由在构建时生成；根目录不要放静态文件（不生效）。

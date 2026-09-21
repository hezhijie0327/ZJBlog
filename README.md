# ZJBlog

**ZJBlog** —— 贺治杰（He Zhijie）的个人技术博客与项目展示站点。ZJ 产品家族继 ZJSearch 之后的第二个产品。

基于 **Vite + React 19 纯 SPA**（与 [ZJSearch](https://github.com/hezhijie0327) 同构：预渲染 HTML + fetch-and-swap 客户端路由），Tailwind CSS v4，部署在 Cloudflare Workers Static Assets。设计语言遵循 [DESIGN.md](./DESIGN.md)（ZJ 设计系统：暖纸底 × 墨字 × 琥珀金，零 webfont）。

## 特性

- **SPA 换页 + 全站预渲染**：每条路由都是完整 HTML（SEO/首屏），站内导航零刷新换页
- **滚动叙事首页**：Hero → 精选项目 → 个人经历时间线 → 最新文章 → 联系方式
- **内容驱动**：`content/` 目录 Markdown 构建期编译，支持 Mermaid 图表与 KaTeX 数学公式（构建期渲染）、giscus 评论（GitHub Discussions，进视口才挂载）
- **⌘K 全站搜索**：构建时生成静态索引，客户端零依赖检索
- **RSS / sitemap / robots.txt / llms.txt / llms-full.txt**：构建时自动生成
- **明暗模式**：手动切换 + 跟随系统，调色板整页交叉淡化，首帧防闪烁
- **Lighthouse 门禁**：sitemap 中每个页面审计，Performance / Accessibility / Best Practices / SEO / Agentic Browsing 全部要求 100 分

## 快速开始

```bash
pnpm install        # 安装依赖（包管理器：pnpm）
pnpm dev            # 开发服务器 http://localhost:5175
pnpm build          # 预渲染全站到 dist/
pnpm run audit      # Lighthouse 门禁（先 build，本机需 Chromium）
pnpm run ci         # lint + tsc + build
```

## 目录结构

```
src/
├── main.tsx / app.tsx   # 启动引导 + Provider 树 + payload 分发
├── pages/               # 页面（次级页面按需加载）
├── features/            # 领域特性：comments（giscus 评论区）/ markdown（正文 + Mermaid + 灯箱）
├── components/          # Shell / Navigation / Footer / CommandPalette / ThemeToggle …
├── lib/                 # router / theme / i18n（EN 基准词库）/ styles 片段 …
├── styles/              # 设计 token 与全局样式（DESIGN.md 的实现）
└── config/site.ts       # 站点配置：元数据、社交、Hero 文案、个人时间线
tools/                   # 构建期：内容管线 / payload / 静态资源生成器 / SSR 组装
content/                 # Markdown 文章与项目
scripts/                 # prerender（预渲染）+ audit（Lighthouse 门禁）
```

## 写内容

在 `content/blogs/` 或 `content/projects/` 新建 `.md`：

```yaml
---
title: "文章标题"
description: "一句话摘要"
date: "2024-12-21"
category: "技术分享"
tags: ["标签"]
# projects 额外支持：
type: "personal"        # 或 "starred"
link: "https://github.com/user/repo"
image: "https://example.com/cover.jpg"
---
```

## 部署

```bash
pnpm build
npx wrangler deploy    # wrangler.jsonc 指向 ./dist
```

## License

MIT

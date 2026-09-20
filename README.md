# 治杰 Online

贺治杰（He Zhijie）的个人技术博客与项目展示站点。

基于 Next.js 16（App Router）+ Tailwind CSS v4，全静态导出，部署在 Cloudflare Workers Static Assets。设计语言：编辑风排版（思源宋体 + Inter）× ZJSearch 暖纸墨色调（暖纸底、墨色文字、金黄强调）。

## 特性

- **滚动叙事首页**：Hero → 精选项目 → 个人经历时间线 → 最新文章 → 联系方式
- **内容驱动**：`content/` 目录 Markdown（gray-matter），支持 Mermaid 图表、GitHub Discussions/Issues 评论区
- **⌘K 全站搜索**：构建时生成静态索引，客户端零依赖检索
- **RSS / sitemap / robots.txt / llms.txt**：构建时自动生成或静态提供
- **明暗模式**：next-themes 手动切换 + 跟随系统
- **Lighthouse 门禁**：CI 对 sitemap 中每个页面审计，Performance / Accessibility / Best Practices / SEO / Agentic Browsing 全部要求 100 分

## 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器 http://localhost:3000
npm run build      # 静态导出到 out/
npm run audit      # Lighthouse 门禁（先 build，本机需 Chromium）
npm run ci         # lint + build（CI 同款流程）
```

## 目录结构

```
src/
├── app/               # 路由（页面 + rss/sitemap/robots/搜索索引）
├── components/        # 页面组件
├── config/site.ts     # 站点配置：元数据、社交、Hero 文案、个人时间线
└── lib/
    ├── content.ts     # Markdown 内容加载
    ├── i18n.ts        # UI 文案字典（类型安全，预留多语言接口）
    ├── styles.ts      # 设计语言类片段（按钮/卡片/标签等单一来源）
    └── github.ts      # GitHub API（评论区）
content/               # Markdown 文章与项目
scripts/audit.mjs      # Lighthouse 全页门禁
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
npm run build
npx wrangler deploy    # wrangler.jsonc 指向 ./out
```

## License

MIT

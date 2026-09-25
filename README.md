# ZJBlog

**ZJBlog** —— 个人技术博客与项目展示站点。

基于 **Vite + React 19 纯 SPA**（构建期预渲染完整 HTML + fetch-and-swap 客户端路由），Tailwind CSS v4，部署在 Cloudflare Workers Static Assets。设计语言遵循 [DESIGN.md](./DESIGN.md)（ZJ 设计系统：暖纸底 × 墨字 × 琥珀金，零 webfont）。开发指南见 [AGENTS.md](./AGENTS.md)，全站审计手册见 [AUDIT.md](./AUDIT.md)。

## 特性

- **SPA 换页 + 全站预渲染**：每条路由都是完整 HTML（SEO/首屏），站内导航零刷新换页；单一 CSS 入口，首帧零 CLS
- **滚动叙事首页**：Hero → 精选项目 → 最新文章 → 联系方式，故事分镜条 sticky 跟随
- **内容驱动**：`content/` 目录 Markdown 构建期编译（运行时零编译成本）
- **全量 Markdown 渲染**（见下文「Markdown 支持矩阵」）：shiki 双主题高亮、KaTeX 公式（样式按页按需加载）、Mermaid / GeoJSON / TopoJSON / STL / PlantUML 图示、Obsidian Callouts、GFM 全集
- **⌘K 全站搜索**：构建时生成静态索引，客户端零依赖检索
- **giscus 评论**（GitHub Discussions）：进视口才挂载 iframe，主题跟随站点
- **RSS / sitemap / robots.txt / llms.txt / llms-full.txt**：构建时自动生成
- **明暗模式**：手动切换 + 跟随系统，调色板整页交叉淡化（`@property` 插值），首帧防闪烁
- **Lighthouse 双端门禁**：sitemap 每页审计，移动端 + 桌面端 Performance / Accessibility / Best Practices / SEO / Agentic Browsing 全部要求 100 分

## 快速开始

```bash
pnpm install        # 安装依赖（包管理器：pnpm）
pnpm dev            # 开发服务器 http://localhost:5175（SSR + 生成文件同构，命令面板/RSS 可用）
pnpm build          # 预渲染全站到 dist/
pnpm run audit      # Lighthouse 门禁（先 build，本机需 Chromium/Edge；LH_FORM_FACTOR=mobile 跑移动端）
pnpm run ci         # lint + tsc + build
```

## 目录结构

```
src/
├── main.tsx / app.tsx   # 启动引导 + Provider 树 + payload 分发
├── pages/               # 页面（每页一个 chunk + registry 注册表）
├── features/            # 领域特性：comments（giscus）/ markdown（正文 + Mermaid + STL + 灯箱）
├── components/           # Shell / Navigation / CommandPalette / 通用组件
├── lib/                  # router / theme / i18n（EN 基准词库）/ styles 片段 …
├── styles/               # 设计 token 与全局样式（DESIGN.md 的实现）
└── config/site.ts        # 站点配置：元数据、社交、giscus
tools/                    # 构建期：内容管线 / payload / 静态资源生成器 / SSR 组装
content/                  # Markdown 文章与项目
scripts/                  # prerender（预渲染）+ audit（Lighthouse 双端门禁）+ linkcheck
```

## 写内容

在 `content/blogs/` 或 `content/projects/` 新建 `.md`（完整语法能力与写作风格见 `.agents/skills/md-style/`）：

```yaml
---
title: "文章标题"
description: "一句话摘要（SEO/OG/列表摘要）"
date: "2024-12-21"       # 建议 ISO 字符串；无引号日期也能被解析器兼容
category: "技术分享"       # 可选
tags: ["标签"]            # 列表页标签云、博客文页标签链接
summary: "手写摘要卡"      # 可选，文章页顶部
# projects 额外支持：
type: "personal"          # 或 "starred"（首页精选优先）
link: "https://github.com/user/repo"
image: "/images/cover.jpg" # 封面图，站点根路径；缺省不渲染封面位
# draft: true             # 草稿，构建期整体剔除
---
```

### Markdown 支持矩阵

| 语法 | 支持 | 说明 |
|---|---|---|
| CommonMark / GFM 全集 | ✅ | 表格对齐、任务清单、删除线、脚注、自动链接 |
| 代码高亮 | ✅ | shiki 双主题（亮/暗 AA 对比），复制按钮，语言标签 |
| KaTeX 数学（`$…$` / `$$…$$` / ```math） | ✅ | 构建期渲染；KaTeX 样式按页按需加载 |
| Mermaid / sequence / flow | ✅ | 客户端进视口惰性渲染；Typora 语法构建期翻译 |
| GeoJSON / TopoJSON | ✅ | 构建期直接投影为静态 SVG（零运行时 JS） |
| ASCII STL | ✅ | three.js 惰性渲染，滚出视口自动停帧省 CPU |
| PlantUML | ✅ | 公共渲染服务 lazy img |
| Obsidian Callouts（`> [!note]-` 折叠） | ✅ | 全类别配色映射站点 token |
| ==高亮==、emoji（`:smile:`）、定义列表、`<mark>`/`<kbd>`/`<u>` | ✅ | 扩展语法 |
| `<details>` 折叠、raw HTML | ✅ | 展开收起带动画（渐进增强） |
| Typora 上下标 `H~2~O` / `X^2^` | ❌ | 与 GFM 单波浪删除线冲突（GitHub 同样按删除线渲染），请用 `<sub>`/`<sup>` |
| OFM wiki 双链 `[[…]]`、`%%注释%%` | 原样展示 | 无目标语义，按字面文本渲染 |

## 部署

```bash
pnpm build
pnpm deploy           # = wrangler deploy（锁在 devDependencies；wrangler.jsonc 指向 ./dist）
```

## 文档体系（后续如何撰写与维护文档）

| 文档 | 读者 | 内容 | 何时更新 |
|---|---|---|---|
| `DESIGN.md` | 设计 agent + 人 | 界面契约：token、片段、排印、动效、页面骨架 | **先登记再落码** —— 新 token/片段/豁免先写进 DESIGN.md 对应章节，再写代码（§17 治理：文档与实现不一致按 bug 处理） |
| `AGENTS.md` | 编码 agent | 工程契约：架构、命令、约定、门禁、踩坑 | 引入新架构/约定/工具时；每条约定必须带「为什么」（历史教训一句话） |
| `AUDIT.md` | 审计执行者 | 审计手册：环境、门禁、测试矩阵、调试配方、环境陷阱 | 每次全站审计后，把新踩的坑与新配方追加进对应章节 |
| `.agents/skills/md-style/` | 写文章的人/agent | 本博客 Markdown 的完整语法能力与写作风格 | 渲染管线新增语法能力时 |

写作规则：文档用中文陈述句，规则必须可执行（带命令/文件名/行号级证据）；同一语义只允许一处定义（DESIGN.md 定「长什么样」，AGENTS.md 定「怎么建」），交叉引用而不复制。

## License

[Apache License 2.0 with Commons Clause v1.0](LICENSE)

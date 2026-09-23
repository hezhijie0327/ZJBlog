---
name: md-style
description: Use when writing or editing any article in this blog (content/blogs/*.md) — defines the blog's full Markdown rendering capability (callouts, tables, task lists, footnotes, mermaid flowchart/gantt, geojson maps, stl, KaTeX, details folding, HTML subset) and when to use each for reader experience. Referenced by other skills (e.g. travel-guide); overrides generic Markdown habits with this site's conventions.
---

# 博客 Markdown 编写规范（md-style）

全量语法的活样例：`content/blogs/markdown-render-test.md`（写法有疑义以它渲染结果为准）。本规范的核心不是罗列语法，而是**按阅读体验选择渲染能力**——让读者扫读时抓住重点，而不是被格式淹没。

## 支持能力速查

| 能力 | 语法 | 渲染说明 |
|---|---|---|
| 标题 | `#` ~ `######` | 正文从 `##` 起（`#` 留给文章标题感） |
| Callouts | `> [!tip]` `[!warning]` `[!important]` `[!info]` `[!note]` 等 + 自定义标题 | 构建期渲染；支持折叠（`[!tip]-`）与嵌套 |
| 表格 | GFM 表格，支持对齐、行内格式 | 自动滚动容器；单元格内放短句 |
| 任务清单 | `- [ ]` / `- [x]` | 出发前清单、检查项 |
| Mermaid | ```mermaid（flowchart / sequence / gantt） | 进视口惰性渲染；中文标签可用 |
| 地图 | ```geojson / ```topojson | 构建期交互地图；Point 型 Feature 的 `properties.name` 渲染为点位标注，`label-dx` / `label-dy`（数字，默认 7 / -7）可调偏移避让 |
| 3D | ```stl | 进视口惰性加载 three.js |
| 数学 | `$…$`、`$$…$$`、```math | KaTeX 按需注入该页 |
| 脚注 | `[^1]` | 自动聚到文末 |
| 折叠 | `<details><summary>` | summary 与内容之间**留空行**，内部 Markdown 才渲染 |
| HTML 子集 | `<kbd>` `<mark>` `<u>` `<sub>` `<sup>` `<img 带宽高>` | 裸色值、`<font color>`、外站 iframe 禁止（对比度/零第三方审计门禁） |
| 图片 | `![alt](/images/x.jpg)` | 仅本站路径；构建自动转 webp 并注入宽高 |

## 按阅读体验选能力（核心）

- **读者 10 秒要抓住的重点** → 文首放"速览卡"表格（TL;DR）；过程性信息（数据口径、订票记录）沉到文末或折叠
- **流程、路线、决策分支** → mermaid `flowchart LR`
- **时间安排**（一天日程、里程碑）→ mermaid `gantt`（`dateFormat HH:mm` + 起止时刻写法）
- **地点与地理动线** → geojson 点 + LineString（坐标示意精度即可，注明"坐标为示意"）
- **提示 / 避坑 / 硬约束** → Callout（`[!tip]` / `[!warning]` / `[!important]`）；**每节 ≤ 1-2 个**，多了等于没有
- **备选方案、来源列表、长尾细节** → `<details>` 折叠，正文只留主线
- **可勾选的清单** → 任务清单
- **状态先行** → 表格第一列放状态（✅ / ⏳）
- **键位、路径、代码、专有名词** → 行内 code 或 `<kbd>`
- **来源与延伸阅读** → 脚注或文末折叠区

## 纪律

- 富块（mermaid / callout / geojson / details / 图片）全文 **3-6 个**为宜，服务于扫读，不做炫技
- 表格 ≤ 6 列；单元格一句以内；需要竖线请转义 `\|`
- mermaid 保持线性简单；节点文本可用 `<br/>` 控宽；写完必须过一次 `pnpm build`（mermaid 语法错误只在运行时暴露）
- Callout 的自定义标题放类型标记后同一行；正文写在 `>` 后续行
- 图片仅用本站 `/images/` 路径（外站图无法注入宽高，挂 unsized-images 审计）
- 顶栏图片宽高由构建注入；正文里手动控制尺寸用 `<img ... width>` 而非 Obsidian 的 `|100` 后缀

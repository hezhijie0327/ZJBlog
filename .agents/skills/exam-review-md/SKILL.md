---
name: exam-review-md
description: Use when writing or editing exam review posts in this blog (试题+答案+技巧+解析 study posts, e.g. content/blogs/study/**) — defines the locked per-question folding format, per-subject analysis templates (math / logic / English / writing), the 举一反三 extension layer, figure options, encryption setup and the build pitfalls learned from the 2027 管理类联考 prediction papers. Referenced by other skills (md-style); overrides generic Markdown habits for this post family.
---

# 试题解析类加密文章（exam-review-md）

成文样例：`content/blogs/study/kaoyan-199-zonghe-yuce1.md` 与 `kaoyan-204-yingyu-yuce1.md`（写法有疑义以它们为准）。这类文章的目标读者是**正在刷题的人**：页面 = 一份可自测的完整试卷 + 点开才有答案的逐题讲解。

## 试卷完整性（最高原则）

- **题干、选项、材料必须完整可作答**：不放"段落要点"式摘要替代原文；没有选项的题无法自测（曾漏掉完形 20 组选项、逻辑 27–55 题选项，返工补齐）。
- 原卷配图无法还原的：简单示意图用 `geojson-nobasemap` 或手绘 SVG→PNG（见下文"图形方案"），并在文中注明"据解析重绘，以原卷为准"。
- 原题材料（写作题干、翻译原文）必须给出，通常放折叠块或引用块。

## 文件与 frontmatter

- 位置：`content/blogs/study/<slug>.md`；slug 用 ASCII（如 `kaoyan-199-zonghe-yuce1`）。
- 必带：`secret: <名字>`（整卷加密）→ 口令配在 `.env.local` 的 `BLOG_SECRET_<名字大写>`；**CI/线上缺变量构建直接失败（fail-closed）**，部署前提醒用户去 CF Dashboard Build Variables 配置。
- `tags` 里**纯数字必须加引号**（`- "204"`）——YAML 会把 `204` 解析成 number，构建期 `escapeHtml(204)` 直接崩（实测踩坑）。
- `date` 用 ISO 字符串；`category` 自由文本（学习类用"学习"）；`summary` 写一句话导学。

## 页面骨架（顺序固定）

1. **使用方法**（怎么自测：先做题→点折叠对答案→读讲解）
2. **答案速查表**（整卷做完快速核对用）
3. 分模块逐题（每题一个折叠块，格式见下）
4. 跨题通用层：公式总库（逻辑/数学）、写作范文与素材库
5. 考场时间分配速记

## 逐题折叠块（核心格式）

```markdown
**1.** 题干完整文本……

A. 选项一　B. 选项二　C. 选项三　D. 选项四　E. 选项五

<details>
<summary>考点 · 技巧名</summary>

**答案：X**

（按学科的解析模板写，见下）
</details>
```

**三条铁律（都是返工教训）**：
- **答案不出现在折叠外**：summary 行只写考点/技巧，不写答案字母；题干与选项里不得加粗正确项。
- **选项必须独立段落**（或逐行列表）：和题干同段会被 markdown 连排挤成一行。
- **details 标签必须配对**，summary 与正文之间留空行。

### 各学科解析模板

- **数学**：`**一看题干**（什么特征→什么方法）→ **动手**（大白话分步）→ **带走的公式** → **坑**（易错点+出题人视角）`。LaTeX 用 `$…$`。
- **充分性判断**：节首必须给 A–E 选项含义表 + "什么是充分"解释；每题写「验证 (1) / 验证 (2)」。
- **逻辑**：综合推理用 `**题干翻译** → **破案** → **套路卡**`；论证逻辑用 `**论证长这样** → **正确答案为什么对** → **干扰项在装什么** → **套路卡**`。
- **英语阅读**：`**定位** → **替换链**（原文词→正确项词）→ **其他选项在装什么**（张冠李戴/反向拼装/无中生有/绝对化）→ 一句 takeaway`。
- **写作/翻译**：原题材料 + 模板/靶点表 + 完整范文（折叠）。

### 举一反三扩展层（每块必有）

折叠块末尾追加一段：数学/逻辑用 `**举一反三**`（公式家族、变式考法、失效边界），英语用 `**同款题型**`（信号词家族、做题模板、替换积累）。写"这个公式还能解什么、换皮怎么认、什么时候失效"，不是复述本题。

## 图形方案（按优先级）

1. **简单示意图** → ` ```geojson-nobasemap ` 围栏：坐标当 x/y，Polygon 画形状、Point 标顶点（`properties.name`），无地图底图，随锁定文一起加密。
2. **精细图**（区域着色、中点记号、虚线）：手绘 SVG → sharp 转 2x PNG → `public/images/`，正文 `![alt](/images/x.png)` 引用；仅被锁定文引用的图构建期自动 sealed 成 `.bin`，明文不出现在 dist。
3. **mermaid 画不了几何图**（无任意坐标绘图能力），别尝试。
4. 交付时注明"示意图，以原卷为准"。

## agent 生成工作流（环境坑，务必遵守）

- **单次写入命令 ≤ ~8KB**：超长 heredoc 会被静默截断。长文按节拆多个数据文件分批写。
- **批量改块用「数据文件 + splice 脚本」**：新内容放临时文件，块间用 `====BLOCK====` 分隔；脚本只做 indexOf 定位与顺序替换，替换前后都打印块数并校验（多了少了立即 abort）。
- **命令行参数与内联脚本会随机损坏中文与反斜杠**：脚本文件里中文一律 `\uXXXX` 转义、不用带反斜杠的正则字面量；改完用 ASCII 关键字 grep 验证。
- **改完必跑 `pnpm build`**：YAML 类型错误、KaTeX 非法字符、加密缺口、details 不配对全在构建期暴露；再 grep dist 确认明文未泄漏、路由已预渲染。

## 完成前检查清单

- [ ] 每题都有折叠块；summary 无答案；折叠内首行是答案
- [ ] 题干/选项/材料完整；选项独立成段
- [ ] `pnpm build` 通过；`<details>` 配对；dist 无明文泄漏
- [ ] 纯数字 frontmatter 值已加引号
- [ ] 提醒用户：线上部署需在 CF Build Variables 配对应 `BLOG_SECRET_*`

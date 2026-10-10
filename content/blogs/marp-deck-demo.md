---
title: 用 Markdown 写幻灯片：Marpit 接入记
description: "deck: true 的整篇幻灯片演示——Marpit 语法、指令、shiki 高亮与演讲者备注，本页即验收样例。"
date: 2026-10-10
category: 技术
tags:
  - Markdown
  - Marpit
  - 幻灯片
deck: true
---

<!-- paginate: true -->

# 用 Markdown 写幻灯片

<!-- _class: lead -->
<!-- _paginate: skip -->

Marpit 方言 · 构建期编译 · 客户端零依赖

<!-- 这是演讲者备注：逐页模式点便签按钮可见，堆叠视图不显示。 -->

---

## 三种写法，一个产物

- `---` 分隔页，页题就是普通标题
- HTML 注释指令：`<!-- paginate: true -->`
- `_` 前缀 = 仅当前页生效：`<!-- _class: lead -->`

| 指令 | 作用 |
| --- | --- |
| `paginate` | 右下角页码 |
| `_class: lead` | 标题页居中变体 |
| `headingDivider` | 按标题自动切页 |
| `![bg]()` | 图片转整页背景 |

<!-- 备注示例：这一页介绍指令体系，可以口头展开 front-matter 写法。 -->

---

## 代码块走站内 shiki 双主题

```ts
const deck = compileDeck(markdown);
deck.slides.forEach((slide, i) => {
  console.log(`slide ${i + 1}: ${slide.length} chars`);
});
```

`行内代码`、**加粗**、[外链](https://marpit.marp.app/) 与表格都可用。

---

![bg](/images/couple-demo.jpg)

## 背景图指令

`![bg]()` 在构建期转为 section 内联背景样式；`compress-images` 的
字符串改写会同步把引用换成 webp。

---

## 站内图片自动带固有尺寸

![普通图](/images/couple-demo.jpg)

构建期注入 width/height（unsized-images 审计零扣分）。

<!-- 备注：这里放了一张真实图片，验收时确认灯箱不拦截幻灯片内的图。 -->

---

## 键盘翻页试一试

按 `→` 下一页、`←` 上一页、`Home`/`End` 首尾跳转；
`#3` 这样的 hash 深链可以直达任意一页。

左下角可切「连续浏览」回堆叠视图，右上角全屏放映。

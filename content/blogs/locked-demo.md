---
title: "加密示例：这扇门后写着什么"
description: "加密博文功能的使用示例与自检页"
date: "2026-09-27"
category: "技术"
tags:
  - 加密
  - 示例
secret: demo
---

你能看到这行字，说明解密成功了 🎉

这是一篇**加密博文**：正文在构建期被 Argon2id + AES-256-GCM 加密，服务器上只有密文——输对密码才能在浏览器里还原。本页同时是渲染管线的自检样例（公式、代码卡、Callout 都要走一遍解密后的渲染路径）。

## 怎么写一篇加密文章

frontmatter 里加一行 `secret: <名字>` 即可，名字对应环境变量 `BLOG_SECRET_<名字大写>`（写在 `.env`，已被 gitignore）：

```yaml
---
title: 我们的某次旅行
date: "2026-09-27"
secret: couple   # → 构建时读 BLOG_SECRET_COUPLE
---
```

> [!important]
> 标记了 `secret` 但没配对应口令时，构建会**直接失败**（fail-closed）——宁可不发布，也绝不把明文带出去。口令是唯一防线，请用 16 位以上的长口令。

## 渲染自检

公式（KaTeX 按需注入）：

$$E = m c^2, \qquad \int_{-\infty}^{+\infty} e^{-x^2} \, dx = \sqrt{\pi}$$

加密文的**独占图片**（只被本文引用 → 构建期加密为 `.bin`，解锁后浏览器内解密显示）：

![独占图示例：只有解锁后才能看到](/images/couple-demo.jpg)

代码卡（shiki 双主题高亮 + 复制按钮）：

```typescript
// 解锁后的正文走同一条渲染管线
const bundle = await unlockPost(slug, locked, password);
console.log(bundle.toc.length); // 目录也随正文一起解密
```

> [!tip]
> 解锁状态只在当前会话内有效：刷新页面需要重新输入密码。密文落盘、明文只进内存——这是刻意的保守设计。

## 本页的定位

- 演示 + 自检：验证加密文的完整渲染链路（含独占图解密），可随时删除；
- 站内可见性：它出现在列表里但带锁标，不进 RSS / sitemap / 站内搜索 / llms.txt，搜索引擎 noindex；
- 图片边界：只被加密文引用的图片会一并加密（如上面的示例图）；若一张图**同时被公开文章引用**，它无法加密——构建时会警告，所以私密照片请用加密文独占的文件。

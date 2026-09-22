---
title: "ZJSearch — SearXNG 全 React 前端主题"
description: "为开源元搜索引擎 SearXNG 从零编写的 React + TypeScript UI 主题：Jinja 模板退化为 page-data 数据壳，100% 界面由 React 渲染、客户端路由接管导航，纯增量设计可无痛跟随上游升级。"
date: "2024-10-28"
category: "技术"
tags: ["SearXNG", "元搜索", "React", "TypeScript", "隐私"]
type: personal
link: https://github.com/hezhijie0327/ZJSearch/tree/zjsearch
---

ZJSearch 是为 SearXNG（隐私优先的开源元搜索引擎，聚合多个搜索服务与数据库的结果，不追踪、不画像用户）从零编写的 React + TypeScript UI 主题。与官方 simple 主题「服务端 HTML + TypeScript 渐进增强」的思路不同，`zjsearch` 分支上 100% 的界面由 React 渲染。

## 架构

- **Page-Data 模式**：SearXNG 服务端照常渲染每个页面，但 Jinja 模板退化为薄薄的数据壳 —— 把完整渲染上下文序列化为 `<script id="page-data">` JSON payload 后启动 React bundle；图片代理、favicon、查询高亮等服务端过滤器在序列化阶段完成，React 客户端直接继承全部数据管线
- **客户端路由**：React 路由拦截导航，fetch 同一 URL 并从 HTML 响应中提取 page-data，pushState 换页，进度条 + 骨架屏覆盖等待
- **纯增量设计**：不修改任何 Python 文件，仅新增模板与静态资源，可无痛跟随上游升级

本站 ZJBlog 与其同构：同一套 page-data 预渲染 + fetch-and-swap 路由架构。

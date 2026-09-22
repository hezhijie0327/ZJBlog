---
title: "ZJDDNS — 轻量零依赖 DDNS 更新工具"
description: "Go 编写的轻量级零第三方依赖 DDNS 更新器：纯标准库构建、手写 DNS 报文实现，WAN IP 变化时自动更新 A/AAAA 记录，内置 Cloudflare Provider 与多架构 Docker 镜像。"
date: "2020-07-03"
category: "技术"
tags: ["DDNS", "Go", "Cloudflare", "Docker"]
type: personal
link: https://github.com/hezhijie0327/ZJDDNS
---

ZJDDNS 是一个轻量级、零第三方依赖的 DDNS 更新工具：WAN IP 变化时自动更新 DNS 记录。纯 Go 标准库构建，DNS 报文的查询与解析均为手写实现，单二进制即可部署。

## 核心特性

- **记录类型**：A（IPv4）、AAAA（IPv6）或双栈同时更新
- **自动 IP 检测**：DNS 查询优先，失败自动回退 HTTP trace
- **双操作模式**：创建/更新（upsert）或删除 DNS 记录
- **Provider 机制**：内置 Cloudflare 支持，同一提供商可配多个域名、多个提供商可并存；新提供商以插件包形式接入（`providers/`）
- **部署友好**：多架构 Docker 镜像（linux/amd64、linux/arm64）或裸二进制运行

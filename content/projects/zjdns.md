---
title: "ZJDNS — 高性能递归 DNS 服务器"
description: "Go 编写的高性能递归 DNS 服务器：内置五重防污染与完整 DNSSEC 信任链，全协议加密传输（DoT / DoQ / DoH / DoH3 / DTLS），支持（后量子）DNSCrypt、国密 TLCP/DTLCP 及 KTLS 内核卸载。"
date: "2022-05-03"
category: "技术"
tags: ["DNS", "Go", "加密传输", "后量子密码", "国密"]
type: personal
link: https://github.com/hezhijie0327/ZJDNS
---

ZJDNS 是一个用 Go 编写的高性能递归 DNS 服务器，内置 DNS 防污染、纯内存缓存与完整 DNSSEC 信任链，加密传输覆盖 TLS / QUIC / HTTPS / HTTP3 / DTLS 全协议，并支持（后量子）DNSCrypt、国密 TLCP/DTLCP 与 KTLS 内核卸载。

## 核心特性

- **递归解析**：从 IANA 根服务器逐级解析至权威服务器，完整 DNSSEC 密码学信任链（DNSKEY→DS→RRSIG）；上游主/备并发查询 + 首胜策略，可切换纯递归模式
- **协议合规**：QNAME 最小化（RFC 9156）默认启用、分片避免（RFC 9715）、紧凑否认（RFC 9824）、多类型捆绑 MQTYPE（RFC 10029）
- **DNS 防污染**：hopguard（TTL 指纹）、spoofguard（UDP 多读）、poisonguard（越权检测）、splitguard（TCP 分段）、capsguard（0x20 随机化）五重检测
- **全协议加密监听**：DoT / DoQ / DoH / DoH3 / DNS-over-DTLS 一站式启用
- **（后量子）DNSCrypt**：基于 PQ KEM 后量子密钥封装的加密查询
- **国密传输**：TLCP DoT / TLCP DoH / DTLCP（SM2/SM3/SM4 套件，GB/T 38636-2020）
- **性能**：纯内存 LRU 缓存 + zstd 压缩快照、pre-packed 零分配命中路径、singleflight 并发去重、KTLS 内核态 TLS 卸载

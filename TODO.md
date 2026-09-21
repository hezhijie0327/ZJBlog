# TODO — 审计发现(逐条落地,修完打勾)

> 本文件是本次全面审计的工作台账:发现一条写一条,修复后标记 ✅ 并注明验证方式。

## A. Bug(功能缺陷)

- [x] **A1. 未加引号的 YAML 日期被静默丢弃** — `tools/content.ts` 的 `parseDate` 只接受字符串;`date: 2023-06-01`(无引号)被 gray-matter 解析成 `Date` 对象 → 该文章日期全部丢失(列表无日期、归档页进「未知」分组、sitemap 无 lastmod)。markdown-render-test 即受害者。修复:`parseDate` 同时接受 `Date` 实例(用其 ISO 日期部分)。**验证:构建后首页/归档可见该文日期。**

- [x] **A2. dev 环境静态生成文件 404** — search-index.json / rss.xml / sitemap.xml / robots.txt / llms*.txt 仅存在于构建产物;dev 中间件把它们放行给 Vite → 404,命令面板索引加载失败静默降级为空(界面永远「No matches」),与「dev 与生产同构」约定相悖。修复:dev 中间件对这些路径调用 tools/generators 直接产出。**验证:dev 下命令面板可搜出结果。**

## B. 性能(内存/CPU)

- [x] **B1. StlViewer 渲染循环滚出视口后仍满帧空转** — `setAnimationLoop` 一经启动永不暂停,`autoRotate` 要求持续渲染;长文阅读时 WebGL 上下文持续吃 CPU/GPU,且曾致浏览器截图超时。修复:IntersectionObserver 离屏时 `setAnimationLoop(null)`,回视口恢复。**验证:滚离模型后 rAF 停止。**
- [ ] **B2. BackToTop 的 scroll listener 每次滚动同步 setState** — `setVisible` 直写状态,滚动期间高频 re-render(值不变时 React 会跳过,但仍在每次 scroll 调度)。低成本优化:仅跨越阈值时 setState。

## C. UI/UX — 动画审计(逐个交互面核对)

- [x] **C1. 移动端抽屉菜单无展开/收起动画** — Navigation.tsx 条件渲染直切。补进入/退出过渡。
- [x] **C2. `<details>`(callout 折叠块、折叠段落)无展开/收起动画** — 原生瞬时跳变。加 `interpolate-size: allow-keywords` + `transition` 渐进增强(Chrome 131+,旧浏览器退化瞬时,符合 baseline 策略)。
- [x] **C3. Lightbox 无进入过渡** — dialog showModal 直切;背板/内容加 fade/scale-in。
- [x] **C4. CommandPalette 有进入动画(animate-fade-in),无退出动画** — 评估补退出或接受现状(进入动画已有,优先级低)。
- [ ] **C5. 桌面导航激活下划线无过渡** — 换页时下划线瞬移。可接受(link 整体有 transition-colors);记录不修,除非低成本可加。

## D. i18n

- [x] **D1. 死键清理**:`nav.github`、`blog.notFound`(en/zh 词库均有,无消费方;blog.notFound 场景由 EmptyState 承担)→ 删除。
- [x] **D2. StlViewer 错误文案硬编码中文**(`3D 视图渲染失败`/`请确认 STL 数据完整后刷新重试。`)→ 进词库(`stl.failed`/`stl.failedHint`),与 MermaidRenderer 错误卡同构(还要补 `role=alert` 一致性:Mermaid 有,STL 有,保持)。
- [x] **D3. `mermaid.figure` 中文「Mermaid 流程图」不准确** — 时序图/甘特图也走此 aria-label → 改「Mermaid 图示」/「Mermaid diagram」。

## E. 死代码 / 结构

- [x] **E1. `formatDateLocale` 无消费方**(src/lib/format.ts)→ 删除(giscus 未启用评论区用不到;若未来启用再按需恢复)。
- [x] **E2. `sitemapRoutes` 无消费方**(tools/generators.ts)→ 删除。
- [x] **E3. lightbox `dialogRef` 未使用的引用检查**;`CommandPalette` 的 `dialogRef` 未使用 → 清理。
- [x] **E4. index.html 根文件仅为 Vite 入口占位(生产 HTML 由 SSR 组装,不走它)** — 保留但补注释说明双重角色,避免误解;已是最佳实践(vite 必需入口)。

## F. 文档

- [ ] **F1. AGENTS.md/DESIGN.md 落地调试经验**:YAML 日期必须引号(或解析器兼容)、懒渲染循环必须可暂停、details/抽屉动画模式、`interpolate-size` 渐进增强策略。
- [ ] **F2. README 更新**:特性清单与实现对齐(评论是 giscus 不是 GitHubComments)、写文档指南(如何新增文章/如何扩展 i18n/如何新增页面类型)、markdown 支持矩阵。

## G. 验证记录

- 基线:tsc / biome / build 全绿。
- markdown-render-test:9/9 mermaid、STL、geojson×2、plantuml、KaTeX、callout×43、footnotes、kbd、sub/sup、表格对齐、任务清单、emoji、实体、autolink 全部渲染成功;`H~2~O`→`<del>` 为 GFM 标准行为(GitHub 一致),sub/sup 插件与 GFM 冲突,决定不引入,在文档中说明。
- 灯箱:开/缩放(144→180px)/关闭按钮/焦点管理正常。
- 命令面板:打开/焦点/过滤正常(Esc 组合键不测,会取消 ZCode 动作,由用户手工验证)。
- SPA 换页:URL/payload/焦点转移/抽屉自动收起/无横向溢出 — 正常。

## H. 补充记录(2026-09-21 实施后)

- B2 复核:`setVisible` 同值时 React 自动 bail out,无需修改 — 关闭。
- C5:导航下划线保持现状(整体已有 transition-colors),动效克制原则 — 不修。
- 环境限制:ZCode 内置浏览器窗口不可见时 rAF/CSS 动画时间线冻结(截图超时、动画 currentTime 恒 0 均由此起),非站点问题;动画实现的 DOM/计算样式断言已全部通过(interpolate-size=allow-keywords、::details-content 规则、fade-up/fade-out keyframes、抽屉 grid-rows 常驻结构)。真机动效待人工复核。
- C4 补强:关闭卸载在 animationend 之外增加 240ms setTimeout 兜底(渲染管线冻结/事件丢失时面板仍能收尾)。

## I. 并行工作提示

- `tools/math-gfm.js/.d.ts`（GFM 数学语法 micromark 移植，未接线）由并行会话创建中；biome 已临时排除 tools/math-gfm.js（.js 内含 TS 语法）。该文件接入 content.ts 后需移除排除项。
- 2026-09-21 补充修复：**A3. localeCompare 水合不匹配** — BlogsPage 标签云排序在 Node/浏览器 ICU 下顺序不同 → React #418 → best-practices 96。改为 codepoint 比较 ✅。
- 2026-09-21 补充修复：**A4. markdown-render-test 审计回归** — 外站演示资源（CodePen iframe cookie、commonmark favicon）拖垮四类分数。已本地化到 public/test/、iframe 改代码块演示、补 h3 层级过渡、kbd/katex-error 显式文字色、构建期 rehypeLocalImageSize（image-size）为站内正文图片注入固有尺寸 ✅。

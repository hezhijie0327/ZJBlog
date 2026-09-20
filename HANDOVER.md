# HANDOVER — 遗留问题与后续事项

> 2026-09-20 审计轮结束时的快照。质量基线：tsc / eslint 零错误；Lighthouse 门禁 22 页 × 5 类别（Performance / Accessibility / Best Practices / SEO / Agentic Browsing），本次本地全量 21/22 页满分、1 页 perf 97（见下）。

## 高优先级

### 1. Lighthouse Performance 在 99/97 之间波动（LCP ≈ 0.9s 压线）
- 现象：本机（Windows + Edge，负载较高）全量门禁中偶有 1-2 页 perf 97-99，复跑可能恢复 100。CI（干净 ubuntu runner + Chrome）预期稳定 100，**首次 CI 运行请确认**。
- 若 CI 也压线，按序尝试：
  1. CommandPalette 改为首次交互时懒挂载（`next/dynamic`），省 ~20KB 首屏 JS；
  2. polyfill chunk（112KB，`0cz1d0mv5g_q7.js`）：`browserslist` 对 Turbopack 不生效，研究 `turbopack` 的 target 配置或升级 Next；
  3. `scripts/audit.mjs` 加「近失重试」（如 perf ≥ 98 时重跑一次取最优，仿照全零重试逻辑）。

### 2. 项目封面图（占位中）
- 现状：卡片与详情页均渲染占位框，frontmatter `image` 字段已预留未消费。
- 恢复真图时的建议方案（参考 `Lab/Web` 的构建期 sharp 优化）：
  - 构建时下载/压缩为 webp 并输出实际宽高（避免 `unsized-images` / `image-aspect-ratio` 审计回归）；
  - 历史教训：外链 Unsplash 图曾造成 perf 波动与 BP 扣分，构建期本地化 + 定尺寸是前提。

### 3. Next 16 静态导出 RSC 预取路径 quirk（上游问题）
- 客户端请求点分扁平名（`/blogs/x/__next.blogs.$d$slug.__PAGE__.txt`），磁盘是斜杠目录（`__next.blogs/$d$slug/__PAGE__.txt`）。**Cloudflare 生产环境同样 404**（仅控制台噪音，导航功能正常）。
- 审计服务器已做映射（`scripts/audit.mjs` serveStatic），生产侧需关注 Next 版本更新或向 Next 反馈。

## 中优先级

### 4. i18n 只留了接口
- 已有：`src/lib/i18n.ts` 类型安全字典 + `t()`，全部界面文案已收口。
- 未做：英文字典（新建 `src/lib/locales/en.ts` 实现 `Dict` 类型即可，缺 key 会编译报错）、语言切换 UI、（如需）`/en/` 路由前缀。
- 注意：文章内容（content/*.md）不在字典内，多语言内容需另行规划。

### 5. GitHub 评论区为构建期快照
- 数据（stars/issues/discussions）在 `npm run build` 时固化，构建间不更新。
- 匿名 GitHub API 限额 60 次/时/IP，当前一次全量构建 ≈ 60 次调用，接近上限；如需稳定可在构建环境提供 `GITHUB_TOKEN`（需在 `src/lib/github.ts` 加 Authorization 头支持，未实现）。
- 构建日志中若干 `410 Gone` 为仓库未开启 Discussions，属正常。

### 6. 双 lockfile
- `package-lock.json` 与 `pnpm-lock.yaml` 并存（本轮两者都已同步）。建议确定唯一包管理器后删除另一个，CI 目前用 npm。

## 低优先级

### 7. 站点配置占位
- `src/config/site.ts`：个人经历时间线为占位数据（带 TODO 注释）；`siteConfig.url` 仍为 `hezhijie0327.github.io`，绑定正式域名后需更新（影响 RSS / sitemap / llms.txt 的绝对链接）。

### 8. 清理项
- `content/app-icons/` 的 16 个 SVG 无任何引用（疑似为未来自部署面板页预留），确认不用可删。
- caniuse-lite 数据过期警告（`npx update-browserslist-db@latest`），不影响构建。
- `lib/utils.ts` 的 `formatDate`/`formatDateISO` 硬编码 `zh-CN`，i18n 落地时需按 locale 格式化。

## 已知设计决策（勿轻易回退）

- **零 webfont**：系统字体栈（ZJSearch 同款策略）。宋体族仅作标题/正文衬线，Windows 回退 SimSun、macOS 回退 Songti。webfont 曾致 CSS 276KB + perf 91。
- **评论构建期取数**：客户端不打 api.github.com（匿名 60/h 限额 + 403 控制台噪音）。
- **Mermaid 懒加载**：进视口才加载（库 ~2.7MB），`cloudflare-workers` 页曾因预加载 perf 掉到 82。
- **审计服务器非通用工具**：内置 trace 端点镜像、RSC 路径映射、gzip 均为「镜像生产 CDN 行为」的审计环境设施，勿用于开发服务器。

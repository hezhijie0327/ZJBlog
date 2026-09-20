// 简体中文词库：与 en.ts 的 StringKey 一一对应，缺 key / 拼错 key 编译报错。
// EN（en.ts）是基准，本文件提供全量中文文案。

import type { StringKey } from "@/lib/i18n/en.ts";

export const ZH_CN: Record<StringKey, string> = {
  // 导航
  "nav.home": "首页",
  "nav.projects": "项目",
  "nav.blogs": "博客",
  "nav.archives": "归档",
  "nav.support": "支持",
  "nav.search": "搜索",
  "nav.searchTitle": "搜索 (Ctrl+K)",
  "nav.themeAuto": "主题：跟随系统",
  "nav.themeLight": "主题：亮色",
  "nav.themeDark": "主题：暗色",
  "nav.rss": "RSS 订阅",
  "nav.github": "GitHub",
  "nav.openMenu": "打开菜单",
  "nav.closeMenu": "关闭菜单",

  // 页头（SectionHeading）
  "page.blogs.title": "全部文章",
  "page.blogs.en": "Blog",
  "page.archives.title": "归档",
  "page.archives.en": "Archive",
  "page.projects.title": "项目",
  "page.projects.en": "Projects",
  "page.support.title": "支持",
  "page.support.en": "Support",

  // 首页章节
  "home.featured.title": "精选项目",
  "home.featured.en": "Selected Work",
  "home.recent.title": "最新思考",
  "home.recent.en": "Recent Posts",
  "home.cta.projects": "查看项目",
  "home.cta.blogs": "阅读博客",
  "home.moreProjects": "MORE PROJECTS · 更多项目",
  "home.viewAllProjects": "查看全部项目",
  "home.viewAllPosts": "查看全部文章",
  "home.emptyPosts": "还没有文章，敬请期待。",

  // 计数
  "count.projects": "共 {n} 个",
  "count.nProjects": "{n} 个",
  "count.posts": "共 {n} 篇",
  "count.nPosts": "{n} 篇",

  // 博客
  "blog.back": "BLOG / 全部文章",
  "blog.publishedOn": "发布于 {date}",
  "blog.empty.title": "暂无文章",
  "blog.empty.desc": "内容正在整理中，敬请期待。",
  "blog.notFound": "文章未找到",
  "blog.fallbackDesc": "个人技术博客",

  // 归档
  "archives.empty": "暂无可归档的内容。",
  "archives.unknownYear": "未知",

  // 项目
  "project.back": "PROJECTS / 全部项目",
  "project.personal": "个人项目",
  "project.starred": "精选项目",
  "project.viewRepo": "查看仓库",
  "project.visitLink": "访问链接",
  "project.updatedOn": "更新于 {date}",
  "projects.selectedLabel": "SELECTED WORK · 个人项目",
  "projects.starredLabel": "Starred · 精选开源项目",
  "projects.empty.title": "暂无项目",
  "projects.empty.desc": "项目正在整理中，敬请期待。",
  "projects.githubMore": "在 GitHub 查看更多",
  "project.notFound": "项目未找到",
  "project.fallbackDesc": "个人项目展示",

  // 搜索
  "search.title": "站内搜索",
  "search.placeholder": "搜索文章与项目…",
  "search.inputLabel": "搜索关键词",
  "search.loading": "加载索引中…",
  "search.noResults": "没有匹配的结果",
  "search.emptyIndex": "暂无可搜索的内容",
  "search.typeBlog": "博客",
  "search.typeProject": "项目",
  "search.hintSelect": "↑↓ 选择",
  "search.hintOpen": "↵ 打开",
  "search.hintClose": "ESC 关闭",

  // 赞赏
  "donation.wechat": "微信支付",
  "donation.alipay": "支付宝",
  "donation.lede1": "如果这里的文章或项目对你有帮助，",
  "donation.lede2": "欢迎请我喝杯咖啡 ☕",
  "donation.sub": "每一份支持都是持续创作与维护的动力。",
  "donation.wechatHint": "扫描二维码进行微信支付",
  "donation.alipayHint": "扫描二维码进行支付宝支付",
  "donation.thanks": "谢谢你的支持",
  "donation.metaDesc": "如果这个站点的内容对你有帮助，欢迎支持我继续创作",

  // 评论（GitHub）
  "comments.discussions": "讨论与评论",
  "comments.issues": "问题与反馈",
  "comments.loading": "正在加载评论…",
  "comments.unavailable": "评论数据暂不可用",
  "comments.unavailableBlurb": "GitHub 接口暂时无法访问（可能已限流），稍后刷新即可恢复",
  "comments.noRepo": "此内容未关联 GitHub 仓库",
  "comments.welcome": "欢迎参与讨论",
  "comments.welcomeIssues": "欢迎反馈问题",
  "comments.noRepoBlurb": "对此内容有疑问或建议？访问 GitHub 仓库参与讨论",
  "comments.openRepo": "打开仓库",
  "comments.noDescription": "暂无描述",
  "comments.stateOpen": "开放",
  "comments.stateClosed": "已关闭",
  "comments.blurbDiscussions": "对此内容有疑问或建议？提交 Issue 或创建新的 Discussion",
  "comments.blurbIssues": "对此内容有疑问或建议？通过 Issues 提出问题和建议",
  "comments.submitIssue": "提交 Issue",
  "comments.createDiscussion": "创建讨论",

  // 404
  "notFound.blurb": "页面不存在或已被移动。",
  "notFound.back": "返回首页",

  // 杂项
  "misc.backToTop": "返回顶部",
  "markdown.empty": "内容为空或加载失败。",
  "mermaid.loading": "正在渲染流程图...",
  "mermaid.failed": "Mermaid 渲染失败",
};

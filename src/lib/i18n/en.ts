// UI 文案基准词库（English）：StringKey 的来源。
// 新增语言 = 新建 ./<tag>.ts 导出 Record<StringKey, string>（Partial 亦可，
// 缺失键回退 EN）+ 在 lib/i18n.ts 的 CATALOGS 注册。
// {name} 形式的占位符由 t(key, params) 替换。

export const EN = {
  // 站点（UI 层品牌与作者；构建期元数据在 config/site.ts）
  "site.brand": "ZJBlog",
  "site.author": "Zhijie He",

  // Hero
  "hero.kicker": "Tech · Open Source · Life",
  "hero.greeting": "Hi, I'm ",
  "hero.motto": "Stay Hungry, Stay Foolish.",

  // 导航
  "nav.home": "Home",
  "nav.projects": "Projects",
  "nav.blogs": "Blog",
  "nav.archives": "Archives",
  "nav.support": "Support",
  "nav.search": "Search",
  "nav.searchTitle": "Search (Ctrl+K)",
  "nav.themeAuto": "Theme: system",
  "nav.themeLight": "Theme: light",
  "nav.themeDark": "Theme: dark",
  "nav.language": "Switch to 中文",
  "nav.rss": "RSS Feed",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.mobileNav": "Mobile navigation",

  // 页头（SectionHeading）
  "page.blogs.title": "All Posts",
  "page.blogs.en": "",
  "page.archives.title": "Archives",
  "page.archives.en": "",
  "page.projects.title": "Projects",
  "page.projects.en": "",
  "page.support.title": "Support",

  // 首页章节
  "home.featured.title": "Featured Projects",
  "home.featured.en": "Selected Work",
  "home.recent.title": "Latest Writing",
  "home.recent.en": "Recent Posts",
  "home.cta.projects": "View Projects",
  "home.cta.blogs": "Read the Blog",
  "home.moreProjects": "MORE PROJECTS",
  "home.viewAllProjects": "View all projects",
  "home.viewAllPosts": "View all posts",
  "home.emptyPosts": "No posts yet — stay tuned.",
  "home.contact.title": "Say hello.",
  "home.contact.en": "SAY HELLO",
  "home.contact.desc": "Ideas about a project or a post? Find me on GitHub, or subscribe via RSS to follow along.",
  "home.storybar": "Page sections",

  // 计数
  "count.projects": "{n} in total",
  "count.posts": "{n} in total",
  "count.nPosts": "{n}",

  // 博客
  "blog.back": "BLOG / All Posts",
  "blog.rail": "Recent Posts",
  "blog.tagDesc": 'All posts tagged "{tag}"',
  "blog.empty.title": "No posts yet",
  "blog.empty.desc": "Content is being prepared — stay tuned.",
  "blog.fallbackDesc": "Personal tech blog",

  // 文章页
  "post.toc": "On this page",
  "post.copyCode": "Copy",
  "post.copied": "Copied",
  "post.summary": "Summary",
  "post.prev": "Previous",
  "post.next": "Next",
  "post.authorBy": "Written by {author}",
  "post.licenseNote": "keep attribution and link when sharing",
  "post.storynav": "Post navigation",

  // 图片灯箱
  "lightbox.close": "Close",
  "lightbox.prev": "Previous image",
  "lightbox.next": "Next image",
  "lightbox.zoomOut": "Zoom out",
  "lightbox.zoomIn": "Zoom in",

  // 归档
  "archives.empty": "Nothing to archive yet.",
  "archives.unknownYear": "Unknown",

  // 项目
  "project.back": "PROJECTS / All Projects",
  "project.personal": "Personal Project",
  "project.starred": "Starred Project",
  "project.visitLink": "Visit Link",
  "projects.selectedLabel": "PERSONAL WORK · Personal",
  "projects.empty.title": "No projects yet",
  "projects.empty.desc": "Projects are being prepared — stay tuned.",
  "projects.githubMore": "See more on GitHub",
  "project.notFound": "Project not found",
  "project.fallbackDesc": "Personal project showcase",

  // 元信息
  "meta.readingTime": "{n} min read",

  // 搜索
  "search.title": "Search",
  "search.placeholder": "Search posts and projects…",
  "search.inputLabel": "Search keywords",
  "search.loading": "Loading index…",
  "search.noResults": "No matches",
  "search.emptyIndex": "Nothing to search yet",
  "search.typeBlog": "Blog",
  "search.typeProject": "Project",
  "search.results": "Search results",
  "search.hintSelect": "select",
  "search.hintOpen": "open",
  "search.hintClose": "close",

  // 支持页
  "support.wechat": "WeChat Pay",
  "support.alipay": "Alipay",
  "support.lede1": "If a post or project here helped you,",
  "support.lede2": "buying me a coffee is always appreciated ☕",
  "support.sub": "Every bit of support keeps the writing and maintenance going.",
  "support.wechatHint": "Scan to tip via WeChat Pay",
  "support.alipayHint": "Scan to tip via Alipay",
  "support.thanks": "Thank you for your support",
  "support.metaDesc": "If this site helped you, support me to keep creating",

  // giscus 评论
  "comments.title": "Comments",
  "comments.notConfigured": "Comments are on the way",
  "comments.notConfiguredBlurb": "The comment section will appear here once giscus is configured.",

  // 404
  "notFound.blurb": "This page doesn't exist or has moved.",
  "notFound.back": "Back to home",

  // 杂项
  "misc.backToTop": "Back to top",
  "misc.skipToContent": "Skip to content",
  "mermaid.figure": "Mermaid diagram",
  "mermaid.loading": "Rendering diagram…",
  "mermaid.failed": "Mermaid rendering failed",
  "stl.failed": "3D view failed to render",
  "stl.failedHint": "Check that the STL data is complete and refresh.",
} as const;

export type StringKey = keyof typeof EN;

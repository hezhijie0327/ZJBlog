// UI 文案基准词库（English）：StringKey 的来源。
// 新增语言 = 新建 ./<tag>.ts 导出 Record<StringKey, string>（Partial 亦可，
// 缺失键回退 EN）+ 在 lib/i18n.ts 的 CATALOGS 注册。
// {name} 形式的占位符由 t(key, params) 替换。

export const EN = {
  // 导航
  "nav.home": "Home",
  "nav.projects": "Projects",
  "nav.blogs": "Blog",
  "nav.archives": "Archives",
  "nav.support": "Support",
  "nav.search": "Search",
  "nav.searchTitle": "Search (Ctrl+K)",
  "nav.theme": "Toggle theme",
  "nav.rss": "RSS Feed",
  "nav.github": "GitHub",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",

  // 页头（SectionHeading）
  "page.blogs.title": "All Posts",
  "page.blogs.en": "Blog",
  "page.archives.title": "Archives",
  "page.archives.en": "Archive",
  "page.projects.title": "Projects",
  "page.projects.en": "Projects",
  "page.support.title": "Support",
  "page.support.en": "Support",

  // 首页章节
  "home.featured.title": "Featured Projects",
  "home.featured.en": "Selected Work",
  "home.journey.title": "My Journey",
  "home.journey.en": "The Journey",
  "home.recent.title": "Latest Writing",
  "home.recent.en": "Recent Posts",
  "home.contact.title": "Stay in Touch",
  "home.contact.en": "Say Hello",
  "home.cta.projects": "View Projects",
  "home.cta.blogs": "Read the Blog",
  "home.moreProjects": "MORE PROJECTS",
  "home.viewAllProjects": "View all projects",
  "home.viewAllPosts": "View all posts",
  "home.contactBlurb":
    "Questions or ideas about a post or project? Reach me by email, or open an issue or discussion on GitHub.",
  "home.sendEmail": "Send Email",
  "home.emptyPosts": "No posts yet — stay tuned.",

  // 计数
  "count.projects": "{n} in total",
  "count.nProjects": "{n}",
  "count.posts": "{n} in total",
  "count.nPosts": "{n}",

  // 博客
  "blog.back": "BLOG / All Posts",
  "blog.publishedOn": "Published {date}",
  "blog.empty.title": "No posts yet",
  "blog.empty.desc": "Content is being prepared — stay tuned.",
  "blog.notFound": "Post not found",
  "blog.fallbackDesc": "Personal tech blog",

  // 归档
  "archives.empty": "Nothing to archive yet.",
  "archives.unknownYear": "Unknown",

  // 项目
  "project.back": "PROJECTS / All Projects",
  "project.personal": "Personal Project",
  "project.starred": "Starred Project",
  "project.viewRepo": "View Repository",
  "project.visitLink": "Visit Link",
  "project.updatedOn": "Updated {date}",
  "projects.selectedLabel": "SELECTED WORK · Personal",
  "projects.starredLabel": "Starred · Open Source Picks",
  "projects.empty.title": "No projects yet",
  "projects.empty.desc": "Projects are being prepared — stay tuned.",
  "projects.githubMore": "See more on GitHub",
  "project.notFound": "Project not found",
  "project.fallbackDesc": "Personal project showcase",

  // 搜索
  "search.title": "Search",
  "search.placeholder": "Search posts and projects…",
  "search.inputLabel": "Search keywords",
  "search.loading": "Loading index…",
  "search.noResults": "No matches",
  "search.emptyIndex": "Nothing to search yet",
  "search.typeBlog": "Blog",
  "search.typeProject": "Project",
  "search.hintSelect": "↑↓ select",
  "search.hintOpen": "↵ open",
  "search.hintClose": "ESC close",

  // 赞赏
  "donation.wechat": "WeChat Pay",
  "donation.alipay": "Alipay",
  "donation.lede1": "If a post or project here helped you,",
  "donation.lede2": "buying me a coffee is always appreciated ☕",
  "donation.sub": "Every bit of support keeps the writing and maintenance going.",
  "donation.wechatHint": "Scan to tip via WeChat Pay",
  "donation.alipayHint": "Scan to tip via Alipay",
  "donation.sponsorsHint": "Developers can support me through GitHub Sponsors",
  "donation.thanks": "Thank you for your support",
  "donation.metaDesc": "If this site helped you, support me to keep creating",

  // 评论（GitHub）
  "comments.discussions": "Discussions",
  "comments.issues": "Issues & Feedback",
  "comments.loading": "Loading comments…",
  "comments.unavailable": "Comments unavailable right now",
  "comments.unavailableBlurb":
    "The GitHub API is temporarily unreachable (possibly rate-limited) — refresh a bit later.",
  "comments.noRepo": "No GitHub repository linked to this content",
  "comments.welcome": "Join the discussion",
  "comments.welcomeIssues": "Feedback welcome",
  "comments.noRepoBlurb": "Questions or suggestions? Visit the repository on GitHub to join in.",
  "comments.openRepo": "Open Repository",
  "comments.noDescription": "No description",
  "comments.stateOpen": "Open",
  "comments.stateClosed": "Closed",
  "comments.blurbDiscussions": "Questions or suggestions? Submit an issue or start a new discussion.",
  "comments.blurbIssues": "Questions or suggestions? Raise them through Issues.",
  "comments.submitIssue": "Submit Issue",
  "comments.createDiscussion": "New Discussion",

  // 页脚
  "footer.loading": "Loading…",
  "footer.unavailable": "Unavailable",
  "footer.pqProtected": "Post-quantum encryption",
  "footer.detecting": "Detecting…",
  "footer.standard": "Standard encryption",
  "footer.backToTop": "Back to top",

  // 404
  "notFound.blurb": "This page doesn't exist or has moved.",
  "notFound.back": "Back to home",

  // 杂项
  "markdown.empty": "Content is empty or failed to load.",
  "mermaid.loading": "Rendering diagram…",
  "mermaid.failed": "Mermaid rendering failed",
} as const;

export type StringKey = keyof typeof EN;

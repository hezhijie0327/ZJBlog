// 站点元数据（构建期 RSS / sitemap / OG / llms.txt 与运行时外链共用）。
// 注意：UI 层文案（品牌名 / 作者名 / hero 文案）不在这里 —— 它们在
// lib/i18n/*.ts 词库里，随界面语言切换；本文件只承载不翻译的元数据。

export const siteConfig = {
  // SEO 基准标题与描述（构建期元数据，语言跟随内容：中文）
  title: "治杰 Online",
  description: "贺治杰的个人技术博客与项目展示",
  // 站点正式 URL（用于 RSS / sitemap / OpenGraph）
  // TODO: 绑定自定义域名后修改为正式地址
  url: "https://hezhijie0327.github.io",
  // 作者中文名（llms.txt 等构建期文案用；UI 显示用 i18n 的 site.author）
  author: "贺治杰",
  social: {
    github: "https://github.com/hezhijie0327",
  },
  // 博客评论所在的 GitHub 仓库（owner/repo）
  commentsRepo: "hezhijie0327/blog",
};

// 首页「精选项目」展示数量，其余个人项目折叠进「更多项目」
export const featuredProjectCount = 4;

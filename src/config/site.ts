// 站点全局配置：元数据、社交链接、首页文案与个人经历
// 修改本文件即可更新全站对应内容，无需改动组件

export const siteConfig = {
  // 站点元数据
  name: "治杰 Online",
  title: "治杰 Online",
  description: "贺治杰的个人技术博客与项目展示",
  // 站点正式 URL（用于 RSS / sitemap / OpenGraph）
  // TODO: 绑定自定义域名后修改为正式地址
  url: "https://hezhijie0327.github.io",
  author: "贺治杰",
  // 页脚版权署名（拉丁字母拼写）
  copyrightName: "Zhijie Online",
  locale: "zh_CN",
  keywords: ["技术博客", "开源项目", "个人作品", "贺治杰"],

  // 社交链接
  social: {
    github: "https://github.com/hezhijie0327",
    email: "mailto:admin@zhijie.online",
  },

  // 博客评论所在的 GitHub 仓库（owner/repo）
  commentsRepo: "hezhijie0327/blog",

  // Hero 区域文案
  hero: {
    greeting: "Hi, 我是",
    role: "开发者 · 中国",
    tagline: "一些创造，一些生活，一直保持好奇。",
  },
};

// 首页「精选项目」展示数量，其余个人项目折叠进「更多项目」
export const featuredProjectCount = 4;

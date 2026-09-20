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
    greeting: "Hi，我是",
    role: "开发者 · 中国",
    tagline: "一些创造，一些生活，一直保持好奇。",
    mottoEn: "Stay Hungry, Stay Foolish.",
    mottoZh: "求知若渴，虚心若愚。",
  },

  // 页脚格言
  footerMotto: {
    en: "Stay Hungry, Stay Foolish.",
    zh: "求知若渴，虚心若愚。",
  },
};

// 个人经历时间线（首页「02 / 个人经历」区域）
// TODO: 以下均为占位数据，请替换为真实经历
export interface TimelineEntry {
  period: string;
  title: string;
  description?: string;
}

export const timeline: TimelineEntry[] = [
  {
    period: "20XX",
    title: "开始接触编程",
    description: "占位数据：请替换为你的真实经历（src/config/site.ts）",
  },
  {
    period: "20XX – 20XX",
    title: "计算机相关专业 学士",
    description: "占位数据：请替换为你的真实经历（src/config/site.ts）",
  },
  {
    period: "20XX – 至今",
    title: "独立开发者",
    description: "维护 ZJSearch、Cloudflare Workers 等开源项目，探索网络与前端技术",
  },
];

// 首页「精选项目」展示数量，其余个人项目折叠进「更多项目」
export const featuredProjectCount = 4;

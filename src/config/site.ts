// 站点元数据（构建期 RSS / sitemap / OG / llms.txt 与运行时外链共用）。
// 注意：UI 层文案（品牌名 / 作者名 / hero 文案）不在这里 —— 它们在
// lib/i18n/*.ts 词库里，随界面语言切换；本文件只承载不翻译的元数据。

/** giscus 评论配置（github.com/giscus/giscus 组件所需的仓库与分区标识） */
export interface GiscusConfig {
  /** owner/repo 形态的仓库标识 */
  repo: `${string}/${string}`;
  /** 仓库的 GraphQL node id（giscus.app 生成） */
  repoId: string;
  /** Discussion 分区名 */
  category: string;
  /** 分区的 GraphQL node id（giscus.app 生成）；空串视为未配置 */
  categoryId: string;
}

export const siteConfig = {
  // SEO 基准标题与描述（构建期元数据，语言跟随内容：中文）
  title: "ZJBlog",
  description: "Zhijie He's personal technical blog and project showcase",
  // 站点正式 URL（用于 RSS / sitemap / OpenGraph）
  url: "https://www.zhijie.online",
  // 作者中文名（llms.txt 等构建期文案用；UI 显示用 i18n 的 site.author）
  author: "Zhijie He",
  // 页脚版权持有者（© {year} <copyright>；个人字标，不随产品名变动、不随 UI 语言翻译）
  copyright: "Zhijie Online",
  social: {
    github: "https://github.com/hezhijie0327",
  },
  // giscus 评论（GitHub Discussions 驱动，按页面路径映射）。repo / repoId
  // 来自仓库元数据；category / categoryId 取自 giscus.app 生成的配置。
  giscus: {
    repo: "hezhijie0327/ZJBlog",
    repoId: "R_kgDOQsmIRg",
    category: "Announcements",
    categoryId: "DIC_kwDOQsmIRs4C0EgF",
  } satisfies GiscusConfig,
};

// 首页「精选项目」展示数量，其余个人项目折叠进「更多项目」
export const featuredProjectCount = 4;
// 「更多项目」列表的展示上限（其余从「查看全部项目」进入）
export const moreProjectsCount = 4;

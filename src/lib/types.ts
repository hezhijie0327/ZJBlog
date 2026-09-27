// 页面 payload（判别联合）：构建期由 tools/payloads.ts 生成，嵌入每页 HTML 的
// <script id="page-data" type="application/json">；站内换页时从目标页 HTML 中
// 提取同名脚本。globals.page 是判别标签，分发见 src/app.tsx。

import type { ComponentType } from "react";

export type PageKind =
  | "home"
  | "blogs"
  | "blog-post"
  | "blog-tag"
  | "travels"
  | "travel"
  | "projects"
  | "project"
  | "archives"
  | "support"
  | "og"
  | "not-found";

/** 文章目录条目（构建期提取，id = rehype-slug 锚点）。 */
export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface PageGlobals {
  page: PageKind;
  /** UI 语言标签（对应 src/lib/i18n/ 下的词库文件名） */
  locale: "zh-CN";
  siteName: string;
  siteUrl: string;
  /** 完整 <title> 文本（含「 | 站点名」后缀），换页时写入 document.title */
  title: string;
  description: string;
  /** 文章页附加的 OpenGraph 字段 */
  og?: { type: "article"; publishedTime?: string; tags?: string[] };
}

/** 加密博文信封：构建期 tools/crypto.ts 产出（Argon2id 派生密钥 +
 * AES-256-GCM 加密，明文为 JSON { html, toc }），客户端 src/lib/locked.ts
 * 按信封内参数解密。两端共用同一契约，参数演进靠 v 分支。 */
export interface LockedContent {
  /** 信封版本 */
  v: 1;
  /** Argon2id：内存（KiB）/ 迭代次数 / 并行度 / 派生密钥字节数 */
  m: number;
  t: number;
  p: number;
  len: number;
  /** base64：16B 随机盐（每篇每构建独立，重建即换） */
  salt: string;
  /** base64：12B 随机 IV */
  iv: string;
  /** base64：AES-256-GCM 密文（认证 tag 后置，即 WebCrypto 原生格式） */
  ciphertext: string;
}

export interface BlogListItem {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  /** 阅读时长（分钟）；展示文案走 i18n（meta.readingTime） */
  readingMinutes: number;
  /** 加密博文：列表仅公开标题等元信息（description 即内容摘要，绝不公开），正文需密码解锁 */
  locked?: boolean;
}

export interface ProjectListItem {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  type: "personal" | "starred";
  tags: string[];
  link?: string;
  /** 封面图（frontmatter.image）；缺省时页面不渲染封面位 */
  image?: string;
}

export interface HomeData {
  globals: PageGlobals & { page: "home" };
  projects: ProjectListItem[];
  blogs: BlogListItem[];
}

export interface BlogsData {
  globals: PageGlobals & { page: "blogs" };
  blogs: BlogListItem[];
}

export interface BlogPostData {
  globals: PageGlobals & { page: "blog-post" };
  /** contentHtml 不进 page-data 脚本（长文会让文档体积翻倍）：正文单份存于
   *  DOM，由启动管道（首帧）与换页管道（fetch 解析）注入后才存在。
   *  注意 locked 在列表项上是布尔标记、在这里是密文信封，故 Omit 后重定义。 */
  post: Omit<BlogListItem, "locked"> & {
    toc: TocItem[];
    contentHtml?: string;
    /** 正文含 KaTeX 公式：页面需加载 katex.min.css（SSR 注入 / Prose 补注） */
    needsKatex?: boolean;
    /** 手写摘要（frontmatter.summary，有才渲染摘要卡） */
    summary?: string;
    /** 加密信封（有值 = 锁定文）：contentHtml/toc/summary 不出现在 payload，
     *  锁屏解锁后由客户端解密还原正文 */
    locked?: LockedContent;
    /** 时间线上更旧 / 更新的一篇（构建期算好；边界为 undefined） */
    prev?: PostNavLink;
    next?: PostNavLink;
  };
}

/** 上一篇 / 下一篇导航链接 */
export interface PostNavLink {
  slug: string;
  title: string;
}

/** 搜索索引条目（/search-index.json，构建期 generators.ts 产出、命令面板消费 ——
 *  两端共享同一契约，防止字段漂移）。 */
export interface SearchItem {
  title: string;
  description?: string;
  type: "blog" | "project";
  tags: string[];
  href: string;
}

export interface BlogTagData {
  globals: PageGlobals & { page: "blog-tag" };
  /** 标签名（解码后的原文） */
  tag: string;
  blogs: BlogListItem[];
}

/** 旅行条目（/travels/ 明信片墙 + 地图针脚共用）。针脚与地名/日期是公开的
 *  纪念层；secret 命中的旅行详情上锁，summary/cover 等内容性字段不出站。 */
export interface TravelListItem {
  slug: string;
  title: string;
  /** 地图针脚短标签 */
  place: string;
  /** [lng, lat]（GeoJSON 约定） */
  coords: [number, number];
  date?: string;
  endDate?: string;
  /** 同行者：情侣心形针脚 / 独行圆环针脚 */
  companion: "couple" | "solo";
  /** 封面图（明信片卡；锁定文不出站） */
  cover?: string;
  summary?: string;
  /** 相关游记（/blogs/...） */
  link?: string;
  /** 详情已上锁（frontmatter.secret 命中） */
  locked?: boolean;
}

export interface TravelsData {
  globals: PageGlobals & { page: "travels" };
  trips: TravelListItem[];
  /** 构建期烘好的世界地图 SVG（含市内细节层与重放镜头编排 data-stops）：
   *  单份存于 DOM（#travel-map），由启动管道与换页管道注入后才存在
   *  （同 contentHtml 契约，不进 page-data） */
  mapSvg?: string;
}

export interface TravelData {
  globals: PageGlobals & { page: "travel" };
  /** 同 BlogPostData：contentHtml 由 DOM 注入，不进 page-data。
   *  locked 在列表项上是布尔标记、在这里是密文信封，故 Omit 后重定义。 */
  trip: Omit<TravelListItem, "locked"> & {
    contentHtml?: string;
    needsKatex?: boolean;
    locked?: LockedContent;
  };
}

export interface ProjectsData {
  globals: PageGlobals & { page: "projects" };
  projects: ProjectListItem[];
}

export interface ProjectData {
  globals: PageGlobals & { page: "project" };
  /** 同 BlogPostData：contentHtml 由 DOM 注入，不进 page-data */
  project: ProjectListItem & { contentHtml?: string; needsKatex?: boolean };
}

export interface ArchivesData {
  globals: PageGlobals & { page: "archives" };
  blogs: BlogListItem[];
}

export interface SupportData {
  globals: PageGlobals & { page: "support" };
}

/** OG 分享卡页（/og/，noindex 工具页）：1200×630 固定画布，供无头浏览器
 *  截图生成 public/og-default.png。内容取站点配置与中文文案基线，
 *  不随 UI 语言切换（截图语言必须稳定）。 */
export interface OgData {
  globals: PageGlobals & { page: "og" };
}

export interface NotFoundData {
  globals: PageGlobals & { page: "not-found" };
}

export type AnyPageData =
  | HomeData
  | BlogsData
  | BlogPostData
  | BlogTagData
  | TravelsData
  | TravelData
  | ProjectsData
  | ProjectData
  | ArchivesData
  | SupportData
  | OgData
  | NotFoundData;

// 类型守卫（嵌套判别字段无法直接 switch 收窄）
export function isHomeData(data: AnyPageData): data is HomeData {
  return data.globals.page === "home";
}
export function isBlogsData(data: AnyPageData): data is BlogsData {
  return data.globals.page === "blogs";
}
export function isBlogPostData(data: AnyPageData): data is BlogPostData {
  return data.globals.page === "blog-post";
}
export function isBlogTagData(data: AnyPageData): data is BlogTagData {
  return data.globals.page === "blog-tag";
}
export function isTravelsData(data: AnyPageData): data is TravelsData {
  return data.globals.page === "travels";
}
export function isTravelData(data: AnyPageData): data is TravelData {
  return data.globals.page === "travel";
}
export function isProjectsData(data: AnyPageData): data is ProjectsData {
  return data.globals.page === "projects";
}
export function isProjectData(data: AnyPageData): data is ProjectData {
  return data.globals.page === "project";
}
export function isArchivesData(data: AnyPageData): data is ArchivesData {
  return data.globals.page === "archives";
}
export function isSupportData(data: AnyPageData): data is SupportData {
  return data.globals.page === "support";
}
export function isOgData(data: AnyPageData): data is OgData {
  return data.globals.page === "og";
}

/** SSR/预渲染用的同步页面组件表：renderToString 无法等待 React.lazy，
 *  服务端经此表直接渲染真实内容（客户端走 pages/registry.ts 分块 + Suspense）。 */
export interface SyncPages {
  home: ComponentType<{ data: HomeData }>;
  blogs: ComponentType<{ data: BlogsData }>;
  "blog-post": ComponentType<{ data: BlogPostData }>;
  "blog-tag": ComponentType<{ data: BlogTagData }>;
  travels: ComponentType<{ data: TravelsData }>;
  travel: ComponentType<{ data: TravelData }>;
  projects: ComponentType<{ data: ProjectsData }>;
  project: ComponentType<{ data: ProjectData }>;
  archives: ComponentType<{ data: ArchivesData }>;
  support: ComponentType;
  og: ComponentType;
}

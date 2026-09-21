// 页面 payload（判别联合）：构建期由 tools/payloads.ts 生成，嵌入每页 HTML 的
// <script id="page-data" type="application/json">；站内换页时从目标页 HTML 中
// 提取同名脚本（ZJSearch 同款契约）。globals.page 是判别标签，分发见 src/app.tsx。

import type { ComponentType } from "react";

export type PageKind = "home" | "blogs" | "blog-post" | "projects" | "project" | "archives" | "support" | "not-found";

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

export interface BlogListItem {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  /** 阅读时长（分钟）；展示文案走 i18n（meta.readingTime） */
  readingMinutes: number;
}

export interface ProjectListItem {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  type: "personal" | "starred";
  tags: string[];
  link?: string;
  githubRepo?: string;
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
   *  DOM，由启动管道（首帧）与换页管道（fetch 解析）注入后才存在 */
  post: BlogListItem & { toc: TocItem[]; contentHtml?: string };
}

export interface ProjectsData {
  globals: PageGlobals & { page: "projects" };
  projects: ProjectListItem[];
}

export interface ProjectData {
  globals: PageGlobals & { page: "project" };
  /** 同 BlogPostData：contentHtml 由 DOM 注入，不进 page-data */
  project: ProjectListItem & { contentHtml?: string };
}

export interface ArchivesData {
  globals: PageGlobals & { page: "archives" };
  blogs: BlogListItem[];
}

export interface SupportData {
  globals: PageGlobals & { page: "support" };
}

export interface NotFoundData {
  globals: PageGlobals & { page: "not-found" };
}

export type AnyPageData =
  | HomeData
  | BlogsData
  | BlogPostData
  | ProjectsData
  | ProjectData
  | ArchivesData
  | SupportData
  | NotFoundData;

// 类型守卫（ZJSearch 同款分发方式；嵌套判别字段无法直接 switch 收窄）
export function isHomeData(data: AnyPageData): data is HomeData {
  return data.globals.page === "home";
}
export function isBlogsData(data: AnyPageData): data is BlogsData {
  return data.globals.page === "blogs";
}
export function isBlogPostData(data: AnyPageData): data is BlogPostData {
  return data.globals.page === "blog-post";
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

/** SSR/预渲染用的同步页面组件表：renderToString 无法等待 React.lazy，
 *  服务端经此表直接渲染真实内容（客户端走 pages/registry.ts 分块 + Suspense）。 */
export interface SyncPages {
  home: ComponentType<{ data: HomeData }>;
  blogs: ComponentType<{ data: BlogsData }>;
  "blog-post": ComponentType<{ data: BlogPostData }>;
  projects: ComponentType<{ data: ProjectsData }>;
  project: ComponentType<{ data: ProjectData }>;
  archives: ComponentType<{ data: ArchivesData }>;
  support: ComponentType;
}

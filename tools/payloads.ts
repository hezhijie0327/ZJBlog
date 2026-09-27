// 页面 payload 构建：每条路由 → 判别联合 payload（含文档头所需的
// title / description / OG）。SSR、预渲染与静态生成器共用；客户端契约
// （类型）见 src/lib/types.ts。

import { siteConfig } from "../src/config/site.ts";
import { translateFor } from "../src/lib/i18n.ts";
import type {
  AnyPageData,
  BlogListItem,
  LockedContent,
  PageGlobals,
  PageKind,
  ProjectListItem,
  TravelListItem,
} from "../src/lib/types.ts";
import { loadContent } from "./content.ts";
import { renderWorldMap } from "./travelMap.ts";

const t = translateFor("zh-CN");
const TITLE_SUFFIX = ` | ${siteConfig.title}`;

function globals<P extends PageKind>(page: P, title: string, description: string): PageGlobals & { page: P } {
  return {
    page,
    locale: "zh-CN",
    siteName: siteConfig.title,
    siteUrl: siteConfig.url,
    title: page === "home" ? siteConfig.title : `${title}${TITLE_SUFFIX}`,
    description,
  };
}

function toBlogListItem(entry: {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  category?: string;
  tags: string[];
  readingMinutes: number;
  locked?: LockedContent;
}): BlogListItem {
  const item: BlogListItem = {
    slug: entry.slug,
    title: entry.title,
    date: entry.date,
    category: entry.category,
    tags: entry.tags,
    readingMinutes: entry.readingMinutes,
  };
  // 加密文：description / summary 即内容摘要，任何列表一律不带；仅标记锁
  if (entry.locked) {
    item.locked = true;
  } else {
    item.description = entry.description;
  }
  return item;
}

function toProjectListItem(entry: {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  type: "personal" | "starred";
  tags: string[];
  link?: string;
  image?: string;
}): ProjectListItem {
  return {
    slug: entry.slug,
    title: entry.title,
    date: entry.date,
    description: entry.description,
    type: entry.type,
    tags: entry.tags,
    link: entry.link,
    image: entry.image,
  };
}

/** 旅行列表项：锁定旅行的 cover/summary 属内容性字段不出站（针脚与
 *  地名/日期是公开纪念层）。 */
function toTravelListItem(entry: {
  slug: string;
  title: string;
  place: string;
  coords: [number, number];
  date?: string;
  endDate?: string;
  companion: "couple" | "solo";
  cover?: string;
  summary?: string;
  link?: string;
  locked?: LockedContent;
}): TravelListItem {
  const item: TravelListItem = {
    slug: entry.slug,
    title: entry.title,
    place: entry.place,
    coords: entry.coords,
    date: entry.date,
    endDate: entry.endDate,
    companion: entry.companion,
    link: entry.link,
  };
  if (entry.locked) {
    item.locked = true;
  } else {
    item.cover = entry.cover;
    item.summary = entry.summary;
  }
  return item;
}

/** 全部已发布路由（URL 形态，带尾斜杠；首页为 "/"）。预渲染与 RSS/sitemap
 *  的路线来源共用；注意：generateSitemap 只列内容页，标签筛选页属重复内容
 *  视图，刻意不进 sitemap。 */
export function allRoutes(): string[] {
  const { blogs, projects, travels } = loadContent();
  const tags = [...new Set(blogs.flatMap((blog) => blog.tags))];
  return [
    "/",
    "/blogs/",
    ...blogs.map((blog) => `/blogs/${encodeURIComponent(blog.slug)}/`),
    ...tags.map((tag) => `/blogs/tags/${encodeURIComponent(tag)}/`),
    "/travels/",
    ...travels.map((travel) => `/travels/${encodeURIComponent(travel.slug)}/`),
    "/archives/",
    "/projects/",
    ...projects.map((project) => `/projects/${encodeURIComponent(project.slug)}/`),
    "/support/",
    "/og/",
  ];
}

/** 路由 → payload。未知路径返回 not-found payload（预渲染 404 页与
 *  客户端兜底共用）。 */
export function buildPayload(pathname: string): AnyPageData {
  const { blogs, projects, travels } = loadContent();
  const blogLists = blogs.map(toBlogListItem);
  const projectLists = projects.map(toProjectListItem);
  const travelLists = travels.map(toTravelListItem);

  if (pathname === "/") {
    return {
      globals: globals("home", siteConfig.title, siteConfig.description),
      projects: projectLists,
      blogs: blogLists,
    };
  }
  if (pathname === "/blogs/") {
    return { globals: globals("blogs", t("page.blogs.title"), siteConfig.description), blogs: blogLists };
  }
  if (pathname === "/travels/") {
    return {
      globals: globals("travels", t("page.travels.title"), siteConfig.description),
      trips: travelLists,
      // 地图 SVG（含市内细节层）单份存 DOM：slimForClient 会从 page-data 剥掉
      // 它；无旅行时不烘底图（空状态页面不承担体积）
      ...(travelLists.length > 0 ? { mapSvg: renderWorldMap(travelLists).mapSvg } : {}),
    };
  }
  if (pathname === "/archives/") {
    return { globals: globals("archives", t("page.archives.title"), siteConfig.description), blogs: blogLists };
  }
  if (pathname === "/projects/") {
    return { globals: globals("projects", t("page.projects.title"), siteConfig.description), projects: projectLists };
  }
  if (pathname === "/support/") {
    return { globals: globals("support", t("page.support.title"), t("support.metaDesc")) };
  }
  if (pathname === "/og/") {
    return { globals: globals("og", "OG", siteConfig.description) };
  }

  const tagMatch = pathname.match(/^\/blogs\/tags\/(.+)\/$/);
  if (tagMatch?.[1]) {
    const tag = decodeURIComponent(tagMatch[1]);
    const tagged = blogLists.filter((blog) => blog.tags.includes(tag));
    return {
      globals: globals("blog-tag", `#${tag}`, t("blog.tagDesc", { tag })),
      tag,
      blogs: tagged,
    };
  }

  const blogMatch = pathname.match(/^\/blogs\/(.+)\/$/);
  if (blogMatch?.[1]) {
    const index = blogs.findIndex((entry) => entry.slug === blogMatch[1]);
    const post = blogs[index];
    if (post) {
      const item = toBlogListItem(post);
      // 列表项上的 locked 是布尔标记；文章 payload 上的 locked 是密文信封，
      // 同名不同义，先剥掉标记再按分支组装
      const { locked: _lockFlag, ...meta } = item;
      // blogs 已按日期倒序：i-1 更新（下一篇），i+1 更旧（上一篇）
      const newer = index > 0 ? blogs[index - 1] : undefined;
      const older = index >= 0 && index < blogs.length - 1 ? blogs[index + 1] : undefined;
      // 加密文：目录结构也属内容（随正文一起加密），meta 描述用兜底文案，
      // 只公开标题/日期/分类/标签等与列表页同级的元信息
      if (post.locked) {
        return {
          globals: {
            ...globals("blog-post", post.title, t("blog.protectedDesc")),
            og: { type: "article", publishedTime: post.date, tags: post.tags },
          },
          post: {
            ...meta,
            toc: [],
            needsKatex: post.needsKatex,
            locked: post.locked,
            ...(older ? { prev: { slug: older.slug, title: older.title } } : {}),
            ...(newer ? { next: { slug: newer.slug, title: newer.title } } : {}),
          },
        };
      }
      return {
        globals: {
          ...globals("blog-post", post.title, post.description ?? t("blog.fallbackDesc")),
          og: { type: "article", publishedTime: post.date, tags: post.tags },
        },
        post: {
          ...meta,
          toc: post.toc,
          contentHtml: post.contentHtml,
          needsKatex: post.needsKatex,
          summary: post.summary,
          ...(older ? { prev: { slug: older.slug, title: older.title } } : {}),
          ...(newer ? { next: { slug: newer.slug, title: newer.title } } : {}),
        },
      };
    }
  }

  const travelMatch = pathname.match(/^\/travels\/(.+)\/$/);
  if (travelMatch?.[1]) {
    const travel = travels.find((entry) => entry.slug === travelMatch[1]);
    if (travel) {
      const item = toTravelListItem(travel);
      // 列表项上的 locked 是布尔标记；详情 payload 上的 locked 是密文信封
      const { locked: _lockFlag, ...meta } = item;
      // 锁定旅行：故事与照片都在信封里，meta 描述用兜底文案（针脚/地名/日期
      // 是公开纪念层，已在列表项中保留）
      if (travel.locked) {
        return {
          globals: {
            ...globals("travel", travel.title, t("travel.protectedDesc")),
            og: { type: "article", publishedTime: travel.date },
          },
          trip: {
            ...meta,
            needsKatex: travel.needsKatex,
            locked: travel.locked,
          },
        };
      }
      return {
        globals: {
          ...globals("travel", travel.title, travel.description ?? t("blog.fallbackDesc")),
          og: { type: "article", publishedTime: travel.date },
        },
        trip: {
          ...meta,
          contentHtml: travel.contentHtml,
          needsKatex: travel.needsKatex,
          summary: travel.summary,
        },
      };
    }
  }

  const projectMatch = pathname.match(/^\/projects\/(.+)\/$/);
  if (projectMatch?.[1]) {
    const project = projects.find((entry) => entry.slug === projectMatch[1]);
    if (project) {
      const item = toProjectListItem(project);
      return {
        globals: globals("project", project.title, project.description ?? t("project.fallbackDesc")),
        project: { ...item, contentHtml: project.contentHtml, needsKatex: project.needsKatex },
      };
    }
  }

  return { globals: globals("not-found", "404", siteConfig.description) };
}

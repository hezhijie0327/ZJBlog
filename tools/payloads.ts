// Page payload building: each route → discriminated-union payload (including
// the title / description / OG needed by the document head). Shared by SSR,
// prerender and the static generators; the client contract (types) lives in
// src/lib/types.ts.

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
  deck?: { css: string };
}): BlogListItem {
  const item: BlogListItem = {
    slug: entry.slug,
    title: entry.title,
    date: entry.date,
    category: entry.category,
    tags: entry.tags,
    readingMinutes: entry.readingMinutes,
  };
  if (entry.deck) {
    item.deck = true;
  }
  // Locked post: description / summary are content excerpts, never shipped on
  // any list; only the lock flag is set
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

/** Travel list item: a locked travel's cover/summary are content fields and
 *  never ship (pins and place/date form the public memorial layer). */
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

/** All published routes (URL form, with trailing slash; home is "/"). Shared
 *  route source for prerender and RSS/sitemap; note: generateSitemap only
 *  lists content pages — tag filter pages are duplicate-content views and are
 *  deliberately excluded from the sitemap. */
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

/** Route → payload. Unknown paths return the not-found payload (shared by
 *  the prerendered 404 page and the client fallback). */
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
      trips: travelLists,
    };
  }
  if (pathname === "/blogs/") {
    return { globals: globals("blogs", t("page.blogs.title"), siteConfig.description), blogs: blogLists };
  }
  if (pathname === "/travels/") {
    return {
      globals: globals("travels", t("page.travels.title"), siteConfig.description),
      trips: travelLists,
      // The map SVG (with city detail layers) is stored once in the DOM:
      // slimForClient strips it from page-data; with no trips the basemap is
      // not baked (the empty-state page carries no weight)
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
      // On the list item, locked is a boolean flag; on the post payload,
      // locked is the ciphertext envelope — same name, different meaning.
      // Strip the flag first, then assemble per branch
      const { locked: _lockFlag, deck: _deckFlag, ...meta } = item;
      // blogs is sorted by date descending: i-1 is newer (next post), i+1 is
      // older (previous post)
      const newer = index > 0 ? blogs[index - 1] : undefined;
      const older = index >= 0 && index < blogs.length - 1 ? blogs[index + 1] : undefined;
      // Locked post: the TOC structure is content too (encrypted with the
      // body); the meta description uses fallback copy, exposing only
      // title/date/category/tags-level metadata on par with list pages
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
          // Full deck: css travels with the payload (head does not swap on SPA
          // navigation), HTML goes through the DOM contract
          ...(post.deck ? { deck: post.deck } : {}),
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
      // On the list item, locked is a boolean flag; on the detail payload,
      // locked is the ciphertext envelope
      const { locked: _lockFlag, ...meta } = item;
      // Locked travel: story and photos are inside the envelope; the meta
      // description uses fallback copy (pins/place/date form the public
      // memorial layer, already preserved on the list item)
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

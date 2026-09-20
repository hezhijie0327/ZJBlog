// 次级页面按需加载：入口 bundle 保持精简，只有真正访问到时才取块。
// 首页（IndexPage）与 404 保持急加载。

import { lazy } from "react";

export const BlogsPage = lazy(() => import("@/pages/BlogsPage.tsx").then((m) => ({ default: m.BlogsPage })));

export const BlogPostPage = lazy(() => import("@/pages/BlogPostPage.tsx").then((m) => ({ default: m.BlogPostPage })));

export const ProjectsPage = lazy(() => import("@/pages/ProjectsPage.tsx").then((m) => ({ default: m.ProjectsPage })));

export const ProjectPage = lazy(() => import("@/pages/ProjectPage.tsx").then((m) => ({ default: m.ProjectPage })));

export const ArchivesPage = lazy(() => import("@/pages/ArchivesPage.tsx").then((m) => ({ default: m.ArchivesPage })));

export const DonationPage = lazy(() => import("@/pages/DonationPage.tsx").then((m) => ({ default: m.DonationPage })));

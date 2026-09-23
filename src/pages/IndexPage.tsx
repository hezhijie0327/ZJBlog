// 首页：Hero + 精选项目（starred 优先）+ 最新文章 + 联系（GitHub / RSS）。

import { ArrowDown, ArrowRight, ArrowUpRight, Rss } from "lucide-react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { GithubIcon } from "@/components/icons.tsx";
import { ProjectCard } from "@/components/ProjectCard.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { StoryBar } from "@/components/StoryBar.tsx";
import { ViewAllLink } from "@/components/ViewAllLink.tsx";
import { featuredProjectCount, moreProjectsCount, siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { CHIP, DIVIDE_LIST, LIST_ROW, PAPER_STRIP, SECTION } from "@/lib/styles.ts";
import type { HomeData } from "@/lib/types.ts";

export function IndexPage({ data }: { data: HomeData }) {
  const t = useT();
  // 精选：作者标记 starred 的项目优先（按日期已倒序），不足再由最新个人项目补齐
  const ordered = [...data.projects].sort((a, b) => Number(b.type === "starred") - Number(a.type === "starred"));
  const featured = ordered.slice(0, featuredProjectCount);
  const moreProjects = ordered.slice(featuredProjectCount, featuredProjectCount + moreProjectsCount);
  const latestBlogs = data.blogs.slice(0, 3);

  return (
    <div className="min-h-full">
      {/* Hero：首屏占满整个视口（对标 justin3go），内容垂直居中；扣除 sticky 导航高度（h-14），
          否则区块底缘会超出折叠线 */}
      <section className="container relative mx-auto flex min-h-[calc(100svh-3.5rem)] items-center px-4 pb-16 pt-20 sm:pb-20 sm:pt-24">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-14 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <p className="animate-fade-up mb-6 flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ink-3">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-strong" />
              {t("hero.kicker")}
            </p>
            <h1 className="animate-fade-up font-serif text-4xl font-black leading-tight tracking-tight text-ink [animation-delay:60ms] sm:text-6xl">
              {t("hero.headline")}
              <span className="relative inline-block whitespace-nowrap px-1 align-baseline">
                {/* 马克笔高亮：撕边纸条微歪斜，只扫过后半句下半截（纯装饰） */}
                <span
                  aria-hidden="true"
                  className="marker-strip pointer-events-none absolute -inset-x-1.5 bottom-[0.1em] top-[0.45em] bg-accent-soft"
                />
                <span className="relative">{t("hero.headlineAccent")}</span>
              </span>
            </h1>
            <p className="animate-fade-up mt-6 border-l-2 border-accent-strong pl-4 font-serif text-sm italic leading-relaxed text-ink-2 [animation-delay:120ms] sm:text-base">
              {t("hero.motto")}
            </p>
            <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-3 [animation-delay:180ms]">
              {/* 撕边纸条入口（对标 justin3go 首屏）：金黄纸条 + 纸面次条，交错歪斜 */}
              <Link
                className={cn(
                  PAPER_STRIP,
                  "-rotate-1 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
                )}
                href="/projects/"
              >
                {t("home.cta.projects")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link className={cn(PAPER_STRIP, "rotate-1 [--strip:var(--surface)] hover:text-accent")} href="/blogs/">
                {t("home.cta.blogs")}
              </Link>
            </div>
            {/* 手绘箭头（纯装饰） */}
            <svg
              aria-hidden="true"
              className="animate-fade-up mt-6 ml-24 w-28 -rotate-3 text-accent-strong [animation-delay:240ms]"
              fill="none"
              viewBox="0 0 120 40"
            >
              <path d="M4 8C40 34 78 34 112 16" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
              <path
                d="M100 9l14 6-10 12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          {/* 纸片拼贴（纯装饰）：撕边便签 + 胶带 + 头像 + 姓名便签。
              全端可见；max-w-full 防窄屏横向溢出 */}
          <div aria-hidden="true" className="relative shrink-0 select-none">
            <div className="absolute -top-9 right-3 rotate-[7deg] rounded-sm border border-line bg-bg px-4 py-2.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-ink-3 shadow-card">
              {t("site.author")} · {t("hero.noteBirthday")}
              <br />
              {t("hero.noteTagline")}
            </div>
            {/* 胶带放在 .paper-note 外层：撕边 clip-path 会裁掉子元素，
                贴纸悬在纸外的角会被剪没；旋转由外层统一承载 */}
            <div className="relative mt-4 w-[340px] max-w-full rotate-2">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-3 left-9 z-10 h-6 w-24 -rotate-6 bg-accent-soft/80"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-2 right-8 z-10 h-6 w-20 rotate-[5deg] bg-accent-soft/60"
              />
              <div className="paper-note p-10">
                <img
                  alt=""
                  className="mx-auto size-44 rounded-full object-cover ring-1 ring-line"
                  fetchPriority="high"
                  height={176}
                  loading="eager"
                  src="/avatar.jpg"
                  width={176}
                />
                <p className="mt-7 text-center font-serif text-2xl italic text-ink-2">{t("hero.noteHello")}</p>
              </div>
            </div>
          </div>
        </div>
        {/* 底部滚动提示（对标 justin3go「向下滚动，故事继续」）：纯装饰，锚点跳转交给分镜条 */}
        <p className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.2em] text-ink-3">
          {t("hero.scrollHint")}
          <ArrowDown aria-hidden="true" className="size-3.5 animate-hint-bob" />
        </p>
      </section>

      {/* 故事分镜条：文档流内 sticky，滚过 Hero 后吸附在顶栏下方 */}
      <StoryBar
        sections={[
          { id: "featured", no: "01", label: t("home.featured.title") },
          { id: "posts", no: "02", label: t("home.recent.title") },
          { id: "contact", no: "03", label: t("home.contact.title") },
        ]}
      />

      {/* 01 精选项目 */}
      <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="featured">
        <SectionHeading
          en={t("home.featured.en")}
          hint={t("count.projects", { n: data.projects.length })}
          index="01"
          title={t("home.featured.title")}
        />
        {data.projects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {featured.map((project, i) => (
                <ProjectCard heading="h3" index={i} key={project.slug} project={project} />
              ))}
            </div>

            {moreProjects.length > 0 && (
              <div className="mt-8">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">
                  {t("home.moreProjects")}
                </p>
                {/* 开放列表（对标参考站更多项目）：短横标记 + 下划线品名 + 金色 ↗ + 行内描述 */}
                <ul>
                  {moreProjects.map((project) => (
                    <li key={project.slug}>
                      <Link className="group flex items-baseline gap-3 py-3.5" href={`/projects/${project.slug}/`}>
                        <span
                          aria-hidden="true"
                          className="shrink-0 font-mono text-xs text-ink-3 transition-colors group-hover:text-accent"
                        >
                          —
                        </span>
                        <span className="shrink-0 text-sm font-medium text-ink underline decoration-line underline-offset-4 transition-colors group-hover:text-accent group-hover:decoration-accent">
                          {project.title}
                          <ArrowUpRight
                            aria-hidden="true"
                            className="ml-0.5 inline size-3.5 align-[-0.1em] text-accent"
                          />
                        </span>
                        {project.description && (
                          <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{project.description}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ViewAllLink href="/projects/" label={t("home.viewAllProjects")} />
          </>
        ) : (
          <EmptyState className="mx-auto max-w-md" desc={t("projects.empty.desc")} title={t("projects.empty.title")} />
        )}
      </section>

      {/* 02 最新博客 */}
      <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="posts">
        <SectionHeading
          en={t("home.recent.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          index="02"
          title={t("home.recent.title")}
        />
        {/* 纸面微倾斜 + 两角胶带压住纸边（胶带在 .paper-note 外层，避免被撕边裁剪） */}
        <div className="relative -rotate-[0.35deg]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 left-12 z-10 h-6 w-24 -rotate-6 bg-accent-soft/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 right-14 z-10 h-6 w-20 rotate-[5deg] bg-accent-soft/60"
          />
          <div className={cn("paper-note", DIVIDE_LIST)}>
            {latestBlogs.length > 0 ? (
              latestBlogs.map((blog) => (
                <Link className={LIST_ROW} href={`/blogs/${blog.slug}/`} key={blog.slug}>
                  {blog.date && (
                    <time className="shrink-0 font-mono text-xs text-ink-3 sm:text-sm" dateTime={blog.date}>
                      {formatDateISO(blog.date)}
                    </time>
                  )}
                  <span className="min-w-0 flex-1 truncate font-serif text-base font-medium text-ink transition-colors group-hover:text-accent sm:text-lg">
                    {blog.title}
                  </span>
                  {blog.category && <span className={cn(CHIP, "hidden shrink-0 sm:inline-flex")}>{blog.category}</span>}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent"
                  />
                </Link>
              ))
            ) : (
              <p className="px-6 py-8 text-center text-sm text-ink-3">{t("home.emptyPosts")}</p>
            )}
          </div>
        </div>
        {data.blogs.length > 0 && <ViewAllLink href="/blogs/" label={t("home.viewAllPosts")} />}
      </section>

      {/* 03 联系：GitHub / RSS（参考 justin3go SAY HELLO 的胶囊链接形态） */}
      <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="contact">
        <SectionHeading en={t("home.contact.en")} index="03" title={t("home.contact.title")} />
        {/* 纸面便签承载联系入口（标题靠左，便签在剩余空间垂直居中）：轻微反向外倾 + 两角胶带 */}
        <div className="relative mx-auto max-w-2xl rotate-[0.4deg]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 left-10 z-10 h-6 w-24 -rotate-3 bg-accent-soft/80"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 right-10 z-10 h-6 w-20 rotate-[4deg] bg-accent-soft/60"
          />
          <div className="paper-note px-6 py-8 sm:px-10 sm:py-10">
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-ink-2 sm:text-[15px]">
              {t("home.contact.desc")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {/* 纸条外链：金色主纸条 + 纸面次条，与 Hero 按钮同一对 */}
              <a
                className={cn(
                  PAPER_STRIP,
                  "-rotate-1 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
                )}
                href={siteConfig.social.github}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GithubIcon aria-hidden="true" className="size-4" />
                GitHub
                <ArrowUpRight aria-hidden="true" className="size-3.5 text-accent-contrast/70" />
              </a>
              <a className={cn(PAPER_STRIP, "rotate-1 [--strip:var(--surface)] hover:text-accent")} href="/rss.xml">
                <Rss aria-hidden="true" className="size-4" />
                {t("nav.rss")}
                <ArrowUpRight aria-hidden="true" className="size-3.5 text-ink-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

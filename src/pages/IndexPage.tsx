// 首页：Hero + 精选项目（starred 优先）+ 最新文章 + 联系（GitHub / RSS）。

import { ArrowRight, ArrowUpRight, Rss } from "lucide-react";
import { GithubIcon } from "@/components/icons.tsx";
import { ProjectCard } from "@/components/ProjectCard.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { StoryBar } from "@/components/StoryBar.tsx";
import { ViewAllLink } from "@/components/ViewAllLink.tsx";
import { featuredProjectCount, siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { BTN_OUTLINE, BTN_PRIMARY, CHIP, LIST_CONTAINER, LIST_ROW, SECTION } from "@/lib/styles.ts";
import type { HomeData } from "@/lib/types.ts";

export function IndexPage({ data }: { data: HomeData }) {
  const t = useT();
  // 精选：作者标记 starred 的项目优先（按日期已倒序），不足再由最新个人项目补齐
  const ordered = [...data.projects].sort((a, b) => Number(b.type === "starred") - Number(a.type === "starred"));
  const featured = ordered.slice(0, featuredProjectCount);
  const moreProjects = ordered.slice(featuredProjectCount);
  const latestBlogs = data.blogs.slice(0, 3);

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="container mx-auto px-4 pb-16 pt-20 sm:pb-24 sm:pt-32">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <p className="animate-fade-up mb-6 flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ink-3">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-strong" />
              {t("hero.kicker")}
            </p>
            <h1 className="animate-fade-up font-serif text-4xl font-black leading-tight tracking-tight text-ink [animation-delay:60ms] sm:text-6xl">
              {t("hero.greeting")}
              <span className="relative inline-block whitespace-nowrap px-1 align-baseline">
                {/* 马克笔高亮：只扫过名字下半截（纯装饰） */}
                <span aria-hidden="true" className="absolute -inset-x-1 bottom-[0.1em] top-[0.45em] bg-accent-soft" />
                <span className="relative">{t("site.author")}</span>
              </span>
            </h1>
            <p className="animate-fade-up mt-6 border-l-2 border-accent-strong pl-4 font-serif text-sm italic leading-relaxed text-ink-2 [animation-delay:120ms] sm:text-base">
              {t("hero.motto")}
            </p>
            <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-3 [animation-delay:180ms]">
              <Link className={BTN_PRIMARY} href="/projects/">
                {t("home.cta.projects")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link className={BTN_OUTLINE} href="/blogs/">
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

          {/* 纸片拼贴（纯装饰，lg+ 屏显示）：撕边便签 + 胶带 + 头像 + 姓名便签 */}
          <div aria-hidden="true" className="relative hidden shrink-0 select-none lg:block">
            <div className="absolute -top-9 right-3 rotate-[7deg] rounded-sm border border-line bg-bg px-4 py-2.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-ink-3 shadow-card">
              Zhijie He
              <br />
              Work / Life / Notes
            </div>
            <div className="paper-note relative mt-4 w-[340px] rotate-2 p-10">
              <span className="absolute -top-3 left-9 h-6 w-24 -rotate-6 bg-accent-soft/80" />
              <span className="absolute -top-2 right-8 h-6 w-20 rotate-[5deg] bg-accent-soft/60" />
              <img
                alt=""
                className="mx-auto size-44 rounded-full object-cover ring-1 ring-line"
                height={176}
                loading="eager"
                src="/avatar.jpg"
                width={176}
              />
              <p className="mt-7 text-center font-serif text-2xl italic text-ink-2">hello, world.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 01 精选项目 */}
      <section className={SECTION} id="featured">
        <SectionHeading
          en={t("home.featured.en")}
          hint={t("count.projects", { n: data.projects.length })}
          index="01"
          title={t("home.featured.title")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featured.map((project, i) => (
            <ProjectCard heading="h3" index={i} key={project.slug} project={project} />
          ))}
        </div>

        {moreProjects.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-3">{t("home.moreProjects")}</p>
            <div className={LIST_CONTAINER}>
              {moreProjects.map((project) => (
                <Link className={LIST_ROW} href={`/projects/${project.slug}/`} key={project.slug}>
                  <div className="flex min-w-0 flex-1 items-baseline gap-3">
                    <span className="font-medium text-ink transition-colors group-hover:text-accent">
                      {project.title}
                    </span>
                    {project.description && (
                      <span className="hidden truncate text-sm text-ink-3 sm:inline">{project.description}</span>
                    )}
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        <ViewAllLink href="/projects/" label={t("home.viewAllProjects")} />
      </section>

      {/* 02 最新博客 */}
      <section className={SECTION} id="posts">
        <SectionHeading
          en={t("home.recent.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          index="02"
          title={t("home.recent.title")}
        />
        <div className={LIST_CONTAINER}>
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
        <ViewAllLink href="/blogs/" label={t("home.viewAllPosts")} />
      </section>

      {/* 03 联系：GitHub / RSS（参考 justin3go SAY HELLO 的胶囊链接形态） */}
      <section className={SECTION} id="contact">
        <SectionHeading en={t("home.contact.en")} index="03" title={t("home.contact.title")} />
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-[15px]">{t("home.contact.desc")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <a className={BTN_OUTLINE} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
            <GithubIcon aria-hidden="true" className="size-4" />
            GitHub
            <ArrowUpRight aria-hidden="true" className="size-3.5 text-ink-3" />
          </a>
          <a className={BTN_OUTLINE} href="/rss.xml">
            <Rss aria-hidden="true" className="size-4" />
            {t("nav.rss")}
            <ArrowUpRight aria-hidden="true" className="size-3.5 text-ink-3" />
          </a>
        </div>
      </section>

      {/* 故事分镜条（lg+ 底部锚点导航，滚动高亮当前区块） */}
      <StoryBar
        sections={[
          { id: "featured", no: "01", label: t("home.featured.title") },
          { id: "posts", no: "02", label: t("home.recent.title") },
          { id: "contact", no: "03", label: t("home.contact.title") },
        ]}
      />
    </div>
  );
}

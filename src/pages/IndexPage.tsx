// 首页：Hero + 精选项目 + 个人经历 + 最新文章 + 联系。

import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { featuredProjectCount, siteConfig, timeline } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { hostOf } from "@/lib/link.ts";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, CARD_HOVER, LIST_CONTAINER, SECTION } from "@/lib/styles.ts";
import type { HomeData } from "@/lib/types.ts";

export function IndexPage({ data }: { data: HomeData }) {
  const t = useT();
  const personalProjects = data.projects.filter((p) => p.type === "personal");
  const featured = personalProjects.slice(0, featuredProjectCount);
  const moreProjects = personalProjects.slice(featuredProjectCount);
  const latestBlogs = data.blogs.slice(0, 3);

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="container mx-auto px-4 pb-16 pt-20 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-3xl">
          <p className="animate-fade-up mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-3">
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-strong" />
            Technology · Engineering · Notes
          </p>
          <h1 className="animate-fade-up font-serif text-4xl font-black leading-tight tracking-tight text-ink [animation-delay:60ms] sm:text-6xl">
            {siteConfig.hero.greeting}
            {siteConfig.author}
          </h1>
          <p className="animate-fade-up mt-4 text-base text-ink-2 [animation-delay:120ms] sm:text-lg">
            {siteConfig.hero.role} — {siteConfig.hero.tagline}
          </p>
          <p className="animate-fade-up mt-8 border-l-2 border-accent-strong pl-4 font-serif text-sm italic leading-relaxed text-ink-2 [animation-delay:180ms] sm:text-base">
            {siteConfig.hero.mottoEn}
            <br />
            {siteConfig.hero.mottoZh}
          </p>
          <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
            <Link className={BTN_PRIMARY} href="/projects/">
              {t("home.cta.projects")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link className={BTN_OUTLINE} href="/blogs/">
              {t("home.cta.blogs")}
            </Link>
          </div>
        </div>
      </section>

      {/* 01 精选项目 */}
      <section className={SECTION}>
        <SectionHeading
          en={t("home.featured.en")}
          hint={t("count.projects", { n: personalProjects.length })}
          index="01"
          title={t("home.featured.title")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featured.map((project, i) => (
            <Link
              className={cn(CARD_HOVER, "group relative flex flex-col p-6")}
              href={`/projects/${project.slug}/`}
              key={project.slug}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-sm text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 text-ink-3 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                {project.title}
              </h3>
              {project.description && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">{project.description}</p>
              )}
              {hostOf(project.link) && <p className="mt-4 font-mono text-xs text-ink-3">{hostOf(project.link)}</p>}
            </Link>
          ))}
        </div>

        {moreProjects.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{t("home.moreProjects")}</p>
            <div className={LIST_CONTAINER}>
              {moreProjects.map((project) => (
                <Link
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                  href={`/projects/${project.slug}/`}
                  key={project.slug}
                >
                  <div className="flex min-w-0 items-baseline gap-3">
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

        <div className="mt-8 text-right">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:underline"
            href="/projects/"
          >
            {t("home.viewAllProjects")}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* 02 个人经历 */}
      <section className={SECTION}>
        <SectionHeading en={t("home.journey.en")} index="02" title={t("home.journey.title")} />
        <ol className="relative ml-2 space-y-10 border-l border-line pl-8 sm:ml-6">
          {timeline.map((entry) => (
            <li className="relative" key={entry.period}>
              <span
                aria-hidden="true"
                className="absolute -left-[35px] top-1.5 grid size-2.5 place-items-center rounded-full border-2 border-accent-strong bg-bg"
              />
              <p className="font-mono text-xs tracking-wide text-ink-3">{entry.period}</p>
              <h3 className="mt-1.5 font-serif text-lg font-semibold text-ink">{entry.title}</h3>
              {entry.description && (
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-2">{entry.description}</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 03 最新博客 */}
      <section className={SECTION}>
        <SectionHeading
          en={t("home.recent.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          index="03"
          title={t("home.recent.title")}
        />
        <div className={LIST_CONTAINER}>
          {latestBlogs.length > 0 ? (
            latestBlogs.map((blog) => (
              <Link
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:gap-6 sm:px-6 sm:py-5"
                href={`/blogs/${blog.slug}/`}
                key={blog.slug}
              >
                {blog.date && (
                  <time className="shrink-0 font-mono text-xs text-ink-3 sm:text-sm" dateTime={blog.date}>
                    {formatDateISO(blog.date)}
                  </time>
                )}
                <span className="min-w-0 flex-1 truncate font-serif text-base font-medium text-ink transition-colors group-hover:text-accent sm:text-lg">
                  {blog.title}
                </span>
                {blog.category && (
                  <span className="hidden shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2 sm:inline">
                    {blog.category}
                  </span>
                )}
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
        <div className="mt-8 text-right">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-accent transition-colors hover:underline"
            href="/blogs/"
          >
            {t("home.viewAllPosts")}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* 04 联系 */}
      <section className={cn(SECTION, "pb-20 sm:pb-24")}>
        <SectionHeading en={t("home.contact.en")} index="04" title={t("home.contact.title")} />
        <div className={cn(CARD, "flex flex-col items-start gap-8 p-8 sm:p-12")}>
          <div className="flex items-center gap-4">
            <img
              alt={siteConfig.author}
              className="size-14 rounded-full object-cover ring-1 ring-line"
              height={56}
              loading="lazy"
              src="/avatar.jpg"
              width={56}
            />
            <div>
              <p className="font-serif text-xl font-semibold text-ink">{siteConfig.author}</p>
              <p className="text-sm text-ink-2">{siteConfig.hero.role}</p>
            </div>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-ink-2">{t("home.contactBlurb")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a className={BTN_PRIMARY} href={siteConfig.social.email}>
              <Mail aria-hidden="true" className="size-4" />
              {t("home.sendEmail")}
            </a>
            <a className={BTN_OUTLINE} href={siteConfig.social.github} rel="noopener noreferrer" target="_blank">
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

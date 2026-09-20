import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import SectionHeading from "@/components/SectionHeading";
import { siteConfig, timeline, featuredProjectCount } from "@/config/site";
import { formatDateISO } from "@/lib/utils";

interface Project {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  type: "personal" | "starred";
  tags?: string[];
  image?: string;
  link?: string;
}

interface Blog {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  category?: string;
  tags?: string[];
}

interface HomePageProps {
  projects: Project[];
  blogs: Blog[];
}

function hostOf(link?: string) {
  if (!link) return undefined;
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export default function HomePage({ projects, blogs }: HomePageProps) {
  const personalProjects = projects.filter((p) => p.type === "personal");
  const featured = personalProjects.slice(0, featuredProjectCount);
  const moreProjects = personalProjects.slice(featuredProjectCount);
  const latestBlogs = blogs.slice(0, 3);

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="mx-auto max-w-3xl">
          <p className="animate-fade-up mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-3">
            <span className="inline-block size-1.5 rounded-full bg-accent-strong" />
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
            <Link
              href="/projects"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent-strong px-6 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop"
            >
              查看项目
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/blogs"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-6 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              阅读博客
            </Link>
          </div>
        </div>
      </section>

      {/* 01 精选项目 */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <SectionHeading
          index="01"
          title="精选项目"
          en="Selected Work"
          hint={`共 ${personalProjects.length} 个`}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {featured.map((project, i) => (
            <Link
              key={project.slug}
              href={`/projects/${project.slug}/`}
              className="group relative flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-sm text-ink-3">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight className="size-4 text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-text" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink transition-colors group-hover:text-accent-text">
                {project.title}
              </h3>
              {project.description && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">
                  {project.description}
                </p>
              )}
              {hostOf(project.link) && (
                <p className="mt-4 font-mono text-xs text-ink-3">
                  {hostOf(project.link)}
                </p>
              )}
            </Link>
          ))}
        </div>

        {moreProjects.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">
              More Projects · 更多项目
            </p>
            <div className="divide-y divide-line/70 rounded-2xl border border-line bg-surface">
              {moreProjects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}/`}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="font-medium text-ink transition-colors group-hover:text-accent-text">
                      {project.title}
                    </span>
                    {project.description && (
                      <span className="hidden truncate text-sm text-ink-3 sm:inline">
                        {project.description}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent-text" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-right">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-colors hover:underline"
          >
            查看全部项目
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* 02 个人经历 */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <SectionHeading
          index="02"
          title="个人经历"
          en="The Journey"
        />
        <ol className="relative ml-2 space-y-10 border-l border-line pl-8 sm:ml-6">
          {timeline.map((entry) => (
            <li key={entry.period} className="relative">
              <span className="absolute -left-[35px] top-1.5 grid size-2.5 place-items-center rounded-full border-2 border-accent-strong bg-background sm:-left-[35px]" />
              <p className="font-mono text-xs tracking-wide text-ink-3">
                {entry.period}
              </p>
              <h3 className="mt-1.5 font-serif text-lg font-semibold text-ink">
                {entry.title}
              </h3>
              {entry.description && (
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-2">
                  {entry.description}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 03 最新博客 */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <SectionHeading
          index="03"
          title="最新思考"
          en="Recent Posts"
          hint={`共 ${blogs.length} 篇`}
        />
        <div className="divide-y divide-line/70 rounded-2xl border border-line bg-surface">
          {latestBlogs.length > 0 ? (
            latestBlogs.map((blog) => (
              <Link
                key={blog.slug}
                href={`/blogs/${blog.slug}/`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:gap-6 sm:px-6 sm:py-5"
              >
                {blog.date && (
                  <time
                    dateTime={blog.date}
                    className="shrink-0 font-mono text-xs text-ink-3 sm:text-sm"
                  >
                    {formatDateISO(blog.date)}
                  </time>
                )}
                <span className="min-w-0 flex-1 truncate font-serif text-base font-medium text-ink transition-colors group-hover:text-accent-text sm:text-lg">
                  {blog.title}
                </span>
                {blog.category && (
                  <span className="hidden shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2 sm:inline">
                    {blog.category}
                  </span>
                )}
                <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent-text" />
              </Link>
            ))
          ) : (
            <p className="px-6 py-8 text-center text-sm text-ink-3">
              还没有文章，敬请期待。
            </p>
          )}
        </div>
        <div className="mt-8 text-right">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 text-sm text-accent-text transition-colors hover:underline"
          >
            查看全部文章
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* 04 联系 */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <SectionHeading index="04" title="保持联系" en="Say Hello" />
        <div className="flex flex-col items-start gap-8 rounded-2xl border border-line bg-surface p-8 shadow-card sm:p-12">
          <div className="flex items-center gap-4">
            <Image
              src="/avatar.jpg"
              alt={siteConfig.author}
              width={56}
              height={56}
              className="size-14 rounded-full object-cover ring-1 ring-line"
            />
            <div>
              <p className="font-serif text-xl font-semibold text-ink">
                {siteConfig.author}
              </p>
              <p className="text-sm text-ink-2">{siteConfig.hero.role}</p>
            </div>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-ink-2">
            对文章或项目有想法？欢迎邮件交流，或在 GitHub 上提出 Issue
            与讨论。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={siteConfig.social.email}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop"
            >
              <Mail className="size-4" />
              发送邮件
            </a>
            <a
              href={siteConfig.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// Home page: Hero + featured projects + latest posts + travel footprint + archives + say hello
// (GitHub / RSS / support). Section order matches the top navigation:
// projects / blogs / travels / archives / support.

import { ArrowDown, ArrowRight, ArrowUpRight, Coffee, Lock, Presentation, Rss } from "lucide-react";
import { EmptyState } from "@/components/EmptyState.tsx";
import { GithubIcon } from "@/components/icons.tsx";
import { ProjectCard } from "@/components/ProjectCard.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { Link } from "@/components/Shell.tsx";
import { StoryBar } from "@/components/StoryBar.tsx";
import { Tape } from "@/components/Tape.tsx";
import { ViewAllLink } from "@/components/ViewAllLink.tsx";
import { featuredProjectCount, moreProjectsCount, siteConfig } from "@/config/site.ts";
import { cn } from "@/lib/cn.ts";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { jumpToSection } from "@/lib/scroll.ts";
import { CHIP, DIVIDE_LIST, EYEBROW, LIST_ROW, PAPER_STRIP, SECTION } from "@/lib/styles.ts";
import type { HomeData } from "@/lib/types.ts";
import { useInView } from "@/lib/useInView.ts";

export function IndexPage({ data }: { data: HomeData }) {
  const t = useT();
  // Featured: projects the author marked starred come first (already date-descending); the
  // newest personal projects fill the remainder
  const ordered = [...data.projects].sort((a, b) => Number(b.type === "starred") - Number(a.type === "starred"));
  const featured = ordered.slice(0, featuredProjectCount);
  const moreProjects = ordered.slice(featuredProjectCount, featuredProjectCount + moreProjectsCount);
  const latestBlogs = data.blogs.slice(0, 3);
  const latestTrips = data.trips.slice(0, 3);
  // Archives teaser: aggregate all posts by year (the home payload already carries the full
  // list) and take the latest 4 years
  const yearCounts = new Map<string, number>();
  for (const blog of data.blogs) {
    if (!blog.date) {
      continue;
    }
    const year = formatDateISO(blog.date).slice(0, 4);
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  }
  const years = [...yearCounts.entries()].sort(([a], [b]) => Number(b) - Number(a)).slice(0, 4);
  // The scroll-hint loop animation only runs while the Hero is visible (stops offscreen,
  // same discipline as the STL spin)
  const { ref: heroRef, inView: heroInView } = useInView<HTMLElement>({ rootMargin: "0px" });

  return (
    <div className="min-h-full">
      {/* Hero: fills the whole viewport above the fold (modeled on justin3go), content vertically
          centered; subtract the sticky nav height (h-14) or the section's bottom edge overflows
          the fold. Mobile uses a tightened composition to bring Scroll down back onto the fold
          (§9 prescription): decorative arrow/name note exit, paper collage shrinks, vertical
          rhythm steps down — desktop values restore from sm: */}
      <section
        className="container relative mx-auto flex min-h-[calc(100svh-3.5rem)] items-center px-4 pb-14 pt-12 sm:pb-20 sm:pt-24"
        ref={heroRef}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 sm:gap-14 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-3xl">
            <p className="animate-fade-up mb-4 flex items-center gap-2 font-mono text-xs tracking-[0.24em] text-ink-3 sm:mb-6">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent-strong" />
              {t("hero.kicker")}
            </p>
            <h1 className="animate-fade-up font-serif text-4xl font-black leading-tight tracking-tight text-ink [animation-delay:60ms] sm:text-6xl">
              {t("hero.headline")}
              <span className="relative inline-block whitespace-nowrap px-1 align-baseline">
                {/* Marker highlight: a slightly tilted torn-edge strip sweeping only the lower
                    half of the second phrase (purely decorative) */}
                <span
                  aria-hidden="true"
                  className="marker-strip pointer-events-none absolute -inset-x-1.5 bottom-[0.1em] top-[0.45em] bg-accent-soft"
                />
                <span className="relative">{t("hero.headlineAccent")}</span>
              </span>
            </h1>
            <p className="animate-fade-up mt-5 border-l-2 border-accent-strong pl-4 font-serif text-sm italic leading-relaxed text-ink-2 [animation-delay:120ms] sm:mt-6 sm:text-base">
              {t("hero.motto")}
            </p>
            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3 [animation-delay:180ms] sm:mt-10">
              {/* Torn-edge strip entry: gold primary strip + paper secondary strip, alternating
                  tilts; anchors scroll to this page's sections */}
              {/* biome-ignore lint/a11y/useValidAnchor: in-page section navigation, keep the hash
                  deep link, scrolling handled by jumpToSection */}
              <a
                className={cn(
                  PAPER_STRIP,
                  "-rotate-1 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]",
                )}
                href="#projects"
                onClick={(event) => {
                  jumpToSection(event, "projects");
                }}
              >
                {t("home.cta.projects")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              {/* biome-ignore lint/a11y/useValidAnchor: same as above, in-page section navigation */}
              <a
                className={cn(PAPER_STRIP, "rotate-1 [--strip:var(--surface)] hover:text-accent")}
                href="#blogs"
                onClick={(event) => {
                  jumpToSection(event, "blogs");
                }}
              >
                {t("home.cta.blogs")}
              </a>
            </div>
            {/* Hand-drawn arrow (purely decorative): exits on mobile — above-the-fold budget
                goes to the collage and the scroll hint */}
            <svg
              aria-hidden="true"
              className="animate-fade-up mt-6 ml-24 hidden w-28 -rotate-3 text-accent-strong [animation-delay:240ms] sm:block"
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

          {/* Paper collage (purely decorative): torn-edge note + tape + avatar + name note.
              Visible on all form factors; max-w-full guards against horizontal overflow on
              narrow screens. Mobile shrinks it (w-280 / avatar 128 / p-6); the name note exits */}
          <div aria-hidden="true" className="relative shrink-0 select-none">
            <div className="absolute -top-9 right-3 hidden rotate-[7deg] rounded-sm border border-line bg-bg px-4 py-2.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-ink-3 shadow-card sm:block">
              {t("site.author")} · {t("hero.noteBirthday")}
              <br />
              {t("hero.noteTagline")}
            </div>
            {/* Tape sits outside .paper-note: the torn-edge clip-path clips its children, so
                corners of tape hovering off the paper would be cut away; rotation is carried
                uniformly by the outer layer. Single top-left corner press — the top-right is
                occupied by the small name note, and overlapped corners get no tape (§7
                composition tiers) */}
            <div className="relative mt-4 w-[280px] max-w-full rotate-2 sm:w-[340px]">
              <Tape className="w-24 bg-accent-soft/80" corner="start" seed="home-note-1-a" />
              <div className="paper-note p-6 sm:p-10">
                <img
                  alt=""
                  className="mx-auto size-32 rounded-full object-cover ring-1 ring-line sm:size-44"
                  fetchPriority="high"
                  height={176}
                  loading="eager"
                  src="/avatar.jpg"
                  width={176}
                />
                <p className="mt-4 text-center font-serif text-xl italic text-ink-2 sm:mt-7 sm:text-2xl">
                  {t("hero.noteHello")}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom scroll hint (modeled on justin3go's "scroll down"): purely decorative, anchor
            jumps are delegated to the story bar */}
        <p className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2 font-mono text-xs tracking-[0.2em] text-ink-3">
          {t("hero.scrollHint")}
          <ArrowDown aria-hidden="true" className={cn("size-3.5", heroInView && "animate-hint-bob")} />
        </p>
      </section>

      {/* Story bar: sticky within the document flow, docks below the app bar once the Hero
          scrolls past */}
      <StoryBar
        sections={[
          { id: "projects", no: "01", label: t("home.featured.title") },
          { id: "blogs", no: "02", label: t("home.recent.title") },
          { id: "travels", no: "03", label: t("home.travels.title") },
          { id: "archives", no: "04", label: t("home.archives.title") },
          { id: "contact", no: "05", label: t("home.contact.title") },
        ]}
      />

      {/* 01 Featured projects */}
      <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="projects">
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
                <p className={cn(EYEBROW, "mb-3")}>{t("home.moreProjects")}</p>
                {/* Open list (modeled on the reference site's more-projects): dash marker +
                    underlined name + gold ↗ + inline description */}
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

      {/* 02 Latest posts */}
      <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="blogs">
        <SectionHeading
          en={t("home.recent.en")}
          hint={t("count.posts", { n: data.blogs.length })}
          index="02"
          title={t("home.recent.title")}
        />
        {/* Slight paper tilt + a single top-center tape on the full-width sheet (§7 composition
            tiers: narrow tapes on both corners throw off the proportions; tape stays outside
            .paper-note to avoid the torn-edge clipping) */}
        <div className="relative -rotate-[0.35deg]">
          <Tape className="w-32 bg-accent-soft/80" corner="center" seed="home-note-2" />
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
                  {blog.locked && (
                    <>
                      <span className="sr-only">({t("post.locked")})</span>
                      <Lock aria-hidden="true" className="size-3.5 shrink-0 text-accent-strong" />
                    </>
                  )}
                  {blog.deck && (
                    <>
                      <span className="sr-only">({t("blog.deck")})</span>
                      <Presentation aria-hidden="true" className="size-3.5 shrink-0 text-accent-strong" />
                    </>
                  )}
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

      {/* 03 Travel footprint: paper list of the latest 3 trips (the cover wall is left to
          /travels/, home stays light) */}
      {latestTrips.length > 0 && (
        <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="travels">
          <SectionHeading
            en={t("home.travels.en")}
            hint={t("count.travels", { n: data.trips.length })}
            index="03"
            title={t("home.travels.title")}
          />
          <div className="relative rotate-[0.35deg]">
            <Tape className="w-32 bg-accent-soft/80" corner="center" seed="home-note-3" />
            <div className={cn("paper-note", DIVIDE_LIST)}>
              {latestTrips.map((trip) => (
                <Link className={LIST_ROW} href={`/travels/${trip.slug}/`} key={trip.slug}>
                  {trip.date && (
                    <time className="shrink-0 font-mono text-xs text-ink-3 sm:text-sm" dateTime={trip.date}>
                      {formatDateISO(trip.date)}
                      {trip.endDate && <span className="hidden sm:inline"> – {formatDateISO(trip.endDate)}</span>}
                    </time>
                  )}
                  <span className="min-w-0 flex-1 truncate font-serif text-base font-medium text-ink transition-colors group-hover:text-accent sm:text-lg">
                    {trip.title}
                  </span>
                  {trip.locked && (
                    <>
                      <span className="sr-only">({t("post.locked")})</span>
                      <Lock aria-hidden="true" className="size-3.5 shrink-0 text-accent-strong" />
                    </>
                  )}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
          <ViewAllLink href="/travels/" label={t("home.viewAllTravels")} />
        </section>
      )}

      {/* 04 Archives: year index of posts for the latest 4 years (the full timeline is left
          to /archives/) */}
      {years.length > 0 && (
        <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="archives">
          <SectionHeading
            en={t("home.archives.en")}
            hint={t("count.posts", { n: data.blogs.length })}
            index="04"
            title={t("home.archives.title")}
          />
          <div className="relative -rotate-[0.35deg]">
            <Tape className="w-32 bg-accent-soft/80" corner="center" seed="home-note-4" />
            <div className={cn("paper-note", DIVIDE_LIST)}>
              {years.map(([year, count]) => (
                <Link className={LIST_ROW} href="/archives/" key={year}>
                  <span className="shrink-0 font-serif text-base font-semibold text-ink transition-colors group-hover:text-accent sm:text-lg">
                    {year}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-ink-3">
                    {t("count.nPosts", { n: count })}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-accent"
                  />
                </Link>
              ))}
            </div>
          </div>
          <ViewAllLink href="/archives/" label={t("home.viewAllArchives")} />
        </section>
      )}

      {/* 05 Say hello: GitHub / RSS / support (after the capsule-link style of justin3go's
          SAY HELLO) */}
      <section className={cn(SECTION, "paper-chapter scroll-mt-28")} id="contact">
        <SectionHeading en={t("home.contact.en")} index="05" title={t("home.contact.title")} />
        {/* Paper note carries the contact entries (heading left, note vertically centered in
            the remaining space): slight counter-tilt + tape on two corners */}
        <div className="relative mx-auto max-w-2xl rotate-[0.4deg]">
          <Tape className="w-24 bg-accent-soft/80" corner="start" seed="home-note-5-a" />
          <Tape className="w-20 bg-accent-soft/60" corner="end" seed="home-note-5-b" />
          <div className="paper-note px-6 py-8 sm:px-10 sm:py-10">
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-ink-2 sm:text-base">{t("home.contact.desc")}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {/* Strip entries: gold primary strip (GitHub) + paper secondary strips (RSS /
                  support), same language as the Hero buttons */}
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
              <a className={cn(PAPER_STRIP, "rotate-1 [--strip:var(--surface)] hover:text-accent")} href="/support/">
                <Coffee aria-hidden="true" className="size-4" />
                {t("nav.support")}
                <ArrowUpRight aria-hidden="true" className="size-3.5 text-ink-3" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

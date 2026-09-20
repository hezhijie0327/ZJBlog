// 评论区（客户端取数）：进入视口后才由浏览器直接请求 api.github.com，
// 数据实时、构建期零 GitHub 依赖。懒挂载模式与 MermaidRenderer 一致 ——
// 首屏零请求，审计加载期间也不会注入内容造成布局偏移。
// 限额/未开启 Discussions 等预期内失败静默降级为占位卡片（见 ./api.ts）。

import {
  AlertCircle,
  ExternalLink,
  GitBranch,
  MessageCircle,
  MessageSquare,
  Star,
  ThumbsUp,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, CHIP, META } from "@/lib/styles.ts";
import {
  type GitHubDiscussion,
  type GitHubIssue,
  type GitHubRepoInfo,
  getGitHubDiscussions,
  getGitHubIssues,
  getGitHubRepoInfo,
} from "./api.ts";

interface GitHubCommentsProps {
  repo?: string;
  title?: string; // 用于创建新 Discussion 的标题
}

interface CommentsData {
  repoInfo: GitHubRepoInfo | null;
  discussions: GitHubDiscussion[];
  issues: GitHubIssue[];
}

export function GitHubComments({ repo, title }: GitHubCommentsProps) {
  const t = useT();
  const containerRef = useRef<HTMLElement>(null);
  // 旧浏览器无 IntersectionObserver 时直接以可见起始，避免在 effect 里同步 setState
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  const [data, setData] = useState<CommentsData | null>(null);

  // 进入视口（含 300px 缓冲）才开始取数
  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !repo) {
      return;
    }
    let mounted = true;

    void (async () => {
      try {
        const [repoInfo, discussions, issues] = await Promise.all([
          getGitHubRepoInfo(repo),
          getGitHubDiscussions(repo, 5),
          getGitHubIssues(repo, 5, "open"),
        ]);
        if (mounted) {
          setData({ repoInfo, discussions, issues });
        }
      } catch {
        if (mounted) {
          setData({ repoInfo: null, discussions: [], issues: [] });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [visible, repo]);

  const hasDiscussions = data?.repoInfo?.hasDiscussions ?? false;
  // 数据未到位时先用通用标题，到位后按 Discussions 是否可用收窄
  const sectionTitle = !data || hasDiscussions ? t("comments.discussions") : t("comments.issues");

  return (
    <section className="mt-14 border-t border-line pt-8" ref={containerRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
          <MessageSquare aria-hidden="true" className="size-4 text-ink-3" />
          {sectionTitle}
        </h3>
        {data?.repoInfo && (
          <div className={cn(META, "flex items-center gap-4")}>
            <span className="inline-flex items-center gap-1">
              <AlertCircle aria-hidden="true" className="size-3.5" />
              {data.repoInfo.openIssuesCount}
            </span>
            {hasDiscussions && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle aria-hidden="true" className="size-3.5" />
                {data.discussions.length}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden="true" className="size-3.5" />
              {data.repoInfo.stargazersCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch aria-hidden="true" className="size-3.5" />
              {data.repoInfo.forksCount}
            </span>
          </div>
        )}
      </div>

      {!data ? (
        // 加载占位：进入视口后短暂展示，随后被真实内容替换
        <div className={cn(CARD, "px-6 py-8 text-center")}>
          <p className="text-sm text-ink-3">{t("comments.loading")}</p>
        </div>
      ) : !data.repoInfo ? (
        <div className={cn(CARD, "px-6 py-8 text-center")}>
          <p className="font-serif text-base font-semibold text-ink">
            {repo ? t("comments.unavailable") : t("comments.noRepo")}
          </p>
          <p className="mt-2 text-sm text-ink-2">{repo ? t("comments.unavailableBlurb") : t("comments.noRepoBlurb")}</p>
          {repo && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <a
                className={cn(BTN_OUTLINE, "h-9 px-4 text-[13px]")}
                href={`https://github.com/${repo}/issues`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
                {t("comments.openRepo")}
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 仓库信息 */}
          <div className={cn(CARD, "mb-6 p-5")}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <a
                  className="font-serif text-base font-semibold text-ink transition-colors hover:text-accent"
                  href={data.repoInfo.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {data.repoInfo.name}
                </a>
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                  {data.repoInfo.description || t("comments.noDescription")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {hasDiscussions && <span className={cn(CHIP, "font-mono text-[10px]")}>Discussions</span>}
                <a
                  aria-label={t("nav.github")}
                  className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  href={data.repoInfo.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Issues 列表 */}
          {data.issues.length > 0 && (
            <div className="mb-6">
              <h4 className={cn(META, "mb-3 flex items-center gap-2")}>
                <AlertCircle aria-hidden="true" className="size-3.5" />
                OPEN ISSUES · {data.issues.length}
              </h4>
              <div className="space-y-2">
                {data.issues.map((issue) => (
                  <a
                    className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
                    href={issue.url}
                    key={issue.id}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <p className="text-sm font-medium text-ink transition-colors hover:text-accent">
                      #{issue.number} {issue.title}
                    </p>
                    <div className={cn(META, "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]")}>
                      <span className="inline-flex items-center gap-1">
                        <img
                          alt={issue.author.login}
                          className="size-3.5 rounded-full"
                          height={14}
                          loading="lazy"
                          src={issue.author.avatarUrl}
                          width={14}
                        />
                        {issue.author.login}
                      </span>
                      <span>{new Date(issue.createdAt).toLocaleDateString("zh-CN")}</span>
                      {issue.comments.totalCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle aria-hidden="true" className="size-3" />
                          {issue.comments.totalCount}
                        </span>
                      )}
                      <span className={issue.state === "open" ? "text-ok" : "text-ink-3"}>
                        {issue.state === "open" ? t("comments.stateOpen") : t("comments.stateClosed")}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Discussions 列表 */}
          {data.discussions.length > 0 && (
            <div className="mb-6">
              <h4 className={cn(META, "mb-3 flex items-center gap-2")}>
                <MessageCircle aria-hidden="true" className="size-3.5" />
                DISCUSSIONS · {data.discussions.length}
              </h4>
              <div className="space-y-2">
                {data.discussions.map((discussion) => (
                  <a
                    className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
                    href={discussion.url}
                    key={discussion.id}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <p className="text-sm font-medium text-ink transition-colors hover:text-accent">
                      {discussion.title}
                    </p>
                    <div className={cn(META, "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]")}>
                      <span className="inline-flex items-center gap-1">
                        <img
                          alt={discussion.author.login}
                          className="size-3.5 rounded-full"
                          height={14}
                          loading="lazy"
                          src={discussion.author.avatarUrl}
                          width={14}
                        />
                        {discussion.author.login}
                      </span>
                      <span>{new Date(discussion.createdAt).toLocaleDateString("zh-CN")}</span>
                      {discussion.comments.totalCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle aria-hidden="true" className="size-3" />
                          {discussion.comments.totalCount}
                        </span>
                      )}
                      {discussion.upvoteCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp aria-hidden="true" className="size-3" />
                          {discussion.upvoteCount}
                        </span>
                      )}
                      <span>
                        {discussion.category.emoji} {discussion.category.name}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 参与讨论 */}
          <div className={cn(CARD, "px-6 py-8 text-center")}>
            <p className="font-serif text-base font-semibold text-ink">
              {hasDiscussions ? t("comments.welcome") : t("comments.welcomeIssues")}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {hasDiscussions ? t("comments.blurbDiscussions") : t("comments.blurbIssues")}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                className={BTN_PRIMARY}
                href={`https://github.com/${repo}/issues/new?title=${encodeURIComponent(title || "问题反馈")}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <AlertCircle aria-hidden="true" className="size-4" />
                {t("comments.submitIssue")}
              </a>
              {hasDiscussions && (
                <a
                  className={BTN_OUTLINE}
                  href={`https://github.com/${repo}/discussions/new?category=general&title=${encodeURIComponent(title || "新的讨论")}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Users aria-hidden="true" className="size-4" />
                  {t("comments.createDiscussion")}
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  MessageCircle,
  ThumbsUp,
  ExternalLink,
  Users,
  Star,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import {
  getGitHubDiscussions,
  getGitHubIssues,
  getGitHubRepoInfo,
  hasDiscussionsEnabled,
  type GitHubDiscussion,
  type GitHubIssue,
  type GitHubRepoInfo,
} from "@/lib/github";

interface GitHubCommentsProps {
  repo?: string;
  title?: string; // 用于创建新 Discussion 的标题
}

export default function GitHubComments({ repo, title }: GitHubCommentsProps) {
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null);
  const [discussions, setDiscussions] = useState<GitHubDiscussion[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasDiscussions, setHasDiscussions] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [repoData, discussionsEnabled, discussionsData, issuesData] =
          await Promise.all([
            getGitHubRepoInfo(repo),
            hasDiscussionsEnabled(repo),
            getGitHubDiscussions(repo, 5),
            getGitHubIssues(repo, 5, "open"),
          ]);

        setRepoInfo(repoData);
        setHasDiscussions(discussionsEnabled);
        setDiscussions(discussionsData);
        setIssues(issuesData);
      } catch (err) {
        console.error(`Error fetching data for repo: ${repo}:`, err);
        setError(err instanceof Error ? err.message : "获取数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [repo]);

  const sectionTitle = hasDiscussions ? "讨论与评论" : "问题与反馈";

  if (!repo) {
    return (
      <section className="mt-14 border-t border-line pt-8">
        <SectionTitle>{sectionTitle}</SectionTitle>
        <div className="rounded-2xl border border-line bg-surface px-6 py-8 text-center shadow-card">
          <p className="text-sm text-ink-2">此内容未关联 GitHub 仓库</p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="mt-14 border-t border-line pt-8">
        <SectionTitle>{sectionTitle}</SectionTitle>
        <div className="rounded-2xl border border-line bg-surface px-6 py-8 shadow-card">
          <div className="animate-pulse">
            <div className="mx-auto mb-3 h-4 w-1/4 rounded bg-surface-2" />
            <div className="mx-auto h-3 w-1/3 rounded bg-surface-2" />
          </div>
        </div>
      </section>
    );
  }

  // 即使有错误或无法获取仓库信息，仍然显示底部的参与卡片
  if (error || !repoInfo) {
    return (
      <section className="mt-14 border-t border-line pt-8">
        <SectionTitle>{sectionTitle}</SectionTitle>
        <div className="rounded-2xl border border-line bg-surface px-6 py-8 text-center shadow-card">
          <p className="font-serif text-base font-semibold text-ink">
            欢迎参与讨论
          </p>
          <p className="mt-2 text-sm text-ink-2">
            对此内容有疑问或建议？访问 GitHub 仓库参与讨论
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <a
              href={`https://github.com/${repo}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-ink transition-colors hover:bg-surface-2"
            >
              <ExternalLink className="size-3.5" />
              打开仓库
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14 border-t border-line pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>{sectionTitle}</SectionTitle>
        <div className="flex items-center gap-4 font-mono text-xs text-ink-3">
          <span className="inline-flex items-center gap-1">
            <AlertCircle className="size-3.5" />
            {repoInfo.openIssuesCount}
          </span>
          {hasDiscussions && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3.5" />
              {discussions.length}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5" />
            {repoInfo.stargazersCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitBranch className="size-3.5" />
            {repoInfo.forksCount}
          </span>
        </div>
      </div>

      {/* 仓库信息 */}
      <div className="mb-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <a
              href={repoInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-base font-semibold text-ink transition-colors hover:text-accent-text"
            >
              {repoInfo.name}
            </a>
            <p className="mt-1 line-clamp-2 text-sm text-ink-2">
              {repoInfo.description || "暂无描述"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasDiscussions && (
              <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] text-ink-2">
                Discussions
              </span>
            )}
            <a
              href={repoInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在 GitHub 打开仓库"
              className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Issues 列表 */}
      {issues.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 font-mono text-xs text-ink-3">
            <AlertCircle className="size-3.5" />
            OPEN ISSUES · {issues.length}
          </h4>
          <div className="space-y-2">
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <p className="text-sm font-medium text-ink transition-colors hover:text-accent-text">
                  #{issue.number} {issue.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                  <span className="inline-flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={issue.author.avatarUrl}
                      alt={issue.author.login}
                      className="size-3.5 rounded-full"
                      loading="lazy"
                    />
                    {issue.author.login}
                  </span>
                  <span>{new Date(issue.createdAt).toLocaleDateString("zh-CN")}</span>
                  {issue.comments.totalCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" />
                      {issue.comments.totalCount}
                    </span>
                  )}
                  <span
                    className={
                      issue.state === "open" ? "text-ok" : "text-ink-3"
                    }
                  >
                    {issue.state === "open" ? "开放" : "已关闭"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Discussions 列表 */}
      {discussions.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 flex items-center gap-2 font-mono text-xs text-ink-3">
            <MessageCircle className="size-3.5" />
            DISCUSSIONS · {discussions.length}
          </h4>
          <div className="space-y-2">
            {discussions.map((discussion) => (
              <a
                key={discussion.id}
                href={discussion.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <p className="text-sm font-medium text-ink transition-colors hover:text-accent-text">
                  {discussion.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                  <span className="inline-flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={discussion.author.avatarUrl}
                      alt={discussion.author.login}
                      className="size-3.5 rounded-full"
                      loading="lazy"
                    />
                    {discussion.author.login}
                  </span>
                  <span>
                    {new Date(discussion.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                  {discussion.comments.totalCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" />
                      {discussion.comments.totalCount}
                    </span>
                  )}
                  {discussion.upvoteCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3" />
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
      <div className="rounded-2xl border border-line bg-surface px-6 py-8 text-center shadow-card">
        <p className="font-serif text-base font-semibold text-ink">
          {hasDiscussions ? "欢迎参与讨论" : "欢迎反馈问题"}
        </p>
        <p className="mt-2 text-sm text-ink-2">
          {hasDiscussions
            ? "对此内容有疑问或建议？提交 Issue 或创建新的 Discussion"
            : "对此内容有疑问或建议？通过 Issues 提出问题和建议"}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`https://github.com/${repo}/issues/new?title=${encodeURIComponent(title || "问题反馈")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop"
          >
            <AlertCircle className="size-4" />
            提交 Issue
          </a>
          {hasDiscussions && (
            <a
              href={`https://github.com/${repo}/discussions/new?category=general&title=${encodeURIComponent(title || "新的讨论")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
            >
              <Users className="size-4" />
              创建讨论
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
      <MessageSquare className="size-4 text-ink-3" />
      {children}
    </h3>
  );
}

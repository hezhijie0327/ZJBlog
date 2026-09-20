import {
  MessageSquare,
  MessageCircle,
  ThumbsUp,
  ExternalLink,
  Users,
  Star,
  GitBranch,
  AlertCircle,
} from 'lucide-react'
import {
  getGitHubDiscussions,
  getGitHubIssues,
  getGitHubRepoInfo,
  hasDiscussionsEnabled,
  type GitHubDiscussion,
  type GitHubIssue,
  type GitHubRepoInfo,
} from '@/lib/github'
import { cn } from '@/lib/utils'
import { BTN_OUTLINE, BTN_PRIMARY, CARD, CHIP, META } from '@/lib/styles'
import { t } from '@/lib/i18n'

interface GitHubCommentsProps {
  repo?: string
  title?: string // 用于创建新 Discussion 的标题
}

/**
 * 构建期取数的 GitHub 讨论区（Server Component，静态导出时数据固化在 HTML 里）。
 * 不在客户端请求 api.github.com：未认证配额仅 60 次/时/IP，访客共享出口 IP
 * 时必然 403 并污染控制台；构建期取数对访客零请求、零限流。
 */
export default async function GitHubComments({ repo, title }: GitHubCommentsProps) {
  let repoInfo: GitHubRepoInfo | null = null
  let discussions: GitHubDiscussion[] = []
  let issues: GitHubIssue[] = []
  let hasDiscussions = false

  if (repo) {
    try {
      ;[repoInfo, hasDiscussions, discussions, issues] = await Promise.all([
        getGitHubRepoInfo(repo),
        hasDiscussionsEnabled(repo),
        getGitHubDiscussions(repo, 5),
        getGitHubIssues(repo, 5, 'open'),
      ])
    } catch (err) {
      console.error(`Error fetching data for repo: ${repo}:`, err)
      repoInfo = null
    }
  }

  const sectionTitle = hasDiscussions
    ? t('comments.discussions')
    : t('comments.issues')

  if (!repo || !repoInfo) {
    return (
      <section className="mt-14 border-t border-line pt-8">
        <SectionTitle>{sectionTitle}</SectionTitle>
        <div className={cn(CARD, 'px-6 py-8 text-center')}>
          <p className="font-serif text-base font-semibold text-ink">
            {repo ? t('comments.welcome') : t('comments.noRepo')}
          </p>
          {repo && (
            <>
              <p className="mt-2 text-sm text-ink-2">
                {t('comments.noRepoBlurb')}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <a
                  href={`https://github.com/${repo}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(BTN_OUTLINE, 'h-9 px-4 text-[13px]')}
                >
                  <ExternalLink className="size-3.5" />
                  {t('comments.openRepo')}
                </a>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="mt-14 border-t border-line pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>{sectionTitle}</SectionTitle>
        <div className={cn(META, 'flex items-center gap-4')}>
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
      <div className={cn(CARD, 'mb-6 p-5')}>
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
              {repoInfo.description || t('comments.noDescription')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasDiscussions && (
              <span className={cn(CHIP, 'font-mono text-[10px]')}>
                Discussions
              </span>
            )}
            <a
              href={repoInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('nav.github')}
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
          <h4 className={cn(META, 'mb-3 flex items-center gap-2')}>
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
                <div className={cn(META, 'mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]')}>
                  <span className="inline-flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={issue.author.avatarUrl}
                      alt={issue.author.login}
                      width={14}
                      height={14}
                      className="size-3.5 rounded-full"
                      loading="lazy"
                    />
                    {issue.author.login}
                  </span>
                  <span>{new Date(issue.createdAt).toLocaleDateString('zh-CN')}</span>
                  {issue.comments.totalCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" />
                      {issue.comments.totalCount}
                    </span>
                  )}
                  <span className={issue.state === 'open' ? 'text-ok' : 'text-ink-3'}>
                    {issue.state === 'open'
                      ? t('comments.stateOpen')
                      : t('comments.stateClosed')}
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
          <h4 className={cn(META, 'mb-3 flex items-center gap-2')}>
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
                <div className={cn(META, 'mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]')}>
                  <span className="inline-flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={discussion.author.avatarUrl}
                      alt={discussion.author.login}
                      width={14}
                      height={14}
                      className="size-3.5 rounded-full"
                      loading="lazy"
                    />
                    {discussion.author.login}
                  </span>
                  <span>
                    {new Date(discussion.createdAt).toLocaleDateString('zh-CN')}
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
      <div className={cn(CARD, 'px-6 py-8 text-center')}>
        <p className="font-serif text-base font-semibold text-ink">
          {hasDiscussions ? t('comments.welcome') : t('comments.welcomeIssues')}
        </p>
        <p className="mt-2 text-sm text-ink-2">
          {hasDiscussions
            ? t('comments.blurbDiscussions')
            : t('comments.blurbIssues')}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`https://github.com/${repo}/issues/new?title=${encodeURIComponent(title || '问题反馈')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={BTN_PRIMARY}
          >
            <AlertCircle className="size-4" />
            {t('comments.submitIssue')}
          </a>
          {hasDiscussions && (
            <a
              href={`https://github.com/${repo}/discussions/new?category=general&title=${encodeURIComponent(title || '新的讨论')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_OUTLINE}
            >
              <Users className="size-4" />
              {t('comments.createDiscussion')}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-ink">
      <MessageSquare className="size-4 text-ink-3" />
      {children}
    </h3>
  )
}

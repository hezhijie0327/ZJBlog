import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const contentDirectory = path.join(process.cwd(), 'content')

export interface ContentFrontmatter {
  title?: string
  description?: string
  date?: string
  tags?: string[]
  category?: string
  type?: 'personal' | 'starred'
  link?: string
  image?: string
  [key: string]: unknown
}

export interface ContentItem {
  slug: string
  title: string
  date?: string
  description?: string
  tags?: string[]
  content: string
  readingTime: string
  frontmatter: ContentFrontmatter
}

export interface ProjectItem extends ContentItem {
  type: 'personal' | 'starred'
  link?: string
  image?: string
  githubRepo?: string // 解析出的 GitHub 仓库，格式: "owner/repo"
}

export interface BlogItem extends ContentItem {
  category?: string
}

// 读取所有内容文件
export function getAllContentSlugs(type: string): string[] {
  const fullPath = path.join(contentDirectory, type)
  if (!fs.existsSync(fullPath)) {
    return []
  }
  const slugs = fs.readdirSync(fullPath)
  return slugs
    .filter((slug) => slug.endsWith('.md'))
    .map((slug) => slug.replace(/\.md$/, ''))
}

// 读取单个 MD 文件
export function getContentBySlug(slug: string, type: string): ContentItem {
  // 解码 URL 编码的 slug
  const decodedSlug = decodeURIComponent(slug)
  const fullPath = path.join(contentDirectory, type, `${decodedSlug}.md`)

  // 如果直接文件不存在，尝试查找匹配的文件
  if (!fs.existsSync(fullPath)) {
    const dirPath = path.join(contentDirectory, type)
    const files = fs.readdirSync(dirPath)
    const matchingFile = files.find(file =>
      file.replace(/\.md$/, '') === decodedSlug
    )

    if (!matchingFile) {
      throw new Error(`File not found for slug: ${slug}`)
    }

    const actualPath = path.join(dirPath, matchingFile)
    const fileContents = fs.readFileSync(actualPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      slug,
      content,
      readingTime: readingTime(content).text,
      frontmatter: data,
      title: data.title || decodedSlug,
      date: data.date,
      description: data.description,
      tags: data.tags || [],
    }
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  return {
    slug,
    content,
    readingTime: readingTime(content).text,
    frontmatter: data,
    title: data.title || decodedSlug,
    date: data.date,
    description: data.description,
    tags: data.tags || [],
  }
}

// 获取所有内容列表
export function getAllContent(type: string, limit?: number): ContentItem[] {
  const slugs = getAllContentSlugs(type)
  const posts = slugs
    .map((slug) => getContentBySlug(slug, type))
    .sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      return 0
    })

  if (limit) {
    return posts.slice(0, limit)
  }

  return posts
}

// 解析 GitHub 仓库链接
function parseGitHubRepo(link?: string): string | undefined {
  if (!link) return undefined

  const githubUrlRegex = /github\.com\/([^\/]+)\/([^\/\?#]+)/i
  const match = link.match(githubUrlRegex)

  if (match) {
    const [, owner, repo] = match
    // 移除 .git 后缀
    const cleanRepo = repo.replace(/\.git$/, '')
    return `${owner}/${cleanRepo}`
  }

  return undefined
}

// 获取项目列表
export function getAllProjects(): ProjectItem[] {
  const projects = getAllContent('projects').map(project => ({
    ...project,
    type: project.frontmatter.type || 'personal' as const,
    link: project.frontmatter.link,
    image: project.frontmatter.image,
    githubRepo: parseGitHubRepo(project.frontmatter.link)
  }))

  return projects
}

// 获取所有博客
export function getAllBlogs(): BlogItem[] {
  return getAllContent('blogs').map(blog => ({
    ...blog,
    category: blog.frontmatter.category
  }))
}
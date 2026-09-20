import { getAllBlogs, getAllProjects } from "@/lib/content";

export const dynamic = "force-static";

interface SearchItem {
  title: string;
  description?: string;
  type: "blog" | "project";
  tags: string[];
  href: string;
}

export function GET() {
  const items: SearchItem[] = [
    ...getAllBlogs().map((blog) => ({
      title: blog.title,
      description: blog.description,
      type: "blog" as const,
      tags: blog.tags ?? [],
      href: `/blogs/${blog.slug}/`,
    })),
    ...getAllProjects().map((project) => ({
      title: project.title,
      description: project.description,
      type: "project" as const,
      tags: project.tags ?? [],
      href: `/projects/${project.slug}/`,
    })),
  ];

  return Response.json(items);
}

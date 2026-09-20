import ReactMarkdown from "react-markdown";
import MermaidRenderer from "@/components/MermaidRenderer";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 共用的 Markdown 渲染器：衬线排版（typography 插件）+ Mermaid 代码块支持
 */
export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  if (!content) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        内容为空或加载失败。
      </div>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-lg max-w-none dark:prose-invert",
        "prose-headings:font-serif prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-p:leading-relaxed",
        "prose-blockquote:rounded-r-lg prose-blockquote:border-l-2 prose-blockquote:border-accent-strong prose-blockquote:bg-surface-2/60 prose-blockquote:py-1 prose-blockquote:not-italic",
        "prose-code:rounded prose-code:bg-surface-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded-xl prose-pre:border prose-pre:border-line",
        "prose-img:rounded-xl prose-img:border prose-img:border-line",
        "prose-th:text-sm prose-td:text-sm",
        className,
      )}
    >
      <ReactMarkdown
        components={{
          pre: ({ children, ...props }) => {
            const codeChild = Array.isArray(children) ? children[0] : children;
            const className =
              (codeChild as React.ReactElement<{ className?: string }>)?.props
                ?.className || "";
            const isMermaidBlock = className.includes("language-mermaid");
            const chartText = String(
              (codeChild as React.ReactElement<{ children?: React.ReactNode }>)
                ?.props?.children || "",
            ).trim();

            if (isMermaidBlock && chartText) {
              return <MermaidRenderer chart={chartText} />;
            }

            return (
              <div className="not-prose my-5 overflow-x-auto rounded-xl border border-line">
                <pre {...props}>{children}</pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

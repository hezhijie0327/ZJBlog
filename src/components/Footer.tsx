// 页脚：仅版权一行。站名用拉丁拼写的固定字标（不随 UI 语言翻译）。

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/80 bg-bg">
      <div className="container mx-auto px-4 py-8">
        {/* 年份跨年构建/访问会不一致，抑制水合警告（客户端值才是对的）。
            版权署名用个人字标 Zhijie Online，不随产品名（ZJBlog）变动。 */}
        <p className="text-center text-xs text-ink-3" suppressHydrationWarning>
          © {currentYear} Zhijie Online
        </p>
      </div>
    </footer>
  );
}

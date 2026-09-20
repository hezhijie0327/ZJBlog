import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommandPalette from "@/components/CommandPalette";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased flex flex-col"
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navigation />
          <main className="flex-1 pb-12">{children}</main>
          <Footer className="flex-shrink-0" />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}

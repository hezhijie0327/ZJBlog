// 文末署名卡：作者 + 授权协议（内容升级不换 branding 的小卡）。

import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD } from "@/lib/styles.ts";

export function AuthorCard() {
  const t = useT();
  const author = t("site.author");
  return (
    <div className={cn("mt-12 flex items-center gap-4", CARD, "p-5")}>
      <img
        alt={author}
        className="size-12 rounded-full object-cover ring-1 ring-line"
        height={48}
        loading="lazy"
        src="/avatar.jpg"
        width={48}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{t("post.authorBy", { author })}</p>
        <p className="mt-0.5 text-xs text-ink-3">
          <a
            className="transition-colors hover:text-accent"
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
            rel="noopener noreferrer"
            target="_blank"
          >
            CC BY-NC-SA 4.0
          </a>{" "}
          · {t("post.licenseNote")}
        </p>
      </div>
    </div>
  );
}

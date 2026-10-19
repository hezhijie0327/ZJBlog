// Support page: WeChat / Alipay QR codes. Entry is the heart icon at the top right of the nav;
// the page stays minimal. Structure aligns with the site's list pages: SectionHeading page title
// + left-aligned content column (DESIGN.md §6).

import { Heart } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { cn } from "@/lib/cn.ts";
import { useT } from "@/lib/i18n.ts";
import { CARD, SECTION } from "@/lib/styles.ts";

export function SupportPage() {
  const t = useT();
  const channels = [
    {
      name: t("support.wechat"),
      hint: t("support.wechatHint"),
      image: { src: "/wechat.png", alt: t("support.wechatHint") },
    },
    {
      name: t("support.alipay"),
      hint: t("support.alipayHint"),
      image: { src: "/alipay.png", alt: t("support.alipayHint") },
    },
  ];

  return (
    <div className={SECTION}>
      <SectionHeading en={t("page.support.en")} level={1} title={t("page.support.title")} />
      <div className="mx-auto max-w-2xl">
        <p className="font-serif text-lg leading-relaxed text-ink-2">
          {t("support.lede1")}
          <br />
          {t("support.lede2")}
        </p>
        <p className="mt-3 text-sm text-ink-3">{t("support.sub")}</p>

        <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
          {channels.map((item) => (
            <div className={cn("flex flex-col items-center", CARD, "p-6")} key={item.name}>
              {/* The fixed white background is intentional (registered exemption in DESIGN.md §3):
                  payment QR codes need a true white backing for scanner contrast, and must not
                  flip dark with the tokens in dark mode */}
              <div className="mb-5 size-48 rounded-xl border border-line bg-white p-3">
                <img
                  alt={item.image.alt}
                  className="size-full rounded-lg object-contain"
                  fetchPriority="high"
                  height={192}
                  src={item.image.src}
                  width={192}
                />
              </div>
              <h2 className="font-serif text-lg font-semibold text-ink">{item.name}</h2>
              <p className="mt-1.5 text-xs text-ink-3">{item.hint}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 flex items-center gap-1.5 text-sm text-ink-2">
          <Heart aria-hidden="true" className="size-3.5 text-accent-strong" />
          {t("support.thanks")}
        </p>
      </div>
    </div>
  );
}

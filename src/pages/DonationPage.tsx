// 赞赏页：微信 / 支付宝二维码 + GitHub Sponsors。

import { Heart } from "lucide-react";
import { GithubIcon } from "@/components/icons.tsx";
import { SectionHeading } from "@/components/SectionHeading.tsx";
import { siteConfig } from "@/config/site.ts";
import { useT } from "@/lib/i18n.ts";

export function DonationPage() {
  const t = useT();
  const donations = [
    {
      name: t("donation.wechat"),
      hint: t("donation.wechatHint"),
      image: { src: "/wechat.png", alt: t("donation.wechatHint") },
    },
    {
      name: t("donation.alipay"),
      hint: t("donation.alipayHint"),
      image: { src: "/alipay.png", alt: t("donation.alipayHint") },
    },
  ];

  return (
    <div className="container mx-auto px-4 py-14 sm:py-20">
      <SectionHeading en={t("page.support.en")} index="00" title={t("page.support.title")} />

      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="font-serif text-xl leading-relaxed text-ink sm:text-2xl">
          {t("donation.lede1")}
          <br />
          {t("donation.lede2")}
        </p>
        <p className="mt-4 text-sm text-ink-2">{t("donation.sub")}</p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {donations.map((item) => (
          <div
            className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
            key={item.name}
          >
            <div className="mb-5 size-48 rounded-xl border border-line bg-white p-3">
              <img
                alt={item.image.alt}
                className="size-full rounded-lg object-contain"
                height={192}
                loading="lazy"
                src={item.image.src}
                width={192}
              />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink">{item.name}</h3>
            <p className="mt-1.5 text-xs text-ink-3">{item.hint}</p>
          </div>
        ))}

        {/* GitHub Sponsors */}
        <a
          className="group flex flex-col items-center rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
          href="https://github.com/sponsors/hezhijie0327"
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="mb-5 grid size-48 place-items-center rounded-xl border border-line bg-surface-2">
            <GithubIcon className="size-16 text-ink transition-transform group-hover:scale-105" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-ink">GitHub Sponsors</h3>
          <p className="mt-1.5 text-xs text-ink-3">{t("donation.sponsorsHint")}</p>
        </a>
      </div>

      <p className="mt-12 flex items-center justify-center gap-1.5 text-center text-sm text-ink-2">
        <Heart aria-hidden="true" className="size-3.5 text-accent-strong" />
        {t("donation.thanks")}
      </p>

      <p className="mt-4 text-center font-mono text-[11px] text-ink-3">
        {siteConfig.author} · {siteConfig.name}
      </p>
    </div>
  );
}

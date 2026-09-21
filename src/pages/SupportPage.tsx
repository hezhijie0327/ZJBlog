// 支持页：微信 / 支付宝二维码。入口是导航右上角的心形图标，页面保持精简。

import { Heart } from "lucide-react";
import { useT } from "@/lib/i18n.ts";
import { SECTION } from "@/lib/styles.ts";

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
      <div className="mx-auto max-w-2xl text-center">
        <div aria-hidden="true" className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-accent-soft">
          <Heart className="size-5 text-accent-strong" />
        </div>
        <h1 className="font-serif text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {t("page.support.title")}
        </h1>
        <p className="mt-4 font-serif text-lg leading-relaxed text-ink-2">
          {t("support.lede1")}
          <br />
          {t("support.lede2")}
        </p>
        <p className="mt-3 text-sm text-ink-3">{t("support.sub")}</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {channels.map((item) => (
          <div
            className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 shadow-card"
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
            <h2 className="font-serif text-lg font-semibold text-ink">{item.name}</h2>
            <p className="mt-1.5 text-xs text-ink-3">{item.hint}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-sm text-ink-2">
        <Heart aria-hidden="true" className="size-3.5 text-accent-strong" />
        {t("support.thanks")}
      </p>
    </div>
  );
}

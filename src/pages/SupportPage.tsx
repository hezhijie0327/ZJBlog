// 支持页：微信 / 支付宝二维码。入口是导航右上角的心形图标，页面保持精简。

import { Heart } from "lucide-react";
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
          <div className={cn("flex flex-col items-center", CARD, "p-6")} key={item.name}>
            {/* 固定白底是有意的（DESIGN.md §3 登记豁免）：收款码需要真实白底
                保证扫码器对比度，暗色下也不能跟 token 翻黑 */}
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

      <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-sm text-ink-2">
        <Heart aria-hidden="true" className="size-3.5 text-accent-strong" />
        {t("support.thanks")}
      </p>
    </div>
  );
}

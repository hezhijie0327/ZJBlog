import type { Metadata } from "next";
import Image from "next/image";
import SectionHeading from "@/components/SectionHeading";
import { Heart } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "支持",
  description: "如果这个站点的内容对你有帮助，欢迎支持我继续创作",
};

const donations = [
  {
    name: "微信支付",
    hint: "扫描二维码进行微信支付",
    image: { src: "/wechat.png", alt: "微信支付二维码" },
  },
  {
    name: "支付宝",
    hint: "扫描二维码进行支付宝支付",
    image: { src: "/alipay.png", alt: "支付宝二维码" },
  },
] as const;

export default function DonationPage() {
  return (
    <div className="min-h-full">
      <div className="container mx-auto px-4 py-14 sm:py-20">
        <SectionHeading index="00" title="支持" en="Support" />

        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="font-serif text-xl leading-relaxed text-ink sm:text-2xl">
            如果这里的文章或项目对你有帮助，
            <br />
            欢迎请我喝杯咖啡 ☕
          </p>
          <p className="mt-4 text-sm text-ink-2">
            每一份支持都是持续创作与维护的动力。
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {donations.map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
            >
              <div className="mb-5 size-48 rounded-xl border border-line bg-white p-3">
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  width={192}
                  height={192}
                  className="size-full rounded-lg object-contain"
                />
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink">
                {item.name}
              </h3>
              <p className="mt-1.5 text-xs text-ink-3">{item.hint}</p>
            </div>
          ))}

          {/* GitHub Sponsors */}
          <a
            href={`https://github.com/sponsors/hezhijie0327`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center rounded-2xl border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-pop"
          >
            <div className="mb-5 grid size-48 place-items-center rounded-xl border border-line bg-surface-2">
              <GithubIcon className="size-16 text-ink transition-transform group-hover:scale-105" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink">
              GitHub Sponsors
            </h3>
            <p className="mt-1.5 text-xs text-ink-3">
              如果你是开发者，可以通过 Sponsors 支持我
            </p>
          </a>
        </div>

        <p className="mt-12 flex items-center justify-center gap-1.5 text-center text-sm text-ink-2">
          <Heart className="size-3.5 text-accent-strong" />
          谢谢你的支持
        </p>

        <p className="mt-4 text-center font-mono text-[11px] text-ink-3">
          {siteConfig.author} · {siteConfig.name}
        </p>
      </div>
    </div>
  );
}

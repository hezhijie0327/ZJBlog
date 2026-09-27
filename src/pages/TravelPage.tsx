// 旅行详情：头部（日期区间 · 地点 · 同行）+ 构建期故事正文 + giscus。
// 锁定旅行（trip.locked 有值）以锁屏替代正文：故事与照片都在信封里，
// 解锁缓存走 travel:<slug> 命名空间（与博客 slug 互不冲突）。

import { Heart, MapPin, User } from "lucide-react";
import { useState } from "react";
import { BackLink } from "@/components/BackLink.tsx";
import { LockScreen } from "@/components/LockScreen.tsx";
import { GiscusComments } from "@/features/comments/GiscusComments.tsx";
import { Prose } from "@/features/markdown/Prose.tsx";
import { formatDateISO } from "@/lib/format.ts";
import { useT } from "@/lib/i18n.ts";
import { getCachedUnlock, type UnlockedBundle } from "@/lib/locked.ts";
import { CHIP, SECTION_DETAIL } from "@/lib/styles.ts";
import type { TravelData } from "@/lib/types.ts";

export function TravelPage({ data }: { data: TravelData }) {
  const t = useT();
  const { trip } = data;
  // 解锁态从会话缓存初始化（首载必空 = SSR 一致，水合安全）
  const [unlocked, setUnlocked] = useState<UnlockedBundle | null>(() =>
    trip.locked ? (getCachedUnlock(`travel:${trip.slug}`) ?? null) : null,
  );
  const html = unlocked?.html ?? trip.contentHtml ?? "";

  return (
    <div className={SECTION_DETAIL}>
      {/* 页头直接置于容器下：全站标题同一左缘（DESIGN.md §6） */}
      <BackLink href="/travels/" label={t("travel.back")} />

      <header className="mb-10 mt-8 border-b border-line pb-8">
        <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">
          {trip.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-ink-3">
          {trip.date && (
            <time dateTime={trip.date}>
              {formatDateISO(trip.date)}
              {trip.endDate && ` – ${formatDateISO(trip.endDate)}`}
            </time>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-3" />
            {trip.place}
          </span>
          <span className={CHIP}>
            {trip.companion === "solo" ? (
              <>
                <User aria-hidden="true" className="mr-1 inline size-3" />
                {t("travel.solo")}
              </>
            ) : (
              <>
                <Heart aria-hidden="true" className="mr-1 inline size-3 fill-accent-strong text-accent-strong" />
                {t("travel.couple")}
              </>
            )}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        {trip.locked && !unlocked ? (
          /* 锁定旅行：锁屏即正文位（故事/照片都属加密内容） */
          <LockScreen locked={trip.locked} onUnlock={setUnlocked} slug={trip.slug} unlockKey={`travel:${trip.slug}`} />
        ) : (
          <>
            {/* 故事正文（锁定文 = 解锁后的明文） */}
            <Prose html={html} needsKatex={trip.needsKatex} />
            <GiscusComments />
          </>
        )}
      </div>
    </div>
  );
}

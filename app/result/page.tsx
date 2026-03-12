"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

/** 앱 DestinyResultPage 사주 탭 섹션 순서 (onboarding-analysis-flow.md 5.2) */
const SAJU_SECTIONS = [
  { title: "캐릭터 인사", key: "greeting" },
  { title: "사주팔자 (四柱八字)", key: "fourPillars" },
  { title: "오행 분포 (五行)", key: "fiveElements" },
  { title: "성격 특성", key: "personality" },
  { title: "AI 사주 해석", key: "interpretation" },
  { title: "올해 운세", key: "yearlyFortune" },
  { title: "시기별 운세", key: "periodFortune" },
  { title: "연애 스타일", key: "romanceStyle" },
  { title: "연애 핵심 포인트", key: "romanceKeyPoints" },
  { title: "이상형 사주", key: "idealMatch" },
];

/** 앱 DestinyResultPage 관상 탭 섹션 순서 (onboarding-analysis-flow.md 5.3) */
const GWANSANG_SECTIONS = [
  { title: "동물상 히어로", key: "animalHero" },
  { title: "헤드라인", key: "headline" },
  { title: "매력 키워드", key: "charmKeywords" },
  { title: "삼정(三停) 운세", key: "samjeong" },
  { title: "오관(五官) 해석", key: "ogwan" },
  { title: "성격 요약", key: "personalitySummary" },
  { title: "연애 스타일", key: "romanceStyle" },
  { title: "연애 핵심 포인트", key: "romanceKeyPoints" },
  { title: "성격 특성 5축", key: "fiveAxis" },
  { title: "이상형 관상", key: "idealMatch" },
];

function ResultSectionCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
    </div>
  );
}

export default function ResultPage() {
  const [tab, setTab] = useState<"saju" | "gwansang">("saju");

  return (
    <MobileContainer className="min-h-dvh bg-hanji text-ink flex flex-col">
      {/* 공통 헤더: 캐릭터 + 동물상 배지 + 이름·한줄요약 (앱 5.1) */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex flex-col items-center">
          <div className="relative w-[140px] h-[120px] flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-[3px] border-element-metal/30 bg-element-metal-pastel overflow-hidden shrink-0">
              <Image
                src="/images/characters/mulgyeori/default.png"
                alt=""
                width={96}
                height={96}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
            <div className="absolute right-0 bottom-0 min-w-[48px] min-h-[48px] px-3 py-2.5 rounded-full bg-hanji border-2 border-brand/30 shadow-md flex items-center justify-center">
              <span className="text-ink text-[13px] font-bold">동물상</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand/20 text-ink">
              이름
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ink/10 text-ink">
              동물상
            </span>
          </div>
        </div>
      </header>

      {/* TabBar (앱과 동일: 사주 | 관상) */}
      <div className="sticky top-0 z-10 bg-hanji border-b border-hanji-border">
        <div className="flex">
          <button
            type="button"
            onClick={() => setTab("saju")}
            className={`flex-1 py-3 text-[15px] font-semibold ${
              tab === "saju" ? "text-ink border-b-2 border-ink" : "text-ink-tertiary"
            }`}
          >
            사주
          </button>
          <button
            type="button"
            onClick={() => setTab("gwansang")}
            className={`flex-1 py-3 text-[15px] font-semibold ${
              tab === "gwansang" ? "text-ink border-b-2 border-ink" : "text-ink-tertiary"
            }`}
          >
            관상
          </button>
        </div>
      </div>

      {/* TabBarView — 앱과 동일한 섹션 구성 */}
      <div className="flex-1 overflow-auto px-5 py-6">
        {tab === "saju" && (
          <div className="space-y-6">
            {SAJU_SECTIONS.map((s) => (
              <ResultSectionCard key={s.key} title={s.title} />
            ))}
          </div>
        )}
        {tab === "gwansang" && (
          <div className="space-y-6">
            {GWANSANG_SECTIONS.map((s) => (
              <ResultSectionCard key={s.key} title={s.title} />
            ))}
          </div>
        )}
      </div>

      {/* 하단 CTA (앱 5.4) */}
      <div className="px-5 py-4 border-t border-hanji-border bg-hanji shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <Link href={ROUTES.COMPLETE} className="block">
          <Button size="lg" className="w-full flex items-center justify-center gap-2">
            <span aria-hidden>♥</span>
            내 사주와 찰떡인 사람, 만나볼까요?
          </Button>
        </Link>
        <Link href="/share/preview" className="block mt-3">
          <Button variant="outline" size="md" className="w-full">
            친구에게 공유하기
          </Button>
        </Link>
      </div>
    </MobileContainer>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";

const SAJU_SECTIONS = [
  "캐릭터 인사",
  "사주팔자 (四柱八字)",
  "오행 분포 (五行)",
  "성격 특성",
  "AI 사주 해석",
  "올해 운세",
  "시기별 운세",
  "연애 스타일",
  "연애 핵심 포인트",
  "이상형 사주",
];

const GWANSANG_SECTIONS = [
  "동물상 히어로",
  "헤드라인",
  "매력 키워드",
  "삼정(三停) 운세",
  "오관(五官) 해석",
  "성격 요약",
  "연애 스타일",
  "연애 핵심 포인트",
  "성격 특성 5축",
  "이상형 관상",
];

interface ShareResultViewProps {
  profileName: string;
}

export function ShareResultView({ profileName }: ShareResultViewProps) {
  const [tab, setTab] = useState<"saju" | "gwansang">("saju");

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      <header className="shrink-0 px-5 pt-8 pb-6">
        <div className="flex flex-col items-center">
          <div className="relative w-[140px] h-[120px] flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-[3px] border-element-metal/30 bg-element-metal-pastel overflow-hidden shrink-0 flex items-center justify-center">
              <Image
                src="/images/characters/mulgyeori/default.png"
                alt=""
                width={64}
                height={64}
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="absolute right-0 bottom-0 min-w-[48px] min-h-[48px] px-3 py-2.5 rounded-full bg-hanji border-2 border-brand/30 shadow-md flex items-center justify-center">
              <span className="text-ink text-[13px] font-bold">동물상</span>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">{profileName}님의 사주·관상</p>
        </div>
      </header>

      <div className="shrink-0 bg-hanji border-b border-hanji-border">
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

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pt-6 pb-8">
        {tab === "saju" && (
          <div className="space-y-6">
            {SAJU_SECTIONS.map((title) => (
              <div
                key={title}
                className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4"
              >
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
              </div>
            ))}
          </div>
        )}
        {tab === "gwansang" && (
          <div className="space-y-6">
            {GWANSANG_SECTIONS.map((title) => (
              <div
                key={title}
                className="rounded-2xl border border-hanji-border bg-hanji-elevated p-4"
              >
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
              </div>
            ))}
          </div>
        )}
      </div>

      <CtaBar className="shrink-0">
        <Link href="/" className="block w-full">
          <Button size="lg" className="w-full">
            나도 사주 보러 가기
          </Button>
        </Link>
      </CtaBar>
    </MobileContainer>
  );
}

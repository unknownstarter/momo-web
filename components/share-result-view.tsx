"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import {
  elementKey,
  ELEMENT_COLORS,
  ELEMENT_KOREAN,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";
import { SectionTitle } from "@/components/result/section-title";
import { SajuCard } from "@/components/result/saju-card";
import { PillarCard } from "@/components/result/pillar-card";
import { FiveElementsChart } from "@/components/result/five-elements-chart";
import { CharacterBubble } from "@/components/result/character-bubble";
import { YearlyFortuneCard } from "@/components/result/yearly-fortune-card";
import { PeriodFortunesSection } from "@/components/result/period-fortunes-section";
import { RomanceStyleCard } from "@/components/result/romance-style-card";
import { RomanceKeyPointsCard } from "@/components/result/romance-key-points-card";
import { IdealMatchSajuCard } from "@/components/result/ideal-match-saju-card";
import { GwansangAnimalHero } from "@/components/result/gwansang-animal-hero";
import { SamjeongCard } from "@/components/result/samjeong-card";
import { OgwanCard } from "@/components/result/ogwan-card";
import { TraitsChart } from "@/components/result/traits-chart";
import { IdealMatchGwansangCard } from "@/components/result/ideal-match-gwansang-card";

interface ShareProfile {
  character_type?: string | null;
  dominant_element?: string | null;
}

interface ShareResultViewProps {
  profileName: string;
  profile?: ShareProfile | null;
  sajuProfile?: Record<string, unknown> | null;
  gwansangProfile?: Record<string, unknown> | null;
}

export function ShareResultView({
  profileName,
  profile,
  sajuProfile,
  gwansangProfile,
}: ShareResultViewProps) {
  const [tab, setTab] = useState<"saju" | "gwansang">("saju");

  const dominantEl = profile?.dominant_element ?? (sajuProfile?.dominant_element as string) ?? null;
  const elementKeyVal = elementKey(dominantEl);
  const elementColors = ELEMENT_COLORS[elementKeyVal];
  const accentColor = elementColors?.main ?? ELEMENT_COLORS.metal.main;
  const pastelColor = elementColors?.pastel ?? ELEMENT_COLORS.metal.pastel;
  const effectiveCharacterType = profile?.character_type ?? getCharacterTypeFromElement(dominantEl) ?? "namuri";

  const hasNoData = !sajuProfile && !gwansangProfile;

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      {/* 헤더 + 탭 + 내용 전체를 내부 스크롤 컨테이너로 감싸기 (메인 결과 페이지와 동일 구조) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
        <header className="shrink-0 px-5 pt-6 pb-4">
          <div className="flex flex-col items-center">
            <div className="relative w-[140px] h-[120px] flex items-center justify-center">
              <div
                className="w-24 h-24 rounded-full border-[3px] overflow-hidden shrink-0 flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, ${pastelColor} 0%, ${pastelColor}4D 100%)`,
                  borderColor: `${accentColor}4D`,
                }}
              >
                <Image
                  src={`/images/characters/${effectiveCharacterType}/default.png`}
                  alt=""
                  width={64}
                  height={64}
                  className="object-contain"
                  unoptimized
                />
              </div>
              {gwansangProfile?.animal_type_korean ? (
                <div
                  className="absolute right-0 bottom-0 min-w-[48px] min-h-[48px] px-3 py-2.5 rounded-full bg-hanji border-2 shadow-md flex items-center justify-center"
                  style={{ borderColor: `${accentColor}4D` }}
                >
                  <span className="text-ink text-[13px] font-bold">
                    {String(gwansangProfile.animal_type_korean)}상
                  </span>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">
              {profileName}님의 사주·관상
            </p>
          </div>
        </header>

        <div className="sticky top-0 z-10 bg-hanji border-b border-hanji-border">
          <div className="flex">
            <button
              type="button"
              onClick={() => setTab("saju")}
              className={`flex-1 py-3 text-[15px] font-semibold border-b-2 transition-colors ${
                tab === "saju"
                  ? "text-ink"
                  : "text-ink-tertiary border-transparent"
              }`}
              style={tab === "saju" ? { borderColor: accentColor } : undefined}
            >
              사주
            </button>
            <button
              type="button"
              onClick={() => setTab("gwansang")}
              className={`flex-1 py-3 text-[15px] font-semibold border-b-2 transition-colors ${
                tab === "gwansang"
                  ? "text-ink"
                  : "text-ink-tertiary border-transparent"
              }`}
              style={
                tab === "gwansang" ? { borderColor: accentColor } : undefined
              }
            >
              관상
              <span className="ml-1 align-top text-[10px] font-bold px-1.5 py-[1px] rounded-full bg-[#C94A3F]/15 text-[#C94A3F]">New</span>
            </button>
          </div>
        </div>

        <div className="px-5 pt-6 pb-8">
          {hasNoData ? (
            <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-6 text-center">
              <p className="text-ink font-medium">아직 분석 결과가 없어요</p>
              <p className="mt-2 text-sm text-ink-tertiary">
                분석이 완료되면 여기에 결과가 표시돼요.
              </p>
            </div>
          ) : (
            <>
            {tab === "saju" && sajuProfile && (
              <div className="space-y-8 pb-12">
                <CharacterBubble
                  characterType={effectiveCharacterType}
                  userNickname={profileName}
                  message="안녕! 네 사주를 봤어. 아래에서 하나씩 알려줄게 ✨"
                  dominantElement={dominantEl}
                />
                <div>
                  <SectionTitle>사주팔자 (四柱八字)</SectionTitle>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <PillarCard pillar={sajuProfile.year_pillar as { stem?: string; branch?: string }} label="연주" sublabel="年柱" />
                    <PillarCard pillar={sajuProfile.month_pillar as { stem?: string; branch?: string }} label="월주" sublabel="月柱" />
                    <PillarCard pillar={sajuProfile.day_pillar as { stem?: string; branch?: string }} label="일주" sublabel="日柱" />
                    <PillarCard pillar={sajuProfile.hour_pillar as { stem?: string; branch?: string } | null} label="시주" sublabel="時柱" isMissing={!sajuProfile.hour_pillar} />
                  </div>
                </div>
                <div>
                  <SectionTitle>오행 분포 (五行)</SectionTitle>
                  <div className="mt-4">
                    <SajuCard variant="flat">
                      <FiveElementsChart fiveElements={(sajuProfile.five_elements as Record<string, number>) ?? {}} />
                    </SajuCard>
                  </div>
                </div>
                {(sajuProfile.personality_traits as string[] | null)?.length ? (
                  <div>
                    <SectionTitle>성격 특성</SectionTitle>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(sajuProfile.personality_traits as string[]).map((t, i) => (
                        <span key={i} className="px-3.5 py-1.5 rounded-2xl text-[13px] font-medium border" style={{ borderColor: `${accentColor}4D`, backgroundColor: `${accentColor}0F`, color: "var(--ink)" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {sajuProfile.ai_interpretation ? (
                  <div>
                    <SectionTitle>AI 사주 해석</SectionTitle>
                    <div className="mt-4">
                      <SajuCard variant="elevated" borderColor={`${accentColor}33`}>
                        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{String(sajuProfile.ai_interpretation)}</p>
                      </SajuCard>
                    </div>
                  </div>
                ) : null}
                {(sajuProfile.yearly_fortune as { summary?: string } | null)?.summary ? (
                  <div>
                    <SectionTitle>{(sajuProfile.yearly_fortune as { year?: number }).year ?? ""}년 운세</SectionTitle>
                    <div className="mt-4">
                      <YearlyFortuneCard fortune={sajuProfile.yearly_fortune as Parameters<typeof YearlyFortuneCard>[0]["fortune"]} />
                    </div>
                  </div>
                ) : null}
                {sajuProfile.period_fortunes ? (
                  <div>
                    <SectionTitle>시기별 운세</SectionTitle>
                    <div className="mt-4">
                      <PeriodFortunesSection fortunes={sajuProfile.period_fortunes as Parameters<typeof PeriodFortunesSection>[0]["fortunes"]} dominantElement={dominantEl} />
                    </div>
                  </div>
                ) : null}
                {sajuProfile.romance_style ? <RomanceStyleCard style={String(sajuProfile.romance_style)} /> : null}
                {(sajuProfile.romance_key_points as string[] | null)?.length ? <RomanceKeyPointsCard points={sajuProfile.romance_key_points as string[]} /> : null}
                {(sajuProfile.ideal_match as { description?: string } | null)?.description ? (
                  <div>
                    <SectionTitle>잘 맞는 이상형의 사주</SectionTitle>
                    <div className="mt-4">
                      <IdealMatchSajuCard idealMatch={sajuProfile.ideal_match as { description?: string; traits?: string[] }} dominantElement={dominantEl} />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {tab === "gwansang" && !gwansangProfile && sajuProfile && (
              <div className="py-12 text-center">
                <p className="text-ink font-semibold">관상 분석이 준비되지 않았어요</p>
              </div>
            )}
            {tab === "gwansang" && gwansangProfile && (
              <div className="space-y-6 pb-12">
                <GwansangAnimalHero
                  animalTypeKorean={String(gwansangProfile.animal_type_korean)}
                  animalLabel={[gwansangProfile.animal_modifier, gwansangProfile.animal_type_korean].filter(Boolean).join(" ")}
                />
                <p className="text-center text-[15px] text-ink leading-relaxed">{String(gwansangProfile.headline)}</p>
                {(gwansangProfile.charm_keywords as string[] | null)?.length ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {(gwansangProfile.charm_keywords as string[]).map((k, i) => (
                      <span key={i} className="px-3.5 py-1.5 rounded-2xl text-[13px] font-medium border border-brand/30 bg-brand/10 text-ink">{k}</span>
                    ))}
                  </div>
                ) : null}
                <SamjeongCard samjeong={gwansangProfile.samjeong as { upper?: string; middle?: string; lower?: string }} />
                <OgwanCard ogwan={gwansangProfile.ogwan as Record<string, string>} />
                {gwansangProfile.personality_summary ? (
                  <SajuCard variant="elevated">
                    <p className="text-sm font-semibold text-ink">성격</p>
                    <p className="mt-3 text-sm text-ink leading-relaxed">{String(gwansangProfile.personality_summary)}</p>
                  </SajuCard>
                ) : null}
                {gwansangProfile.romance_summary ? (
                  <SajuCard variant="elevated">
                    <p className="text-sm font-semibold text-ink">연애 스타일</p>
                    <p className="mt-3 text-sm text-ink leading-relaxed">{String(gwansangProfile.romance_summary)}</p>
                  </SajuCard>
                ) : null}
                {(gwansangProfile.romance_key_points as string[] | null)?.length ? <RomanceKeyPointsCard points={gwansangProfile.romance_key_points as string[]} /> : null}
                <TraitsChart traits={gwansangProfile.traits as Record<string, number>} />
                <IdealMatchGwansangCard
                  idealMatchAnimalKorean={gwansangProfile.ideal_match_animal_korean as string | null}
                  idealMatchTraits={gwansangProfile.ideal_match_traits as string[] | null}
                  idealMatchDescription={gwansangProfile.ideal_match_description as string | null}
                />
              </div>
            )}
            </>
          )}
        </div>
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

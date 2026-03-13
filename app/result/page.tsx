"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import { ROUTES } from "@/lib/constants";
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

interface SajuProfileRow {
  year_pillar: unknown;
  month_pillar: unknown;
  day_pillar: unknown;
  hour_pillar: unknown;
  five_elements: Record<string, number>;
  dominant_element: string;
  personality_traits: string[] | null;
  ai_interpretation: string | null;
  ideal_match: unknown;
  romance_style: string | null;
  romance_key_points: string[] | null;
  period_fortunes: unknown;
  yearly_fortune: unknown;
}

interface GwansangProfileRow {
  animal_type: string;
  animal_type_korean: string;
  animal_modifier: string;
  headline: string;
  personality_summary: string;
  romance_summary: string;
  romance_key_points: string[] | null;
  charm_keywords: string[] | null;
  samjeong: unknown;
  ogwan: unknown;
  traits: Record<string, number>;
  ideal_match_animal_korean: string | null;
  ideal_match_traits: string[] | null;
  ideal_match_description: string | null;
}

interface ProfileRow {
  name: string | null;
  character_type: string | null;
  animal_type: string | null;
  dominant_element: string | null;
  profile_images: string[] | null;
}

export default function ResultPage() {
  const [tab, setTab] = useState<"saju" | "gwansang">("saju");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [sajuProfile, setSajuProfile] = useState<SajuProfileRow | null>(null);
  const [gwansangProfile, setGwansangProfile] = useState<GwansangProfileRow | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDisplayName(sessionStorage.getItem("momo_display_name") || null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id, name, animal_type, character_type, dominant_element, profile_images, saju_profile_id, gwansang_profile_id")
          .eq("auth_id", user.id)
          .maybeSingle();
        if (!profileRow || cancelled) {
          setDataLoading(false);
          return;
        }
        setProfile({
          name: profileRow.name,
          character_type: profileRow.character_type,
          animal_type: profileRow.animal_type,
          dominant_element: profileRow.dominant_element ?? null,
          profile_images: profileRow.profile_images,
        });
        if (profileRow.saju_profile_id) {
          const { data: saju } = await supabase
            .from("saju_profiles")
            .select("*")
            .eq("id", profileRow.saju_profile_id)
            .maybeSingle();
          if (!cancelled && saju) setSajuProfile(saju as SajuProfileRow);
        }
        if (profileRow.gwansang_profile_id) {
          const { data: gwansang } = await supabase
            .from("gwansang_profiles")
            .select("*")
            .eq("id", profileRow.gwansang_profile_id)
            .maybeSingle();
          if (!cancelled && gwansang) setGwansangProfile(gwansang as GwansangProfileRow);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (profile?.name) setDisplayName(profile.name);
  }, [profile?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/share-url");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data.url) setShareUrl(data.url);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleShare = async () => {
    if (!shareUrl || typeof window === "undefined") return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const dominantEl = profile?.dominant_element ?? sajuProfile?.dominant_element ?? null;
  const elementKeyVal = elementKey(dominantEl);
  const elementColors = ELEMENT_COLORS[elementKeyVal];
  const accentColor = elementColors?.main ?? ELEMENT_COLORS.metal.main;
  const pastelColor = elementColors?.pastel ?? ELEMENT_COLORS.metal.pastel;
  const nickname = profile?.name ?? displayName ?? "";
  const effectiveCharacterType = profile?.character_type ?? getCharacterTypeFromElement(dominantEl) ?? "namuri";
  const animalLabel = gwansangProfile
    ? [gwansangProfile.animal_modifier, gwansangProfile.animal_type_korean].filter(Boolean).join(" ")
    : "";

  const hasNoData = !sajuProfile && !gwansangProfile && !dataLoading;

  return (
    <MobileContainer className="h-dvh max-h-dvh bg-hanji text-ink flex flex-col overflow-hidden">
      {/* 앱 DestinyResultPage 스타일 헤더: 캐릭터 + 동물상 배지, 뱃지 Row, 요약 */}
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
                width={96}
                height={96}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
            {gwansangProfile && (
              <div className="absolute right-0 bottom-0 min-w-[48px] min-h-[48px] px-3 py-2.5 rounded-full bg-hanji border-2 shadow-md flex items-center justify-center" style={{ borderColor: `${accentColor}4D` }}>
                <span className="text-ink text-[13px] font-bold">{gwansangProfile.animal_type_korean}상</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {nickname ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${accentColor}1F`, color: accentColor }}>
                {nickname}
              </span>
            ) : null}
            {animalLabel && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand/20 text-ink">
                {animalLabel}
              </span>
            )}
          </div>
          {dominantEl && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ backgroundColor: `${accentColor}1F`, color: accentColor }}>
                본성 {ELEMENT_KOREAN[elementKeyVal]}
              </span>
            </div>
          )}
          <p className="mt-2 text-sm text-ink-tertiary text-center min-h-[20px]">
            {sajuProfile?.ai_interpretation
              ? sajuProfile.ai_interpretation.slice(0, 50).replace(/\n[\s\S]*/, "") + (sajuProfile.ai_interpretation.length > 50 ? "…" : "")
              : dominantEl
                ? `${ELEMENT_KOREAN[elementKeyVal]} 기운의 사주`
                : ""}
          </p>
        </div>
      </header>

      {/* TabBar — 앱과 동일, 인디케이터 색 = 오행 */}
      <div className="shrink-0 bg-hanji border-b border-hanji-border">
        <div className="flex">
          <button
            type="button"
            onClick={() => setTab("saju")}
            className={`flex-1 py-3 text-[15px] font-semibold border-b-2 transition-colors ${
              tab === "saju" ? "text-ink" : "text-ink-tertiary border-transparent"
            }`}
            style={tab === "saju" ? { borderColor: accentColor } : undefined}
          >
            사주
          </button>
          <button
            type="button"
            onClick={() => setTab("gwansang")}
            className={`flex-1 py-3 text-[15px] font-semibold border-b-2 transition-colors ${
              tab === "gwansang" ? "text-ink" : "text-ink-tertiary border-transparent"
            }`}
            style={tab === "gwansang" ? { borderColor: accentColor } : undefined}
          >
            관상
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pt-6 pb-8">
        {hasNoData ? (
          <div className="rounded-2xl border border-hanji-border bg-hanji-elevated p-6 text-center">
            <p className="text-ink font-medium">아직 분석 결과가 없어요</p>
            <p className="mt-2 text-sm text-ink-tertiary">확인 단계에서 &#39;분석 시작&#39;을 누르면 사주·관상 분석이 진행돼요. 분석이 끝나면 이 페이지에 결과가 표시됩니다.</p>
          </div>
        ) : (
          <>
            {tab === "saju" && sajuProfile && (
              <div className="space-y-8 pb-12">
                <CharacterBubble
                  characterType={effectiveCharacterType}
                  userNickname={nickname}
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
                      <FiveElementsChart fiveElements={sajuProfile.five_elements ?? {}} />
                    </SajuCard>
                  </div>
                </div>
                {sajuProfile.personality_traits?.length ? (
                  <div>
                    <SectionTitle>성격 특성</SectionTitle>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {sajuProfile.personality_traits.map((t, i) => (
                        <span
                          key={i}
                          className="px-3.5 py-1.5 rounded-2xl text-[13px] font-medium border"
                          style={{ borderColor: `${accentColor}4D`, backgroundColor: `${accentColor}0F`, color: "var(--ink)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {sajuProfile.ai_interpretation ? (
                  <div>
                    <SectionTitle>AI 사주 해석</SectionTitle>
                    <div className="mt-4">
                      <SajuCard variant="elevated" borderColor={`${accentColor}33`}>
                        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{sajuProfile.ai_interpretation}</p>
                      </SajuCard>
                    </div>
                  </div>
                ) : null}
                {sajuProfile.yearly_fortune && (sajuProfile.yearly_fortune as { summary?: string }).summary ? (
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
                {sajuProfile.romance_style && (
                  <RomanceStyleCard style={sajuProfile.romance_style} />
                )}
                {sajuProfile.romance_key_points?.length ? (
                  <RomanceKeyPointsCard points={sajuProfile.romance_key_points} />
                ) : null}
                {sajuProfile.ideal_match && (sajuProfile.ideal_match as { description?: string }).description ? (
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
                <p className="mt-2 text-sm text-ink-tertiary">얼굴이 잘 보이는 정면 사진으로 다시 시도해 보세요</p>
              </div>
            )}
            {tab === "gwansang" && gwansangProfile && (
              <div className="space-y-6 pb-12">
                <GwansangAnimalHero
                  animalTypeKorean={gwansangProfile.animal_type_korean}
                  animalLabel={[gwansangProfile.animal_modifier, gwansangProfile.animal_type_korean].filter(Boolean).join(" ")}
                />
                <p className="text-center text-[15px] text-ink leading-relaxed">{gwansangProfile.headline}</p>
                {gwansangProfile.charm_keywords?.length ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {gwansangProfile.charm_keywords.map((k, i) => (
                      <span key={i} className="px-3.5 py-1.5 rounded-2xl text-[13px] font-medium border border-brand/30 bg-brand/10 text-ink">
                        {k}
                      </span>
                    ))}
                  </div>
                ) : null}
                <SamjeongCard samjeong={gwansangProfile.samjeong as { upper?: string; middle?: string; lower?: string }} />
                <OgwanCard ogwan={gwansangProfile.ogwan as Record<string, string>} />
                {gwansangProfile.personality_summary ? (
                  <SajuCard variant="elevated">
                    <p className="text-sm font-semibold text-ink">성격</p>
                    <p className="mt-3 text-sm text-ink leading-relaxed">{gwansangProfile.personality_summary}</p>
                  </SajuCard>
                ) : null}
                {gwansangProfile.romance_summary ? (
                  <SajuCard variant="elevated">
                    <p className="text-sm font-semibold text-ink">연애 스타일</p>
                    <p className="mt-3 text-sm text-ink leading-relaxed">{gwansangProfile.romance_summary}</p>
                  </SajuCard>
                ) : null}
                {gwansangProfile.romance_key_points?.length ? (
                  <RomanceKeyPointsCard points={gwansangProfile.romance_key_points} />
                ) : null}
                <TraitsChart traits={gwansangProfile.traits} />
                <IdealMatchGwansangCard
                  idealMatchAnimalKorean={gwansangProfile.ideal_match_animal_korean}
                  idealMatchTraits={gwansangProfile.ideal_match_traits}
                  idealMatchDescription={gwansangProfile.ideal_match_description}
                />
              </div>
            )}
          </>
        )}
      </div>

      <CtaBar className="shrink-0">
        <Link href={ROUTES.COMPLETE} className="block">
          <Button size="lg" className="w-full flex items-center justify-center gap-2" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
            <span aria-hidden>♥</span>
            내 사주와 찰떡인 사람, 만나볼까요?
          </Button>
        </Link>
        <Button variant="outline" size="md" className="w-full mt-4" onClick={handleShare} disabled={!shareUrl}>
          {shareCopied ? "링크가 복사됐어요!" : "친구에게 공유하기"}
        </Button>
      </CtaBar>
    </MobileContainer>
  );
}

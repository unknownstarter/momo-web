"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MobileContainer } from "@/components/ui/mobile-container";
import { Button } from "@/components/ui/button";
import { CtaBar } from "@/components/ui/cta-bar";
import {
  elementKey,
  ELEMENT_COLORS,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";
import { classifyRomanceType, type RomanceType } from "@/lib/romance-types";
import {
  trackViewShareTeaser,
  trackClickDetailInTeaser,
  trackClickCtaInTeaser,
} from "@/lib/analytics";

interface ShareTeaserViewProps {
  profileName: string;
  dominantElement?: string | null;
  characterType?: string | null;
  personalityTraits?: string[] | null;
  romanceStyle?: string | null;
  romanceKeyPoints?: string[] | null;
  charmKeywords?: string[] | null;
  animalTypeKorean?: string | null;
  animalModifier?: string | null;
  idealMatchSaju?: { description?: string; traits?: string[] } | null;
  idealMatchAnimalKorean?: string | null;
  idealMatchTraits?: string[] | null;
  idealMatchDescription?: string | null;
  detailHref: string;
}

export function ShareTeaserView({
  profileName,
  dominantElement,
  characterType,
  personalityTraits,
  romanceStyle,
  romanceKeyPoints,
  charmKeywords,
  animalTypeKorean,
  animalModifier,
  idealMatchSaju,
  idealMatchAnimalKorean,
  detailHref,
}: ShareTeaserViewProps) {
  const elKey = elementKey(dominantElement);
  const colors = ELEMENT_COLORS[elKey] ?? ELEMENT_COLORS.metal;
  const effectiveChar =
    characterType ?? getCharacterTypeFromElement(dominantElement) ?? "namuri";

  const romanceType: RomanceType = classifyRomanceType({
    dominantElement,
    personalityTraits,
    romanceKeyPoints,
    romanceStyle,
  });

  const tags =
    (charmKeywords?.length ? charmKeywords : personalityTraits)?.slice(0, 3) ??
    [];

  const animalLabel = animalTypeKorean
    ? [animalModifier, animalTypeKorean].filter(Boolean).join(" ") + "상"
    : null;

  // 설명 — 전문 노출
  const descText = romanceStyle
    ? romanceStyle.replace(/\n/g, " ")
    : null;

  // 찰떡궁합
  const idealLabel =
    idealMatchAnimalKorean
      ? `${idealMatchAnimalKorean}상`
      : idealMatchSaju?.traits?.slice(0, 2).join(", ") ?? null;

  useEffect(() => {
    trackViewShareTeaser();
  }, []);

  return (
    <MobileContainer className="h-dvh max-h-dvh flex flex-col overflow-hidden">
      {/* 메인 캔버스 */}
      <div
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${colors.pastel} 0%, ${colors.pastel}60 35%, #F7F3EE 70%)`,
        }}
      >
        {/* 상단 콘텐츠 영역 — 캐릭터 위, 유형 라벨 중단 */}
        <div className="flex-1 min-h-0 flex flex-col items-center px-5 overflow-y-auto">
          {/* 캐릭터를 위로, 유형 라벨을 중단에 배치하기 위한 상단 여백 */}
          <div className="shrink-0 h-8" />
          {/* 캐릭터 */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="w-[88px] h-[88px] rounded-full border-[3px] overflow-hidden flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, white 30%, ${colors.pastel} 100%)`,
                  borderColor: `${colors.main}4D`,
                }}
              >
                <Image
                  src={`/images/characters/${effectiveChar}/default.png`}
                  alt=""
                  width={60}
                  height={60}
                  className="object-contain"
                  unoptimized
                />
              </div>
              {animalTypeKorean && (
                <div
                  className="absolute -right-1 -bottom-0.5 px-2 py-1 rounded-full bg-white/90 border-[1.5px] shadow-sm"
                  style={{ borderColor: `${colors.main}4D` }}
                >
                  <span className="text-ink text-[10px] font-bold">
                    {animalTypeKorean}상
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/60 text-ink">
                {profileName}
              </span>
              {animalLabel && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/60 text-ink">
                  {animalLabel}
                </span>
              )}
            </div>
          </div>

          {/* 유형 라벨 — 스크린 중단에 위치 */}
          <div className="mt-auto flex flex-col items-center text-center">
            <p
              className="text-ink-muted text-[13px] font-medium"
              style={{ letterSpacing: "-0.01em" }}
            >
              {profileName}님은 연애할 때
            </p>
            <h1
              className="mt-2 text-[30px] font-bold text-ink"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.25 }}
            >
              {romanceType.emoji} {romanceType.label}
            </h1>
            <p
              className="mt-1.5 text-[14px] font-medium text-ink-secondary"
              style={{ letterSpacing: "-0.01em" }}
            >
              {romanceType.subtitle}
            </p>
          </div>

          {/* 키워드 칩 */}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-ink bg-white/70 border"
                  style={{ borderColor: `${colors.main}33`, letterSpacing: "-0.01em" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 연애 스타일 설명 — 전문 노출 */}
          {descText && (
            <p
              className="mt-5 text-[14px] text-ink leading-[1.65] text-center px-2"
              style={{ letterSpacing: "-0.01em" }}
            >
              {descText}
            </p>
          )}
          {/* 하단 여백으로 유형 라벨 영역을 중단에 위치시킴 */}
          <div className="mt-auto shrink-0 h-4" />
        </div>

        {/* 하단 카드 영역 */}
        <div className="shrink-0 px-5 pb-4 space-y-2.5">
          {/* 잘 맞는 이상형의 사주 */}
          {idealMatchSaju?.traits && idealMatchSaju.traits.length > 0 && (
            <div
              className="w-full rounded-2xl p-4"
              style={{ backgroundColor: `${colors.main}0A`, border: `1px solid ${colors.main}1F` }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: colors.main }}>♥</span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: colors.main, letterSpacing: "-0.01em" }}
                >
                  잘 맞는 이상형의 사주
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {idealMatchSaju.traits.map((t, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full text-[12px] font-medium border text-ink"
                    style={{
                      borderColor: `${colors.main}4D`,
                      backgroundColor: `${colors.main}0F`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 찰떡궁합 */}
          {idealLabel && (
            <div
              className="w-full rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: `${colors.main}14` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[15px]">💕</span>
                <span
                  className="text-[13px] font-bold text-ink"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  찰떡궁합
                </span>
              </div>
              <span
                className="text-[14px] font-bold text-ink"
                style={{ letterSpacing: "-0.01em" }}
              >
                {idealLabel}
              </span>
            </div>
          )}

          {/* 결과 보기 — 나도 분석 받으러 가기 (detail 페이지 대신 랜딩으로 유도) */}
          <Link
            href="/"
            className="block w-full"
            onClick={trackClickDetailInTeaser}
          >
            <div
              className="rounded-2xl border px-4 py-3 flex items-center justify-between bg-white/50 active:bg-white/80 transition-colors"
              style={{ borderColor: `${colors.main}22` }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-hanji-secondary flex items-center justify-center">
                  <span className="text-sm">🔮</span>
                </div>
                <div>
                  <p
                    className="text-[13px] font-bold text-ink"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    나도 사주·관상 분석 받아보기
                  </p>
                  <p className="text-[11px] text-ink-tertiary mt-0.5">
                    사주팔자, 오행, 성격, 이상형까지
                  </p>
                </div>
              </div>
              <span className="text-ink-tertiary">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* CTA 하단 고정 */}
      <CtaBar className="shrink-0">
        <Link
          href="/"
          className="block w-full"
          onClick={trackClickCtaInTeaser}
        >
          <Button size="lg" className="w-full">
            🔮 나도 사주·관상 보러가기
          </Button>
        </Link>
      </CtaBar>
    </MobileContainer>
  );
}

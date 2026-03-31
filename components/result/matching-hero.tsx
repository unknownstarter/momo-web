"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { decode } from "blurhash";
import {
  ELEMENT_COLORS,
  ELEMENT_KOREAN,
  elementKey,
  getCharacterTypeFromElement,
} from "@/lib/result-tokens";

interface MatchingHeroProps {
  nickname: string;
  profileImage: string | null;
  characterType: string | null;
  dominantElement: string | null;
  romanceTypeLabel: string | null;
  idealMatchDescription: string | null;
  idealMatchElement: string | null;
  animalTypeKorean: string | null;
  animalModifier: string | null;
  blurHashes: string[];
}

function BlurHashAvatar({ hash, size = 76 }: { hash: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !hash) return;
    try {
      const pixels = decode(hash, size, size);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(size, size);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch { /* invalid hash */ }
  }, [hash, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full object-cover"
    />
  );
}

export function MatchingHero({
  nickname,
  profileImage,
  characterType,
  dominantElement,
  romanceTypeLabel,
  idealMatchDescription,
  idealMatchElement,
  animalTypeKorean,
  animalModifier,
  blurHashes,
}: MatchingHeroProps) {
  const userElKey = elementKey(dominantElement);
  const userColors = ELEMENT_COLORS[userElKey];
  const userChar = characterType ?? getCharacterTypeFromElement(dominantElement) ?? "namuri";

  const idealElKey = elementKey(idealMatchElement);
  const idealColors = ELEMENT_COLORS[idealElKey];

  const animalLabel = animalTypeKorean
    ? [animalModifier, animalTypeKorean].filter(Boolean).join(" ") + "상"
    : null;

  const hasBlurHashes = blurHashes.length > 0;

  return (
    <section className="relative overflow-hidden px-5 pt-8 pb-6">
      <div
        className="absolute -top-16 -left-12 w-[160px] h-[160px] rounded-full pointer-events-none"
        style={{
          backgroundColor: userColors.pastel,
          filter: "blur(50px)",
          opacity: 0.12,
        }}
      />

      <div className="relative">
        <p className="text-[11px] font-medium tracking-[0.2px] text-ink-tertiary text-center">
          사주 &amp; 관상 분석 결과
        </p>

        <h1 className="mt-3 text-center">
          <span className="block text-[28px] font-bold leading-[1.25] tracking-[-0.6px] text-ink">
            {nickname}님의
          </span>
          <span
            className="block text-[28px] font-bold leading-[1.25] tracking-[-0.6px]"
            style={{ color: userColors.main }}
          >
            이상형을 찾았어요!
          </span>
        </h1>

        {romanceTypeLabel && (
          <p className="mt-2 text-[14px] text-ink-muted text-center leading-relaxed">
            {romanceTypeLabel}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          {/* 유저 아바타 */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-[76px] h-[76px] rounded-full border-2 overflow-hidden flex items-center justify-center shadow-low"
              style={{
                backgroundColor: profileImage ? undefined : userColors.pastel,
                borderColor: `${userColors.main}4D`,
              }}
            >
              {profileImage ? (
                <Image src={profileImage} alt="" width={76} height={76} className="object-cover w-full h-full" unoptimized />
              ) : (
                <Image src={`/images/characters/${userChar}/default.png`} alt="" width={48} height={48} className="object-contain" unoptimized />
              )}
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: `${userColors.main}1F`, color: userColors.main }}
            >
              본성 {ELEMENT_KOREAN[userElKey]}
            </span>
          </div>

          {/* 연결 장식 */}
          <div className="flex items-center gap-1 -mt-6">
            <div className="w-5 border-t border-dashed border-ink-tertiary/40" />
            <span className="text-[#F2D0D5] text-sm">&#9829;</span>
            <div className="w-5 border-t border-dashed border-ink-tertiary/40" />
          </div>

          {/* 이상형: 블러해시 사진들 + 오행 라벨 */}
          <div className="flex flex-col items-center gap-2">
            {hasBlurHashes ? (
              <div className="flex -space-x-4">
                {blurHashes.slice(0, 3).map((hash, i) => (
                  <div
                    key={i}
                    className="w-[56px] h-[56px] rounded-full border-2 border-hanji overflow-hidden shadow-low"
                    style={{ zIndex: 3 - i }}
                  >
                    <BlurHashAvatar hash={hash} size={56} />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="w-[76px] h-[76px] rounded-full border-2 overflow-hidden flex items-center justify-center shadow-low"
                style={{
                  backgroundColor: idealColors.pastel,
                  borderColor: `${idealColors.main}4D`,
                }}
              >
                <Image src={`/images/characters/${getCharacterTypeFromElement(idealMatchElement)}/default.png`} alt="" width={48} height={48} className="object-contain" unoptimized />
              </div>
            )}
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: `${idealColors.main}1F`, color: idealColors.main }}
            >
              잘 맞는 궁합 {ELEMENT_KOREAN[idealElKey]}
            </span>
          </div>
        </div>

        {idealMatchDescription && (
          <div className="mt-5 mx-auto max-w-[320px] px-4 py-3 rounded-2xl bg-hanji-elevated border border-hanji-border shadow-low text-center">
            <p className="text-[13px] text-ink leading-relaxed">
              {idealMatchDescription.slice(0, 80)}
              {idealMatchDescription.length > 80 ? "..." : ""}
            </p>
          </div>
        )}

        {animalLabel && (
          <div className="mt-3 flex justify-center">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-brand/15 text-ink">
              {animalLabel}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

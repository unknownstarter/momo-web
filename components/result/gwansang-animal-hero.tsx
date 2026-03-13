"use client";

import { MYSTIC_GLOW } from "@/lib/result-tokens";

export function GwansangAnimalHero({
  animalTypeKorean,
  animalLabel,
}: {
  animalTypeKorean: string;
  animalLabel: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${MYSTIC_GLOW}1A 0%, ${MYSTIC_GLOW}05 100%)`,
        }}
      >
        <span className="text-xl font-bold text-ink">{animalTypeKorean}상</span>
      </div>
      <p className="mt-3 text-xl font-bold text-ink">{animalLabel}</p>
    </div>
  );
}

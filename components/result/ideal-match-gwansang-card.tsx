"use client";

import { SajuCard } from "./saju-card";
import { MYSTIC_GLOW } from "@/lib/result-tokens";

export function IdealMatchGwansangCard({
  idealMatchAnimalKorean,
  idealMatchTraits,
  idealMatchDescription,
}: {
  idealMatchAnimalKorean: string | null;
  idealMatchTraits: string[] | null;
  idealMatchDescription: string | null;
}) {
  if (!idealMatchDescription) return null;

  return (
    <SajuCard variant="elevated" borderColor={`${MYSTIC_GLOW}40`}>
      <div className="flex items-center gap-2">
        <span style={{ color: MYSTIC_GLOW }}>♥</span>
        <span className="text-sm font-semibold" style={{ color: MYSTIC_GLOW }}>잘 맞는 이상형의 관상</span>
      </div>
      {idealMatchAnimalKorean && (
        <div className="mt-3">
          <span
            className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold border"
            style={{ borderColor: `${MYSTIC_GLOW}4D`, backgroundColor: `${MYSTIC_GLOW}14`, color: MYSTIC_GLOW }}
          >
            {idealMatchAnimalKorean}상
          </span>
        </div>
      )}
      {idealMatchTraits?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {idealMatchTraits.map((t, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-ink border border-brand/20"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-sm text-ink leading-relaxed">{idealMatchDescription}</p>
    </SajuCard>
  );
}

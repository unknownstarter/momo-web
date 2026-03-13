"use client";

import { SajuCard } from "./saju-card";
import { ELEMENT_COLORS, elementKey } from "@/lib/result-tokens";

type IdealMatch = { description?: string; traits?: string[] } | null;

export function IdealMatchSajuCard({
  idealMatch,
  dominantElement,
}: {
  idealMatch: IdealMatch;
  dominantElement?: string | null;
}) {
  if (!idealMatch?.description) return null;
  const key = elementKey(dominantElement);
  const accent = ELEMENT_COLORS[key]?.main ?? ELEMENT_COLORS.metal.main;
  const traits = idealMatch.traits ?? [];

  return (
    <SajuCard variant="elevated" borderColor={`${accent}40`}>
      <div className="flex items-center gap-2">
        <span style={{ color: accent }}>♥</span>
        <span className="text-sm font-semibold" style={{ color: accent }}>잘 맞는 이상형의 사주</span>
      </div>
      {traits.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {traits.map((t, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ borderColor: `${accent}4D`, backgroundColor: `${accent}0F`, color: accent }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm text-ink leading-relaxed">{idealMatch.description}</p>
    </SajuCard>
  );
}

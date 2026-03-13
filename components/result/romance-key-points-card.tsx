"use client";

import { SajuCard } from "./saju-card";
import { ROMANCE_COLOR } from "@/lib/result-tokens";

export function RomanceKeyPointsCard({ points }: { points: string[] }) {
  if (!points?.length) return null;
  return (
    <SajuCard variant="elevated" borderColor={`${ROMANCE_COLOR}26`}>
      <div className="flex items-center gap-2">
        <span style={{ color: ROMANCE_COLOR }}>♥</span>
        <span className="text-sm font-semibold" style={{ color: ROMANCE_COLOR }}>연애 핵심 포인트</span>
      </div>
      <ul className="mt-3 space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span style={{ color: ROMANCE_COLOR }}>•</span>
            <span className="text-sm text-ink leading-relaxed flex-1">{p}</span>
          </li>
        ))}
      </ul>
    </SajuCard>
  );
}

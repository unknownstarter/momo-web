"use client";

import { SajuCard } from "./saju-card";
import { ROMANCE_COLOR } from "@/lib/result-tokens";

export function RomanceStyleCard({ style }: { style: string }) {
  return (
    <SajuCard variant="elevated" borderColor={`${ROMANCE_COLOR}26`}>
      <div className="flex items-center gap-2">
        <span style={{ color: ROMANCE_COLOR }}>♥</span>
        <span className="text-sm font-semibold" style={{ color: ROMANCE_COLOR }}>연애 스타일</span>
      </div>
      <p className="mt-3 text-sm text-ink leading-relaxed">{style}</p>
    </SajuCard>
  );
}

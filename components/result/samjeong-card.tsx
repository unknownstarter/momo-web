"use client";

import { SajuCard } from "./saju-card";
import { MYSTIC_GLOW } from "@/lib/result-tokens";

type Samjeong = { upper?: string; middle?: string; lower?: string };

const ZONES: { key: keyof Samjeong; label: string }[] = [
  { key: "upper", label: "초년운" },
  { key: "middle", label: "중년운" },
  { key: "lower", label: "말년운" },
];

export function SamjeongCard({ samjeong }: { samjeong: Samjeong | null }) {
  if (!samjeong) return null;
  const hasAny = samjeong.upper || samjeong.middle || samjeong.lower;
  if (!hasAny) return null;

  return (
    <SajuCard variant="flat">
      <p className="text-sm font-semibold text-ink">삼정(三停) 운세</p>
      <div className="mt-3 space-y-3">
        {ZONES.map(({ key, label }) => {
          const reading = samjeong[key];
          if (!reading) return null;
          return (
            <div key={key} className="flex gap-2 items-start">
              <span
                className="shrink-0 px-2 py-0.5 rounded text-xs font-semibold"
                style={{ backgroundColor: `${MYSTIC_GLOW}1A`, color: MYSTIC_GLOW }}
              >
                {label}
              </span>
              <p className="text-sm text-ink leading-relaxed flex-1">{reading}</p>
            </div>
          );
        })}
      </div>
    </SajuCard>
  );
}

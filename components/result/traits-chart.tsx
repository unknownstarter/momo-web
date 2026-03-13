"use client";

import { SajuCard } from "./saju-card";
import { MYSTIC_GLOW } from "@/lib/result-tokens";

const TRAIT_LABELS: Record<string, string> = {
  leadership: "리더십",
  warmth: "온화함",
  independence: "독립성",
  sensitivity: "감성",
  energy: "에너지",
};

export function TraitsChart({ traits }: { traits: Record<string, number> | null }) {
  if (!traits || !Object.keys(traits).length) return null;

  const entries = Object.entries(traits)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => ({ key: k, label: TRAIT_LABELS[k] ?? k, value: Number(v) }));

  return (
    <SajuCard variant="flat">
      <p className="text-sm font-semibold text-ink">성격 특성 5축</p>
      <div className="mt-3 space-y-3">
        {entries.map(({ key, label, value }) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-ink-tertiary">{label}</span>
              <span className="text-xs font-semibold" style={{ color: MYSTIC_GLOW }}>{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white border border-hanji-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${value}%`, backgroundColor: `${MYSTIC_GLOW}B3` }}
              />
            </div>
          </div>
        ))}
      </div>
    </SajuCard>
  );
}

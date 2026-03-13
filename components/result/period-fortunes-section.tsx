"use client";

import { useState } from "react";
import { SajuCard } from "./saju-card";
import { ELEMENT_COLORS, elementKey } from "@/lib/result-tokens";

const PERIOD_LABELS = ["초년 (1~30)", "중년 (31~50)", "말년 (51~)"];
const FORTUNE_LABELS = ["연애운", "사업운", "직장운", "건강운", "금전운"] as const;
const FORTUNE_KEYS = ["romance", "business", "career", "health", "wealth"] as const;
const FORTUNE_COLORS = ["#E91E63", "#1976D2", "#388E3C", "#E65100", "#C2185B"];

type PeriodData = Partial<Record<(typeof FORTUNE_KEYS)[number], string>>;
type PeriodFortunes = {
  earlyYears?: PeriodData;
  middleYears?: PeriodData;
  laterYears?: PeriodData;
};

export function PeriodFortunesSection({
  fortunes,
  dominantElement,
}: {
  fortunes: PeriodFortunes | null;
  dominantElement?: string | null;
}) {
  const [selected, setSelected] = useState(0);
  const key = elementKey(dominantElement);
  const accent = ELEMENT_COLORS[key]?.main ?? ELEMENT_COLORS.metal.main;

  const periodData = selected === 0 ? fortunes?.earlyYears : selected === 1 ? fortunes?.middleYears : fortunes?.laterYears;
  const texts = FORTUNE_KEYS.map((k) => periodData?.[k] ?? "");

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {PERIOD_LABELS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i)}
            className={`flex-1 py-2 rounded-full text-xs font-medium transition-colors ${
              selected === i ? "text-white" : "text-ink-tertiary bg-black/5"
            }`}
            style={selected === i ? { backgroundColor: accent } : undefined}
          >
            {label}
          </button>
        ))}
      </div>
      <SajuCard variant="flat">
        <div className="space-y-3">
          {FORTUNE_KEYS.map((fk, i) => {
            const text = texts[i];
            if (!text) return null;
            return (
              <div key={fk} className="flex gap-2 items-start">
                <span
                  className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold"
                  style={{ color: FORTUNE_COLORS[i], backgroundColor: `${FORTUNE_COLORS[i]}14` }}
                >
                  {FORTUNE_LABELS[i]}
                </span>
                <p className="text-sm text-ink leading-relaxed flex-1">{text}</p>
              </div>
            );
          })}
        </div>
      </SajuCard>
    </div>
  );
}

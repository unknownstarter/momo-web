"use client";

import { FORTUNE_WARM, FORTUNE_GOOD, FORTUNE_CAUTION } from "@/lib/result-tokens";

type YearlyFortune = {
  year?: number;
  yearPillar?: string;
  summary?: string;
  goodMonths?: number[];
  cautionMonths?: number[];
};

export function YearlyFortuneCard({ fortune }: { fortune: YearlyFortune }) {
  return (
    <div className="rounded-card p-4 bg-hanji-elevated border border-hanji-border shadow-medium">
      <div className="flex items-center gap-2">
        <span className="text-orange-600">📅</span>
        <span className="text-sm font-semibold" style={{ color: FORTUNE_WARM }}>
          {fortune.yearPillar ?? fortune.year ?? ""}년
        </span>
      </div>
      <p className="mt-3 text-sm text-ink leading-relaxed">{fortune.summary}</p>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-lg p-3 border" style={{ borderColor: `${FORTUNE_GOOD}33`, backgroundColor: `${FORTUNE_GOOD}0F` }}>
          <p className="text-xs text-ink-tertiary">좋은 달</p>
          <p className="text-sm font-semibold text-green-700">
            {fortune.goodMonths?.length ? fortune.goodMonths.map((m) => `${m}월`).join(", ") : "-"}
          </p>
        </div>
        <div className="flex-1 rounded-lg p-3 border" style={{ borderColor: `${FORTUNE_CAUTION}33`, backgroundColor: `${FORTUNE_CAUTION}0F` }}>
          <p className="text-xs text-ink-tertiary">주의할 달</p>
          <p className="text-sm font-semibold text-red-700">
            {fortune.cautionMonths?.length ? fortune.cautionMonths.map((m) => `${m}월`).join(", ") : "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

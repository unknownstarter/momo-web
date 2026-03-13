"use client";

import { ELEMENT_COLORS, ELEMENT_KOREAN, ELEMENT_HANJA } from "@/lib/result-tokens";

const ELEMENT_ORDER: (keyof typeof ELEMENT_COLORS)[] = ["wood", "fire", "earth", "metal", "water"];

export function FiveElementsChart({ fiveElements }: { fiveElements: Record<string, number> }) {
  const entries = ELEMENT_ORDER.map((key) => ({
    key,
    count: Number(fiveElements[key]) || 0,
    ...ELEMENT_COLORS[key],
    label: `${ELEMENT_KOREAN[key]}(${ELEMENT_HANJA[key]})`,
  }));
  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className="space-y-2">
      {entries.map(({ key, count, main, pastel, label }) => {
        const ratio = maxCount > 0 ? count / maxCount : 0;
        return (
          <div key={key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 w-14">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: main }}
              />
              <span className="text-xs font-medium text-ink">{label}</span>
            </div>
            <div className="flex-1 h-5 rounded-full overflow-hidden bg-white border border-hanji-border">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${ratio * 100}%`,
                  backgroundColor: `${main}B3`,
                }}
              />
            </div>
            <span className="text-xs font-semibold w-6 text-right" style={{ color: main }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { SajuCard } from "./saju-card";
import { MYSTIC_GLOW } from "@/lib/result-tokens";

const OGWAN_LABELS: Record<string, string> = {
  eyes: "눈", nose: "코", mouth: "입", ears: "귀", eyebrows: "눈썹",
};

export function OgwanCard({ ogwan }: { ogwan: Record<string, string> | null }) {
  if (!ogwan || !Object.keys(ogwan).length) return null;

  return (
    <SajuCard variant="flat">
      <p className="text-sm font-semibold text-ink">오관(五官) 해석</p>
      <div className="mt-3 space-y-3">
        {Object.entries(ogwan).map(([k, v]) =>
          v ? (
            <div key={k}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: MYSTIC_GLOW }}>
                {OGWAN_LABELS[k] ?? k}
              </p>
              <p className="text-sm text-ink leading-relaxed">{v}</p>
            </div>
          ) : null
        )}
      </div>
    </SajuCard>
  );
}

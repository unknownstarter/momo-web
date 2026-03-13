"use client";

import { getStemHanja, getBranchHanja, ELEMENT_COLORS, ELEMENT_KOREAN, ELEMENT_HANJA } from "@/lib/result-tokens";

type PillarData = { stem?: string; branch?: string; heavenlyStem?: string; earthlyBranch?: string } | null;

function normalizePillar(p: PillarData): { stem?: string; branch?: string } | null {
  if (!p) return null;
  const stem = p.stem ?? p.heavenlyStem;
  const branch = p.branch ?? p.earthlyBranch;
  return stem != null || branch != null ? { stem, branch } : null;
}

function getElementFromStem(stem: string | undefined): keyof typeof ELEMENT_COLORS {
  // 간단 매핑: 갑을→목, 병정→화, 무기→토, 경신→금, 임계→수
  const map: Record<string, keyof typeof ELEMENT_COLORS> = {
    갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth", 기: "earth",
    경: "metal", 신: "metal", 임: "water", 계: "water",
  };
  return (stem && map[stem]) ?? "metal";
}

export function PillarCard({
  pillar,
  label,
  sublabel,
  isMissing = false,
}: {
  pillar: PillarData;
  label: string;
  sublabel: string;
  isMissing?: boolean;
}) {
  const normalized = normalizePillar(pillar);
  const hasPillar = normalized && !isMissing;
  const stem = normalized?.stem;
  const branch = normalized?.branch;
  const key = getElementFromStem(stem);
  const colors = ELEMENT_COLORS[key];
  const main = colors?.main ?? ELEMENT_COLORS.metal.main;
  const pastel = colors?.pastel ?? ELEMENT_COLORS.metal.pastel;

  return (
    <div
      className="rounded-xl border px-2 py-4 flex flex-col items-center min-h-[120px]"
      style={{
        backgroundColor: `${pastel}66`,
        borderColor: `${main}33`,
      }}
    >
      <span className="text-xs font-semibold" style={{ color: main }}>{label}</span>
      <span className="text-[9px]" style={{ color: `${main}99` }}>{sublabel}</span>
      <div className="h-2" />
      <span
        className="text-[28px] font-bold leading-tight"
        style={{ color: hasPillar ? "var(--ink)" : `${main}4D` }}
      >
        {hasPillar ? getStemHanja(stem) : "?"}
      </span>
      <span
        className="text-[22px] font-semibold leading-tight"
        style={{ color: hasPillar ? "var(--ink-muted)" : `${main}33` }}
      >
        {hasPillar ? getBranchHanja(branch) : "?"}
      </span>
      <div className="h-1" />
      <span className="text-xs font-medium text-ink-tertiary">
        {hasPillar ? `${stem}${branch}` : "모름"}
      </span>
      <div className="h-2" />
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${main}1A`, color: main }}
      >
        {hasPillar ? `${ELEMENT_KOREAN[key]}(${ELEMENT_HANJA[key]})` : "미상"}
      </span>
    </div>
  );
}
